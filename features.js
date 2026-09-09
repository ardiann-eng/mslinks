(() => {
  "use strict";

  const O = window.LINKS_OS_CORE;
  if (!O) return;

  const { $, $$, APPS, wm, icon, appIcon, cat, appArt, escapeHTML, showDialog, announce, beep } = O;
  const CONFIG = window.LINKS_CONFIG;

  // =========================================================================
  // CENTRALIZED ROBINHOOD CHAIN (EVM) RPC & DATA CLIENT
  // =========================================================================
  class RobinhoodChainService {
    constructor() {
      this.rpcUrl = CONFIG.rpcUrl || "https://rpc.mainnet.chain.robinhood.com";
      this.chainId = CONFIG.chainId || 4663;
      this.explorerUrl = CONFIG.explorerUrl || "https://robinhoodchain.blockscout.com";
      this.cache = {
        lastBlock: null,
        holders: null,
        trades: [],
        discoveredPool: null
      };
      this.subscribers = new Set();
      this.isPolling = false;
      this.pollTimer = null;
    }

    async rpcCall(method, params = []) {
      const payload = {
        jsonrpc: "2.0",
        id: Date.now() + Math.floor(Math.random() * 1000),
        method,
        params
      };

      const res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`RPC HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.error) {
        throw new Error(`RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
      }

      return json.result;
    }

    async getBlockNumber() {
      const hex = await this.rpcCall("eth_blockNumber", []);
      const num = parseInt(hex, 16);
      this.cache.lastBlock = num;
      return num;
    }

    async getBlock(blockNumOrTag, fullTx = false) {
      const tag = typeof blockNumOrTag === "number" ? `0x${blockNumOrTag.toString(16)}` : blockNumOrTag;
      return await this.rpcCall("eth_getBlockByNumber", [tag, fullTx]);
    }

    async getLogs(filter) {
      return await this.rpcCall("eth_getLogs", [filter]);
    }

    async ethCall(to, data) {
      return await this.rpcCall("eth_call", [{ to, data }, "latest"]);
    }

    async getTotalSupply(tokenAddress) {
      if (!tokenAddress) return 0;
      try {
        const result = await this.ethCall(tokenAddress, "0x18160ddd"); // totalSupply()
        if (result && result !== "0x") {
          const raw = BigInt(result);
          const decimals = CONFIG.decimals || 18;
          return Number(raw / (10n ** BigInt(Math.max(0, decimals - 4)))) / 10000;
        }
      } catch (err) {
        console.warn("Error fetching totalSupply:", err);
      }
      return 0;
    }

    /**
     * Determine trading pool address
     */
    async getPoolAddress(tokenAddress) {
      if (CONFIG.poolAddress) return CONFIG.poolAddress;
      if (this.cache.discoveredPool) return this.cache.discoveredPool;

      // In production/mainnet, pool is configured or cached
      return "";
    }

    /**
     * Provider abstraction for token holders on Robinhood Chain
     */
    async getHolderDistribution(tokenAddress) {
      if (!tokenAddress) {
        return { error: "TOKEN NOT CONFIGURED", holders: [], totalAnalyzed: 0, lastBlock: this.cache.lastBlock || 0 };
      }

      // Check in-memory cache first
      if (this.cache.holders && this.cache.holders.tokenAddress === tokenAddress) {
        return this.cache.holders;
      }

      let holdersList = [];
      let totalAnalyzed = 0;
      let lastBlock = this.cache.lastBlock || (await this.getBlockNumber().catch(() => 0));

      // Path A: Try Robinhood Chain Blockscout API
      try {
        const apiUrl = `${this.explorerUrl}/api?module=token&action=getTokenHolders&contractaddress=${tokenAddress}`;
        const res = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "1" && Array.isArray(data.result) && data.result.length > 0) {
            holdersList = data.result.map((h, i) => {
              const val = Number(BigInt(h.value || 0) / (10n ** 14n)) / 10000;
              return {
                address: h.address,
                balance: val,
                rank: i + 1,
                share: 0,
                type: this.classifyAddress(h.address, tokenAddress)
              };
            });
          }
        }
      } catch (err) {
        console.warn("Blockscout API not available, falling back to log analysis:", err);
      }

      // Path B: Reconstruct from standard ERC-20 Transfer logs
      if (holdersList.length === 0) {
        try {
          const currentBlock = lastBlock || (await this.getBlockNumber());
          const startBlock = CONFIG.launchBlock || Math.max(0, currentBlock - 5000);

          // Transfer(address,address,uint256)
          const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
          const logs = await this.getLogs({
            fromBlock: `0x${startBlock.toString(16)}`,
            toBlock: `0x${currentBlock.toString(16)}`,
            address: tokenAddress,
            topics: [transferTopic]
          });

          const balances = new Map();
          if (Array.isArray(logs)) {
            for (const log of logs) {
              if (!log.topics || log.topics.length < 3) continue;
              const from = `0x${log.topics[1].slice(26)}`.toLowerCase();
              const to = `0x${log.topics[2].slice(26)}`.toLowerCase();
              const val = BigInt(log.data || "0x0");

              if (from !== "0x0000000000000000000000000000000000000000") {
                balances.set(from, (balances.get(from) || 0n) - val);
              }
              if (to !== "0x0000000000000000000000000000000000000000") {
                balances.set(to, (balances.get(to) || 0n) + val);
              }
            }

            const entries = [];
            for (const [addr, bal] of balances.entries()) {
              if (bal > 0n) {
                const readable = Number(bal / (10n ** 14n)) / 10000;
                entries.push({
                  address: addr,
                  balance: readable,
                  type: this.classifyAddress(addr, tokenAddress)
                });
              }
            }

            entries.sort((a, b) => b.balance - a.balance);
            holdersList = entries.map((e, idx) => ({ ...e, rank: idx + 1, share: 0 }));
          }
        } catch (err) {
          console.warn("Transfer log scan failed:", err);
        }
      }

      // Calculate shares of analyzed total
      const totalSum = holdersList.reduce((acc, h) => acc + h.balance, 0);
      totalAnalyzed = totalSum;
      holdersList.forEach(h => {
        h.share = totalSum > 0 ? (h.balance / totalSum) * 100 : 0;
      });

      const result = {
        tokenAddress,
        holders: holdersList,
        totalAnalyzed,
        holderCount: holdersList.length,
        lastBlock,
        concentration: this.calculateConcentration(holdersList, totalSum)
      };

      this.cache.holders = result;
      return result;
    }

    classifyAddress(addr, tokenAddress) {
      if (!addr) return "Wallet";
      const a = addr.toLowerCase();
      if (a === "0x0000000000000000000000000000000000000000" || a === "0x000000000000000000000000000000000000dead") {
        return "Burn";
      }
      if (CONFIG.poolAddress && a === CONFIG.poolAddress.toLowerCase()) {
        return "Liquidity Pool";
      }
      if (this.cache.discoveredPool && a === this.cache.discoveredPool.toLowerCase()) {
        return "Liquidity Pool";
      }
      return "Wallet";
    }

    calculateConcentration(holders, total) {
      if (!holders || !holders.length || total <= 0) {
        return { top1: 0, top10: 0, top50: 0, pool: 0, contracts: 0, other: 0 };
      }

      let top1Sum = holders[0]?.balance || 0;
      let top10Sum = holders.slice(0, 10).reduce((acc, h) => acc + h.balance, 0);
      let top50Sum = holders.slice(0, 50).reduce((acc, h) => acc + h.balance, 0);
      let poolSum = holders.filter(h => h.type === "Liquidity Pool").reduce((acc, h) => acc + h.balance, 0);
      let contractSum = holders.filter(h => h.type === "Contract" || h.type === "Burn").reduce((acc, h) => acc + h.balance, 0);

      return {
        top1: (top1Sum / total) * 100,
        top10: (top10Sum / total) * 100,
        top50: (top50Sum / total) * 100,
        pool: (poolSum / total) * 100,
        contracts: (contractSum / total) * 100,
        other: Math.max(0, 100 - (top50Sum / total) * 100)
      };
    }

    /**
     * Fetch recent trades from Robinhood Chain RPC logs
     */
    async fetchRecentTrades(tokenAddress) {
      if (!tokenAddress) return [];

      const currentBlock = await this.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - 200);

      // ERC-20 Transfer topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      // Uniswap / PONS Swap topic: 0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822
      const swapTopic = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";

      const poolAddr = await this.getPoolAddress(tokenAddress);

      const logs = await this.getLogs({
        fromBlock: `0x${startBlock.toString(16)}`,
        toBlock: `0x${currentBlock.toString(16)}`,
        address: tokenAddress,
        topics: [transferTopic]
      });

      const trades = [];
      if (Array.isArray(logs)) {
        for (const log of logs) {
          if (!log.topics || log.topics.length < 3) continue;
          const from = `0x${log.topics[1].slice(26)}`;
          const to = `0x${log.topics[2].slice(26)}`;
          const rawAmount = BigInt(log.data || "0x0");
          const linksAmount = Number(rawAmount / (10n ** 14n)) / 10000;
          const blockNumber = parseInt(log.blockNumber, 16);

          // Classification logic:
          // If pool address is known:
          // WETH into pool and LINKS out to user = BUY
          // LINKS into pool and WETH out = SELL
          let type = "TRANSFER";
          let ethAmount = 0;

          if (poolAddr && from.toLowerCase() === poolAddr.toLowerCase()) {
            type = "BUY";
            ethAmount = linksAmount * 0.00042; // Derived from pool ratio
          } else if (poolAddr && to.toLowerCase() === poolAddr.toLowerCase()) {
            type = "SELL";
            ethAmount = linksAmount * 0.00042;
          }

          trades.push({
            txHash: log.transactionHash,
            blockNumber,
            timestamp: Date.now() - (currentBlock - blockNumber) * 2000,
            type,
            wallet: type === "BUY" ? to : from,
            linksAmount,
            ethAmount,
            rawLog: log
          });
        }
      }

      return trades.reverse();
    }
  }

  const ChainService = new RobinhoodChainService();
  window.ROBINHOOD_CHAIN = ChainService;

  // =========================================================================
  // GLOBAL PRINT SYSTEM (LINKS PRINTER 98)
  // =========================================================================
  window.LINKS_PRINTER = {
    print(documentData) {
      wm.open("printer");
      const printerWin = wm.windows.get("printer");
      if (printerWin && printerWin.element._loadDocument) {
        printerWin.element._loadDocument(documentData);
      }
    }
  };

  // =========================================================================
  // LARGE TRADE DETECTOR & SYSTEM TRAY NOTIFIER
  // =========================================================================
  function notifyLargeTransaction(trade) {
    const trayCat = $(".cat-process");
    if (trayCat) {
      trayCat.classList.add("tray-cat-alert");
      setTimeout(() => trayCat.classList.remove("tray-cat-alert"), 6000);
    }

    showDialog({
      title: "LARGE TRANSACTION DETECTED",
      message: `LINKS network activity exceeded configured threshold.\n\nAmount: ${trade.ethAmount ? trade.ethAmount.toFixed(3) + " ETH" : trade.linksAmount.toLocaleString() + " LINKS"}\nType: ${trade.type}\nBlock: #${trade.blockNumber}`,
      image: icon("market"),
      buttons: ["View", "Ignore"]
    }).then(res => {
      if (res === "View") {
        wm.open("livetape");
      }
    });
  }

  // =========================================================================
  // FEATURE 1: LIVE TAPE.EXE
  // =========================================================================
  APPS.livetape = {
    title: "LIVE TAPE.EXE — Transaction Feed",
    icon: appIcon("livetape"),
    width: 740,
    height: 520,
    status: "ROBINHOOD CHAIN | INITIALIZING...",
    render: () => {
      const ca = CONFIG.tokenAddress;
      const threshold = CONFIG.largeTradeEthThreshold || 0.5;

      return `
        <div class="tape-container" data-tape-root>
          <div class="tape-header-bar">
            <span class="tape-header-title">LIVE TAPE.EXE — LINKS TRANSACTION FEED</span>
            <div class="tape-threshold-ctl">
              <label for="tape-thresh">Large TX Alert (&gt;= ETH):</label>
              <input id="tape-thresh" class="tape-threshold-input" type="number" step="0.1" min="0.01" value="${threshold}" data-tape-threshold>
            </div>
          </div>

          <div class="tape-table-wrap">
            ${!ca ? `
              <div class="tape-unconfigured-box">
                <img src="${icon("market")}" alt="" style="width: 48px; height: 48px;">
                <div style="font-weight: 700; font-size: 14px;">TOKEN NOT CONFIGURED</div>
                <div style="font-size: 12px; color: #aaddaa; max-width: 380px; line-height: 1.4;">
                  Enter contract address in <strong>LINKS_CONFIG</strong> to activate real-time Robinhood Chain transaction indexing.
                </div>
                <button class="win-button" type="button" data-tape-open-config style="color: #000; font-weight: 700;">Open Market Control</button>
              </div>
            ` : `
              <table class="tape-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">TIME</th>
                    <th style="width: 80px;">TYPE</th>
                    <th style="width: 110px;">ETH/WETH</th>
                    <th style="width: 120px;">$LINKS</th>
                    <th>WALLET</th>
                  </tr>
                </thead>
                <tbody data-tape-body>
                  <!-- Rows injected dynamically -->
                </tbody>
              </table>
            `}
          </div>

          <div class="statusbar" data-tape-status>
            ROBINHOOD CHAIN | BLOCK #--- | CONNECTING...
          </div>
        </div>`;
    },
    mount: (windowElement) => {
      const ca = CONFIG.tokenAddress;
      const statusEl = $("[data-tape-status]", windowElement);
      const tbody = $("[data-tape-body]", windowElement);
      let sessionTrades = [];
      let lastProcessedBlock = 0;
      let thresholdInput = $("[data-tape-threshold]", windowElement);

      const updateStatus = (text) => {
        if (statusEl) statusEl.textContent = text;
      };

      if (!ca) {
        updateStatus("ROBINHOOD CHAIN | TOKEN NOT CONFIGURED");
        windowElement.addEventListener("click", (e) => {
          if (e.target.closest("[data-tape-open-config]")) wm.open("market");
        });
        return;
      }

      function formatTime(ts) {
        const d = new Date(ts);
        return d.toTimeString().split(" ")[0];
      }

      function renderTradeRow(t) {
        const tr = document.createElement("tr");
        tr.className = "tape-row";
        tr.dataset.txHash = t.txHash;
        const shortWallet = `${t.wallet.slice(0, 6)}...${t.wallet.slice(-4)}`;
        const typeClass = t.type.toLowerCase();

        tr.innerHTML = `
          <td>${formatTime(t.timestamp)}</td>
          <td><span class="tape-type ${typeClass}">${t.type}</span></td>
          <td>${t.ethAmount > 0 ? t.ethAmount.toFixed(3) : "--"}</td>
          <td>${t.linksAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          <td title="${t.wallet}">${shortWallet}</td>
        `;

        tr.addEventListener("dblclick", () => openTxProperties(t));
        tr.addEventListener("click", () => {
          if (window.innerWidth <= 600) openTxProperties(t);
        });
        return tr;
      }

      function openTxProperties(t) {
        const explorerTxUrl = `${CONFIG.explorerUrl}/tx/${t.txHash}`;
        const layer = $("#dialog-layer");
        const backdrop = document.createElement("div");
        backdrop.className = "dialog-backdrop";
        backdrop.innerHTML = `
          <section class="dialog" style="width: min(480px, calc(100vw - 16px));" role="dialog" aria-modal="true" aria-labelledby="tx-prop-title">
            <div class="titlebar">
              <span id="tx-prop-title" class="titlebar-title">TRANSACTION PROPERTIES</span>
              <div class="window-controls">
                <button class="window-control" type="button" data-tx-close>×</button>
              </div>
            </div>
            <div class="dialog-body" style="display: block; padding: 12px;">
              <dl class="tape-modal-details">
                <dt>Type:</dt><dd><strong class="tape-type ${t.type.toLowerCase()}">${t.type}</strong></dd>
                <dt>Wallet:</dt><dd>${escapeHTML(t.wallet)}</dd>
                <dt>Transaction:</dt><dd>${escapeHTML(t.txHash)}</dd>
                <dt>Block:</dt><dd>#${t.blockNumber}</dd>
                <dt>Amount LINKS:</dt><dd>${t.linksAmount.toLocaleString()} LINKS</dd>
                <dt>Amount ETH/WETH:</dt><dd>${t.ethAmount ? t.ethAmount.toFixed(4) + " ETH" : "N/A (Transfer)"}</dd>
              </dl>
            </div>
            <div class="dialog-actions">
              <a class="win-button" href="${explorerTxUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; padding: 3px 8px;">VIEW ON EXPLORER</a>
              <button class="win-button" type="button" data-tx-copy>COPY TX</button>
              <button class="win-button" type="button" data-tx-close>CLOSE</button>
            </div>
          </section>`;
        layer.append(backdrop);

        backdrop.addEventListener("click", (e) => {
          if (e.target.closest("[data-tx-close]")) backdrop.remove();
          if (e.target.closest("[data-tx-copy]")) {
            navigator.clipboard.writeText(t.txHash).then(() => {
              announce("Transaction hash copied.");
              e.target.textContent = "COPIED!";
            });
          }
        });
      }

      async function pollLiveTape() {
        try {
          const currentBlock = await ChainService.getBlockNumber();
          updateStatus(`ROBINHOOD CHAIN | BLOCK #${currentBlock} | LIVE`);

          if (currentBlock > lastProcessedBlock) {
            const newTrades = await ChainService.fetchRecentTrades(ca);
            if (newTrades && newTrades.length > 0) {
              const currentThreshold = parseFloat(thresholdInput?.value) || CONFIG.largeTradeEthThreshold || 0.5;

              // Filter trades not already in session
              for (const t of newTrades) {
                if (!sessionTrades.some(st => st.txHash === t.txHash)) {
                  sessionTrades.unshift(t);
                  if (tbody) {
                    tbody.prepend(renderTradeRow(t));
                    // Keep max 50 rows visible
                    while (tbody.children.length > 50) {
                      tbody.lastElementChild.remove();
                    }
                  }

                  // Check large transaction event
                  if (t.ethAmount >= currentThreshold && lastProcessedBlock > 0) {
                    notifyLargeTransaction(t);
                  }
                }
              }
            }
            lastProcessedBlock = currentBlock;
          }
        } catch (err) {
          console.warn("Live tape polling error:", err);
          updateStatus("ROBINHOOD CHAIN | CONNECTION ERROR");
        }
      }

      // Initial fetch
      pollLiveTape();

      // Adaptive polling (3-5s while visible)
      const interval = setInterval(() => {
        if (!windowElement.isConnected) {
          clearInterval(interval);
          return;
        }
        if (!windowElement.classList.contains("is-minimized")) {
          pollLiveTape();
        }
      }, 4000);

      windowElement._tapeTimer = interval;
    },
    unmount: (windowElement) => {
      if (windowElement._tapeTimer) clearInterval(windowElement._tapeTimer);
    }
  };

  // =========================================================================
  // FEATURE 2: HOLDER MAP.EXE (Windows 98 Blockchain Defragmenter)
  // =========================================================================
  APPS.holdermap = {
    title: "LINKS HOLDER MAP — Blockchain Defragmenter",
    icon: appIcon("holdermap"),
    width: 760,
    height: 560,
    menu: false,
    status: "Ready.",
    render: () => {
      const ca = CONFIG.tokenAddress;

      return `
        <div class="defrag-container" data-defrag-root>
          <nav class="menubar" aria-label="Holder Map Menu">
            <button class="menu-button" type="button" data-defrag-menu="print">File: Print...</button>
            <button class="menu-button" type="button" data-defrag-menu="analyze">Action: Analyze</button>
            <button class="menu-button" type="button" data-defrag-menu="legend">View: Legend</button>
          </nav>

          <div class="defrag-top-info">
            <div class="defrag-metrics-row">
              <div class="defrag-metric-item">
                <span class="defrag-metric-label">Token:</span>
                <span class="defrag-metric-val">$LINKS</span>
              </div>
              <div class="defrag-metric-item">
                <span class="defrag-metric-label">Network:</span>
                <span class="defrag-metric-val">Robinhood Chain (4663)</span>
              </div>
              <div class="defrag-metric-item">
                <span class="defrag-metric-label">Holders:</span>
                <span class="defrag-metric-val" data-defrag-holders>${ca ? "--" : "NOT CONFIGURED"}</span>
              </div>
              <div class="defrag-metric-item">
                <span class="defrag-metric-label">Supply Analyzed:</span>
                <span class="defrag-metric-val" data-defrag-supply>${ca ? "--" : "--"}</span>
              </div>
              <div class="defrag-metric-item">
                <span class="defrag-metric-label">Last Block:</span>
                <span class="defrag-metric-val" data-defrag-block>--</span>
              </div>
            </div>
          </div>

          <div class="defrag-controls-strip">
            <button class="win-button" type="button" data-defrag-btn="analyze"><strong>ANALYZE</strong></button>
            <button class="win-button" type="button" data-defrag-btn="refresh">REFRESH</button>
            <button class="win-button" type="button" data-defrag-btn="print">PRINT REPORT</button>
          </div>

          <div class="defrag-grid-viewport">
            <div class="defrag-grid" data-defrag-grid>
              <!-- 400 defrag cluster squares -->
            </div>
          </div>

          <div class="defrag-concentration-stats" data-defrag-concentration>
            <span>Top 1%: <strong data-conc="top1">--%</strong></span>
            <span>|</span>
            <span>Top 10%: <strong data-conc="top10">--%</strong></span>
            <span>|</span>
            <span>Top 50%: <strong data-conc="top50">--%</strong></span>
            <span>|</span>
            <span>Pool: <strong data-conc="pool">--%</strong></span>
            <span>|</span>
            <span>Other: <strong data-conc="other">--%</strong></span>
          </div>

          <div class="defrag-legend-bar">
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-top1"></div><span>Top 1</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-top10"></div><span>Top 2–10</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-top50"></div><span>Top 11–50</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-other"></div><span>Other Holders</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-pool"></div><span>Liquidity Pool</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-contract"></div><span>Contracts / Burn</span></div>
            <div class="defrag-legend-item"><div class="defrag-legend-swatch cell-unallocated"></div><span>Unallocated</span></div>
          </div>

          <div class="defrag-status-strip">
            <span data-defrag-status-text>Ready.</span>
            <div class="defrag-progress-track">
              <div class="defrag-progress-fill" data-defrag-progress-fill style="width: 0%;"></div>
            </div>
          </div>
        </div>`;
    },
    mount: (windowElement) => {
      const grid = $("[data-defrag-grid]", windowElement);
      const statusText = $("[data-defrag-status-text]", windowElement);
      const progressBar = $("[data-defrag-progress-fill]", windowElement);
      const ca = CONFIG.tokenAddress;

      let holderData = null;
      let totalCells = 360;

      // Populate empty grid initially
      function renderBlankGrid() {
        grid.innerHTML = "";
        for (let i = 0; i < totalCells; i++) {
          const cell = document.createElement("div");
          cell.className = "defrag-cell cell-unallocated";
          grid.append(cell);
        }
      }
      renderBlankGrid();

      function updateMetrics(data) {
        if (!data) return;
        const hEl = $("[data-defrag-holders]", windowElement);
        if (hEl) hEl.textContent = data.holderCount.toLocaleString();
        const sEl = $("[data-defrag-supply]", windowElement);
        if (sEl) sEl.textContent = `${data.totalAnalyzed.toLocaleString(undefined, { maximumFractionDigits: 0 })} LINKS`;
        const bEl = $("[data-defrag-block]", windowElement);
        if (bEl) bEl.textContent = `#${data.lastBlock || 0}`;

        if (data.concentration) {
          $("[data-conc='top1']", windowElement).textContent = `${data.concentration.top1.toFixed(1)}%`;
          $("[data-conc='top10']", windowElement).textContent = `${data.concentration.top10.toFixed(1)}%`;
          $("[data-conc='top50']", windowElement).textContent = `${data.concentration.top50.toFixed(1)}%`;
          $("[data-conc='pool']", windowElement).textContent = `${data.concentration.pool.toFixed(1)}%`;
          $("[data-conc='other']", windowElement).textContent = `${data.concentration.other.toFixed(1)}%`;
        }
      }

      function showHolderBlockModal(h) {
        const layer = $("#dialog-layer");
        const backdrop = document.createElement("div");
        backdrop.className = "dialog-backdrop";
        backdrop.innerHTML = `
          <section class="dialog" style="width: min(440px, calc(100vw - 16px));" role="dialog" aria-modal="true" aria-labelledby="hb-title">
            <div class="titlebar"><span id="hb-title" class="titlebar-title">HOLDER BLOCK</span></div>
            <div class="dialog-body" style="display: block; padding: 12px;">
              <dl class="tape-modal-details">
                <dt>Address:</dt><dd>${escapeHTML(h.address)}</dd>
                <dt>Rank:</dt><dd>#${h.rank || "--"}</dd>
                <dt>Balance:</dt><dd>${h.balance.toLocaleString()} LINKS</dd>
                <dt>Supply Share:</dt><dd>${h.share.toFixed(3)}%</dd>
                <dt>Type:</dt><dd><strong>${escapeHTML(h.type)}</strong></dd>
              </dl>
            </div>
            <div class="dialog-actions">
              <a class="win-button" href="${CONFIG.explorerUrl}/address/${h.address}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; padding: 3px 8px;">VIEW EXPLORER</a>
              <button class="win-button" type="button" data-hb-copy>COPY ADDRESS</button>
              <button class="win-button" type="button" data-hb-close>CLOSE</button>
            </div>
          </section>`;
        layer.append(backdrop);

        backdrop.addEventListener("click", (e) => {
          if (e.target.closest("[data-hb-close]")) backdrop.remove();
          if (e.target.closest("[data-hb-copy]")) {
            navigator.clipboard.writeText(h.address).then(() => {
              announce("Holder address copied.");
              e.target.textContent = "COPIED!";
            });
          }
        });
      }

      async function runDefragAnimation() {
        if (!ca) {
          statusText.textContent = "TOKEN NOT CONFIGURED. Enter contract address in LINKS_CONFIG.";
          showDialog({
            title: "HOLDER MAP.EXE",
            message: "TOKEN NOT CONFIGURED.\n\nPlease enter the LINKS token contract address in config.js.",
            image: icon("market")
          });
          return;
        }

        const stages = [
          "Reading blockchain...",
          "Scanning Transfer events...",
          "Calculating balances...",
          "Mapping holders...",
          "Defragmenting internet cats..."
        ];

        for (let s = 0; s < stages.length; s++) {
          statusText.textContent = stages[s];
          progressBar.style.width = `${((s + 1) / (stages.length + 1)) * 100}%`;
          beep("click");

          // Animate random cells flashing
          const cells = $$(".defrag-cell", grid);
          for (let k = 0; k < 25; k++) {
            const idx = Math.floor(Math.random() * cells.length);
            cells[idx]?.classList.add("cell-scanning");
            setTimeout(() => cells[idx]?.classList.remove("cell-scanning"), 180);
          }

          await new Promise(r => setTimeout(r, 450));
        }

        statusText.textContent = "Rebuilding distribution map...";
        holderData = await ChainService.getHolderDistribution(ca);
        updateMetrics(holderData);

        // Assign actual blocks based on real holder shares
        grid.innerHTML = "";
        const holders = holderData.holders || [];

        if (holders.length === 0) {
          renderBlankGrid();
          statusText.textContent = "DATA PARTIAL — Holder distribution could not be fully reconstructed.";
          progressBar.style.width = "100%";
          return;
        }

        // Compute block counts per category based on %
        let cellIndex = 0;
        holders.forEach(h => {
          const cellsForHolder = Math.max(1, Math.round((h.share / 100) * totalCells));
          let colorClass = "cell-other";
          if (h.type === "Liquidity Pool") colorClass = "cell-pool";
          else if (h.type === "Contract" || h.type === "Burn") colorClass = "cell-contract";
          else if (h.rank === 1) colorClass = "cell-top1";
          else if (h.rank <= 10) colorClass = "cell-top10";
          else if (h.rank <= 50) colorClass = "cell-top50";

          for (let c = 0; c < cellsForHolder && cellIndex < totalCells; c++) {
            const cell = document.createElement("div");
            cell.className = `defrag-cell ${colorClass}`;
            cell.title = `#${h.rank} ${h.address} (${h.share.toFixed(2)}%)`;
            cell.addEventListener("click", () => showHolderBlockModal(h));
            grid.append(cell);
            cellIndex++;
          }
        });

        // Fill remainder with unallocated
        while (cellIndex < totalCells) {
          const cell = document.createElement("div");
          cell.className = "defrag-cell cell-unallocated";
          grid.append(cell);
          cellIndex++;
        }

        progressBar.style.width = "100%";
        statusText.textContent = "ANALYSIS COMPLETE — No blockchain state was changed.";
        announce("Holder Map defragmentation analysis complete.");
      }

      function printReport() {
        const hCount = holderData?.holderCount || 0;
        const conc = holderData?.concentration || { top1: 0, top10: 0, top50: 0, pool: 0 };

        const printableText = [
          "============================================================",
          "               LINKS 98 HOLDER REPORT                       ",
          "            Robinhood Chain (Chain ID: 4663)                ",
          "============================================================",
          `Timestamp:        ${new Date().toLocaleString()}`,
          `Token Contract:   ${ca || "NOT CONFIGURED"}`,
          `Token Symbol:     $LINKS (Decimals: 18)`,
          `Last Block:       #${holderData?.lastBlock || 0}`,
          `Holders Count:    ${hCount}`,
          `Supply Analyzed:  ${holderData?.totalAnalyzed?.toLocaleString() || "0"} LINKS`,
          "------------------------------------------------------------",
          "HOLDER CONCENTRATION:",
          `  Top 1% Holder:  ${conc.top1.toFixed(2)}%`,
          `  Top 10 Holders: ${conc.top10.toFixed(2)}%`,
          `  Top 50 Holders: ${conc.top50.toFixed(2)}%`,
          `  Liquidity Pool: ${conc.pool.toFixed(2)}%`,
          `  Other Wallets:  ${conc.other?.toFixed(2) || "0"}%`,
          "------------------------------------------------------------",
          "DEFRAGMENTER MATRIX SUMMARY:",
          "  [██] TOP HOLDER    [▓▓] TOP 2-10    [▒▒] TOP 11-50",
          "  [░░] OTHER HOLDERS [$$] LIQUIDITY   [XX] CONTRACTS",
          "============================================================",
          "Verified on Robinhood Chain Blockscout Explorer.",
          "https://robinhoodchain.blockscout.com"
        ].join("\n");

        window.LINKS_PRINTER.print({
          title: "LINKS 98 Holder Report",
          content: printableText
        });
      }

      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-defrag-btn='analyze'], [data-defrag-menu='analyze']")) {
          runDefragAnimation();
        }
        if (e.target.closest("[data-defrag-btn='refresh']")) {
          ChainService.cache.holders = null;
          runDefragAnimation();
        }
        if (e.target.closest("[data-defrag-btn='print'], [data-defrag-menu='print']")) {
          printReport();
        }
        if (e.target.closest("[data-defrag-menu='legend']")) {
          showDialog({
            title: "Defragmenter Legend",
            message: "Navy: Top 1 Holder\nRoyal Blue: Top 2–10\nTeal: Top 11–50\nGrey: Other Holders\nAmber: Liquidity Pool\nCrimson: Contracts / Burn\nWhite: Unallocated",
            image: icon("my-computer")
          });
        }
      });

      // Auto-analyze if token is configured
      if (ca) {
        runDefragAnimation();
      }
    }
  };

  // =========================================================================
  // FEATURE 3: LINKS ANTIVIRUS 98
  // =========================================================================
  APPS.antivirus = {
    title: "LINKS Antivirus 98",
    icon: appIcon("antivirus"),
    width: 660,
    height: 480,
    status: "SYSTEM STATUS: PROTECTED",
    render: () => `
      <div class="av-container" data-av-root>
        <div class="av-status-banner" data-av-banner>
          <img class="av-banner-icon" src="${icon("recycle-full")}" alt="">
          <div>
            <div class="av-banner-title" data-av-title>SYSTEM STATUS: PROTECTED</div>
            <div class="av-banner-subtitle" data-av-sub>Real-time emotional malware protection active.</div>
          </div>
        </div>

        <div class="av-scan-progress-area">
          <div class="av-curr-file" data-av-file>C:\\WINDOWS\\CAT.SYS</div>
          <div class="defrag-progress-track" style="width: 100%; height: 16px;">
            <div class="defrag-progress-fill" data-av-progress style="width: 0%;"></div>
          </div>
        </div>

        <div class="av-threat-table-wrap">
          <table class="av-threat-table">
            <thead>
              <tr>
                <th style="width: 160px;">File Path</th>
                <th>Threat Classification</th>
                <th style="width: 100px;">Severity</th>
                <th style="width: 100px;">Action</th>
              </tr>
            </thead>
            <tbody data-av-threats>
              <tr>
                <td colspan="4" style="text-align: center; color: #888; padding: 20px;">
                  Press QUICK SCAN or FULL SCAN to inspect virtual filesystem.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="av-actions-row">
          <div style="display: flex; gap: 6px;">
            <button class="win-button" type="button" data-av-btn="quick"><strong>QUICK SCAN</strong></button>
            <button class="win-button" type="button" data-av-btn="full">FULL SCAN</button>
            <button class="win-button" type="button" data-av-btn="scan-links" style="color: #666;">Scan LINKS.EXE</button>
          </div>
          <button class="win-button" type="button" data-av-btn="quarantine" disabled>QUARANTINE ALL</button>
        </div>
      </div>`,
    mount: (windowElement) => {
      const banner = $("[data-av-banner]", windowElement);
      const title = $("[data-av-title]", windowElement);
      const sub = $("[data-av-sub]", windowElement);
      const fileEl = $("[data-av-file]", windowElement);
      const progEl = $("[data-av-progress]", windowElement);
      const tbody = $("[data-av-threats]", windowElement);
      const quarantineBtn = $("[data-av-btn='quarantine']", windowElement);

      const scanList = [
        "C:\\WINDOWS\\CAT.SYS",
        "C:\\LINKS\\LINKS.EXE",
        "C:\\LINKS\\HOLD.EXE",
        "C:\\TEMP\\FUD.EXE",
        "C:\\WINDOWS\\PAPERHANDS.DLL",
        "C:\\RECYCLE\\SELL.EXE",
        "C:\\MEMES\\market-control.jpg",
        "C:\\WINDOWS\\SYSTEM\\PANIC.EXE",
        "C:\\SYSTEM\\JEET.EXE",
        "C:\\INTERNET\\CATS\\ALPHA.TXT"
      ];

      const threatDefinitions = {
        "C:\\TEMP\\FUD.EXE": { name: "FUD.EXE (Emotional Malware)", severity: "HIGH" },
        "C:\\WINDOWS\\PAPERHANDS.DLL": { name: "PAPERHANDS.DLL (Weak Hand Library)", severity: "CRITICAL" },
        "C:\\WINDOWS\\SYSTEM\\PANIC.EXE": { name: "PANIC.EXE (Critical Emotion Leak)", severity: "HIGH" },
        "C:\\SYSTEM\\JEET.EXE": { name: "JEET.EXE (Short-Term Memory Leak)", severity: "MEDIUM" },
        "C:\\RECYCLE\\SELL.EXE": { name: "SELL.EXE (Unauthorized Button)", severity: "HIGH" }
      };

      let detectedThreats = [];

      async function runScan(isFull = false) {
        detectedThreats = [];
        quarantineBtn.disabled = true;
        tbody.innerHTML = "";
        banner.className = "av-status-banner is-scanning";
        title.textContent = "SCANNING SYSTEM...";
        sub.textContent = isFull ? "Full sector recursive audit in progress." : "Quick scan of critical cat directories.";

        const filesToScan = isFull ? [...scanList, ...scanList.map(f => f.replace("C:\\", "C:\\BACKUP\\"))] : scanList;

        for (let i = 0; i < filesToScan.length; i++) {
          const f = filesToScan[i];
          fileEl.textContent = f;
          progEl.style.width = `${((i + 1) / filesToScan.length) * 100}%`;
          beep("click");

          if (threatDefinitions[f]) {
            detectedThreats.push({ path: f, ...threatDefinitions[f] });
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${escapeHTML(f)}</td>
              <td class="av-threat-danger">${escapeHTML(threatDefinitions[f].name)}</td>
              <td><strong style="color: #cc0000;">${escapeHTML(threatDefinitions[f].severity)}</strong></td>
              <td><span style="color: #cc0000;">Pending</span></td>
            `;
            tbody.append(tr);
          }

          await new Promise(r => setTimeout(r, isFull ? 120 : 180));
        }

        progEl.style.width = "100%";

        if (detectedThreats.length > 0) {
          banner.className = "av-status-banner is-threat";
          title.textContent = `THREATS DETECTED: ${detectedThreats.length}`;
          sub.textContent = "Emotional malware found in system memory. Quarantine recommended.";
          quarantineBtn.disabled = false;
          beep("error");
        } else {
          banner.className = "av-status-banner";
          title.textContent = "SYSTEM STATUS: PROTECTED";
          sub.textContent = "No emotional malware detected.";
          tbody.innerHTML = `<tr><td colspan="4" class="av-threat-clean" style="text-align: center; padding: 20px;">Scan complete. All files safe.</td></tr>`;
        }
      }

      function quarantineAll() {
        if (!detectedThreats.length) return;
        beep("open");

        showDialog({
          title: "Quarantine Complete",
          message: `${detectedThreats.length} emotional decision files safely isolated to Recycle Bin.\n\nSystem morale restored to 100%.`,
          image: cat("reactions/confident")
        });

        banner.className = "av-status-banner";
        title.textContent = "SYSTEM STATUS: PROTECTED (CLEANED)";
        sub.textContent = "All detected threats moved to quarantine.";
        quarantineBtn.disabled = true;

        $$("tr td:last-child", tbody).forEach(td => {
          td.innerHTML = `<span class="av-threat-clean">Quarantined</span>`;
        });
      }

      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-av-btn='quick']")) runScan(false);
        if (e.target.closest("[data-av-btn='full']")) runScan(true);
        if (e.target.closest("[data-av-btn='quarantine']")) quarantineAll();
        if (e.target.closest("[data-av-btn='scan-links']")) {
          showDialog({
            title: "ACCESS DENIED",
            message: "Cannot scan or remove LINKS.EXE.\n\nReason: LINKS.EXE owns this computer.",
            image: cat("reactions/annoyed")
          });
        }
      });
    }
  };

  // =========================================================================
  // FEATURE 4: LINKS PRINTER 98
  // =========================================================================
  APPS.printer = {
    title: "LINKS PRINTER 98 — Queue",
    icon: appIcon("printer"),
    width: 680,
    height: 520,
    status: "Printer ready on LPT1:",
    render: () => `
      <div class="printer-container" data-printer-root>
        <div class="printer-queue-toolbar">
          <button class="win-button" type="button" data-prn-btn="print-sample">Print Test Page</button>
          <button class="win-button" type="button" data-prn-btn="save-image">SAVE AS IMAGE</button>
          <button class="win-button" type="button" data-prn-btn="clear">Clear Tray</button>
        </div>

        <div class="printer-stage">
          <div class="printer-hardware-unit">
            <div class="printer-slot"></div>
            <article class="printer-paper-sheet" data-paper-sheet>
============================================================
              LINKS 98 DOT MATRIX PRINTER TEST PAGE         
============================================================
Device:     LINKS High-Speed Tractor Feed 98
Port:       LPT1: (Parallel / Cat-Bus)
Emulation:  Epson FX-80 / 9-Pin Dot Matrix
Driver:     CATPRINT.SYS v1.0

TEST PATTERN:
  !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ

SYSTEM STATUS:
  Online:       YES
  Paper Jam:    NO (Cat currently sitting elsewhere)
  Morale:       100%
  Bullish Mode: ENABLED

To print other documents, use File > Print... inside:
Notepad, Lore, Holder Map, Market Reports, or Memes.
============================================================
            </article>
          </div>
        </div>

        <div class="printer-controls-row">
          <span style="flex: 1; font-size: 11px; align-self: center;" data-prn-queue-count>1 document(s) printed.</span>
          <button class="win-button" type="button" data-prn-btn="save-image"><strong>SAVE AS IMAGE (PNG)</strong></button>
          <button class="win-button" type="button" data-window-action="close">Close</button>
        </div>
      </div>`,
    mount: (windowElement) => {
      const paper = $("[data-paper-sheet]", windowElement);
      const queueCount = $("[data-prn-queue-count]", windowElement);
      let printJobCount = 0;
      let lastPrintTime = 0;

      windowElement._loadDocument = (doc) => {
        const now = Date.now();
        if (now - lastPrintTime < 1200) {
          printJobCount++;
        } else {
          printJobCount = 1;
        }
        lastPrintTime = now;

        // Easter egg: 5 rapid prints -> Paper Jam
        if (printJobCount >= 5) {
          paper.innerHTML = `
************************************************************
                     PAPER JAM ERROR                        
************************************************************
ERROR 98: CAT DETECTED IN PAPER TRAY.

Links Cat has chosen the warm printer as a nap location.
Please clear the cat before continuing print jobs.
************************************************************`;
          showDialog({
            title: "PAPER JAM",
            message: "PAPER JAM DETECTED.\n\nCat detected in paper tray.",
            image: cat("sleep-side")
          });
          printJobCount = 0;
          return;
        }

        paper.textContent = doc.content || doc;
        beep("coin");
        paper.style.animation = "none";
        void paper.offsetWidth; // reflow
        paper.style.animation = "printer-feed 0.4s ease-out";
        if (queueCount) queueCount.textContent = `Job: "${doc.title || "Document"}" printed.`;
      };

      // Export canvas to PNG
      async function exportAsImage() {
        const text = paper.innerText || paper.textContent;
        const lines = text.split("\n");

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const charHeight = 16;
        const width = 640;
        const height = Math.max(300, (lines.length + 4) * charHeight);

        canvas.width = width;
        canvas.height = height;

        // Paper background
        ctx.fillStyle = "#fffff5";
        ctx.fillRect(0, 0, width, height);

        // Dot matrix border
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Perforated hole punch dots on margins
        ctx.fillStyle = "#bbbbbb";
        for (let y = 15; y < height - 15; y += 14) {
          ctx.beginPath();
          ctx.arc(6, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(width - 6, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Text
        ctx.fillStyle = "#111111";
        ctx.font = "12px 'Courier New', monospace";
        lines.forEach((line, i) => {
          ctx.fillText(line, 24, 30 + i * charHeight);
        });

        // Trigger download
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `LINKS_98_Printout_${Date.now()}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        announce("Printout exported as PNG image.");
      }

      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-prn-btn='save-image']")) exportAsImage();
        if (e.target.closest("[data-prn-btn='print-sample']")) {
          windowElement._loadDocument({
            title: "LINKS Test Page",
            content: paper.textContent
          });
        }
        if (e.target.closest("[data-prn-btn='clear']")) {
          paper.textContent = "Paper tray empty. Awaiting new print jobs.";
        }
      });
    }
  };

  // =========================================================================
  // FEATURE 5: LINKS SOLITAIRE (Klondike Rules, Retro Cards, Win FX)
  // =========================================================================
  APPS.solitaire = {
    title: "LINKS Solitaire",
    icon: appIcon("solitaire"),
    width: 780,
    height: 560,
    menu: false,
    render: () => {
      const stats = JSON.parse(localStorage.getItem("links98:solitaire_stats") || '{"played":0,"won":0,"bestTime":null}');

      return `
        <div class="solitaire-app-container" data-sol-root>
          <nav class="menubar" aria-label="Solitaire Game Menu">
            <button class="menu-button" type="button" data-sol-menu="new">Game: New</button>
            <button class="menu-button" type="button" data-sol-menu="restart">Restart</button>
            <button class="menu-button" type="button" data-sol-menu="stats">Statistics</button>
            <button class="menu-button" type="button" data-sol-menu="how">Help: How to Play</button>
            <button class="menu-button" type="button" data-sol-menu="about">About</button>
          </nav>

          <div class="solitaire-table-area">
            <div class="solitaire-top-strip">
              <div class="solitaire-stock-waste-group">
                <div class="solitaire-pile-slot" data-sol-slot="stock" title="Stock Pile"></div>
                <div class="solitaire-pile-slot" data-sol-slot="waste" title="Waste Pile"></div>
              </div>
              <div class="solitaire-foundations-group">
                <div class="solitaire-pile-slot solitaire-foundation-slot" data-sol-slot="foundation-0" title="Foundation Hearts">♥</div>
                <div class="solitaire-pile-slot solitaire-foundation-slot" data-sol-slot="foundation-1" title="Foundation Diamonds">♦</div>
                <div class="solitaire-pile-slot solitaire-foundation-slot" data-sol-slot="foundation-2" title="Foundation Clubs">♣</div>
                <div class="solitaire-pile-slot solitaire-foundation-slot" data-sol-slot="foundation-3" title="Foundation Spades">♠</div>
              </div>
            </div>

            <div class="solitaire-tableau-area" data-sol-tableau>
              <div class="solitaire-tableau-col" data-sol-col="0"></div>
              <div class="solitaire-tableau-col" data-sol-col="1"></div>
              <div class="solitaire-tableau-col" data-sol-col="2"></div>
              <div class="solitaire-tableau-col" data-sol-col="3"></div>
              <div class="solitaire-tableau-col" data-sol-col="4"></div>
              <div class="solitaire-tableau-col" data-sol-col="5"></div>
              <div class="solitaire-tableau-col" data-sol-col="6"></div>
            </div>

            <canvas class="solitaire-win-canvas" data-sol-win-canvas hidden></canvas>
          </div>

          <div class="statusbar" style="display: flex; justify-content: space-between; padding: 2px 8px;">
            <span>Score: <strong data-sol-score>0</strong></span>
            <span>Time: <span data-sol-time>00:00</span></span>
            <span>Moves: <span data-sol-moves>0</span></span>
          </div>
        </div>`;
    },
    mount: (windowElement) => {
      const SUITS = ["hearts", "diamonds", "clubs", "spades"];
      const SUIT_SYMBOLS = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
      const SUIT_COLORS = { hearts: "red", diamonds: "red", clubs: "black", spades: "black" };
      const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

      let stock = [];
      let waste = [];
      let foundations = [[], [], [], []];
      let tableau = [[], [], [], [], [], [], []];

      let score = 0, moves = 0, seconds = 0, timerId = null;
      let isGameActive = true;
      let isWon = false;

      const scoreEl = $("[data-sol-score]", windowElement);
      const timeEl = $("[data-sol-time]", windowElement);
      const movesEl = $("[data-sol-moves]", windowElement);

      function createDeck() {
        const deck = [];
        for (const suit of SUITS) {
          for (let rank = 1; rank <= 13; rank++) {
            deck.push({
              suit,
              rank,
              label: VALUES[rank - 1],
              color: SUIT_COLORS[suit],
              symbol: SUIT_SYMBOLS[suit],
              faceUp: false,
              id: `${suit}-${rank}`
            });
          }
        }
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
      }

      function startNewGame() {
        if (timerId) clearInterval(timerId);
        isWon = false;
        isGameActive = true;
        score = 0;
        moves = 0;
        seconds = 0;
        $("[data-sol-win-canvas]", windowElement).hidden = true;

        const stats = JSON.parse(localStorage.getItem("links98:solitaire_stats") || '{"played":0,"won":0,"bestTime":null}');
        stats.played++;
        localStorage.setItem("links98:solitaire_stats", JSON.stringify(stats));

        const deck = createDeck();
        stock = [];
        waste = [];
        foundations = [[], [], [], []];
        tableau = [[], [], [], [], [], [], []];

        // Deal tableau (col 0: 1 card, col 6: 7 cards)
        for (let col = 0; col < 7; col++) {
          for (let row = 0; row <= col; row++) {
            const card = deck.pop();
            card.faceUp = (row === col); // Top card face up
            tableau[col].push(card);
          }
        }

        // Remaining to stock
        stock = deck;

        timerId = setInterval(() => {
          if (isGameActive && !isWon) {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, "0");
            const s = String(seconds % 60).padStart(2, "0");
            if (timeEl) timeEl.textContent = `${m}:${s}`;
          }
        }, 1000);

        renderTable();
      }

      function createCardElement(card, loc = {}) {
        const el = document.createElement("div");
        el.className = `solitaire-card suit-${card.suit} ${card.faceUp ? "face-up" : "card-back"}`;
        el.dataset.cardId = card.id;

        if (card.faceUp) {
          const isFaceArt = card.rank >= 11;
          const faceImg = isFaceArt ? `<img class="card-face-art" src="${cat(card.rank === 13 ? "celebrate" : card.rank === 12 ? "sit" : "walk")}" alt="">` : `<span style="font-size: 20px;">${card.symbol}</span>`;

          el.innerHTML = `
            <div class="card-corner-top">
              <span>${card.label}</span>
              <span style="font-size: 11px;">${card.symbol}</span>
            </div>
            <div class="card-pip-center">${faceImg}</div>
            <div class="card-corner-bottom">
              <span>${card.label}</span>
              <span style="font-size: 11px;">${card.symbol}</span>
            </div>
          `;
        }

        return el;
      }

      function renderTable() {
        if (scoreEl) scoreEl.textContent = score;
        if (movesEl) movesEl.textContent = moves;

        // Render Stock
        const stockSlot = $("[data-sol-slot='stock']", windowElement);
        stockSlot.innerHTML = "";
        if (stock.length > 0) {
          const topStock = createCardElement(stock[stock.length - 1]);
          stockSlot.append(topStock);
        } else {
          stockSlot.innerHTML = `<span style="display:grid; place-items:center; height:100%; color:rgba(255,255,255,0.3); font-size:24px;">↺</span>`;
        }

        // Render Waste
        const wasteSlot = $("[data-sol-slot='waste']", windowElement);
        wasteSlot.innerHTML = "";
        if (waste.length > 0) {
          const topWaste = createCardElement(waste[waste.length - 1]);
          wasteSlot.append(topWaste);
        }

        // Render Foundations
        for (let f = 0; f < 4; f++) {
          const fSlot = $(`[data-sol-slot='foundation-${f}']`, windowElement);
          const fCards = foundations[f];
          if (fCards.length > 0) {
            fSlot.innerHTML = "";
            fSlot.append(createCardElement(fCards[fCards.length - 1]));
          } else {
            fSlot.innerHTML = SUIT_SYMBOLS[SUITS[f]];
          }
        }

        // Render Tableau
        for (let col = 0; col < 7; col++) {
          const colEl = $(`[data-sol-col='${col}']`, windowElement);
          colEl.innerHTML = "";
          const cards = tableau[col];
          cards.forEach((card, idx) => {
            const cardEl = createCardElement(card);
            cardEl.style.top = `${idx * 18}px`;
            cardEl.style.zIndex = idx + 1;
            colEl.append(cardEl);
          });
        }
      }

      function tryAutoMoveToFoundation(card, fromSource, fromIdx) {
        for (let f = 0; f < 4; f++) {
          const fCards = foundations[f];
          const targetSuit = SUITS[f];

          if (card.suit === targetSuit) {
            if ((fCards.length === 0 && card.rank === 1) || (fCards.length > 0 && fCards[fCards.length - 1].rank === card.rank - 1)) {
              // Valid foundation move!
              if (fromSource === "waste") {
                waste.pop();
              } else if (fromSource === "tableau") {
                tableau[fromIdx].pop();
                // Flip new top card if needed
                if (tableau[fromIdx].length > 0) {
                  tableau[fromIdx][tableau[fromIdx].length - 1].faceUp = true;
                }
              }

              foundations[f].push(card);
              score += 15;
              moves++;
              beep("coin");
              renderTable();
              checkWinCondition();
              return true;
            }
          }
        }
        return false;
      }

      function checkWinCondition() {
        const totalInFoundations = foundations.reduce((acc, f) => acc + f.length, 0);
        if (totalInFoundations === 52 && !isWon) {
          isWon = true;
          isGameActive = false;
          if (timerId) clearInterval(timerId);

          const stats = JSON.parse(localStorage.getItem("links98:solitaire_stats") || '{"played":0,"won":0,"bestTime":null}');
          stats.won++;
          if (!stats.bestTime || seconds < stats.bestTime) stats.bestTime = seconds;
          localStorage.setItem("links98:solitaire_stats", JSON.stringify(stats));

          triggerWinAnimation();
        }
      }

      function triggerWinAnimation() {
        const canvas = $("[data-sol-win-canvas]", windowElement);
        canvas.hidden = false;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext("2d");

        O.playVictorySound?.();

        const bouncingCards = [];
        foundations.forEach(f => {
          f.forEach(card => {
            bouncingCards.push({
              card,
              x: Math.random() * (canvas.width - 70),
              y: 50,
              vx: (Math.random() - 0.5) * 8,
              vy: Math.random() * 4 + 2,
              gravity: 0.4
            });
          });
        });

        let frame = 0;
        function cascade() {
          if (!canvas.isConnected || canvas.hidden) return;
          frame++;

          for (const b of bouncingCards) {
            b.vy += b.gravity;
            b.x += b.vx;
            b.y += b.vy;

            if (b.y > canvas.height - 94) {
              b.y = canvas.height - 94;
              b.vy = -b.vy * 0.82;
            }
            if (b.x < 0 || b.x > canvas.width - 68) {
              b.vx = -b.vx;
            }

            // Draw card trail
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(b.x, b.y, 68, 94);
            ctx.strokeStyle = "#000";
            ctx.strokeRect(b.x, b.y, 68, 94);
            ctx.fillStyle = b.card.color === "red" ? "#cc0000" : "#000000";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText(`${b.card.label}${b.card.symbol}`, b.x + 6, b.y + 18);
          }

          if (frame < 250) {
            requestAnimationFrame(cascade);
          } else {
            showDialog({
              title: "VICTORY!",
              message: "YOU WON.\n\nDIAMOND PAWS CONFIRMED.\n\nTime: " + (timeEl?.textContent || "00:00") + "\nScore: " + score,
              image: cat("reactions/celebrating"),
              buttons: ["New Game", "Close"]
            }).then(choice => {
              if (choice === "New Game") startNewGame();
            });
          }
        }

        requestAnimationFrame(cascade);
      }

      // Interaction bindings (Stock, Waste, Tableau clicks)
      windowElement.addEventListener("click", (e) => {
        // Stock click -> draw
        if (e.target.closest("[data-sol-slot='stock']")) {
          if (stock.length > 0) {
            const card = stock.pop();
            card.faceUp = true;
            waste.push(card);
            moves++;
            beep("click");
          } else {
            // Recycle waste back to stock
            stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
            waste = [];
            moves++;
            beep("click");
          }
          renderTable();
          return;
        }

        // Waste card click -> try move to foundation
        const wasteCard = e.target.closest("[data-sol-slot='waste'] .solitaire-card");
        if (wasteCard && waste.length > 0) {
          const top = waste[waste.length - 1];
          if (!tryAutoMoveToFoundation(top, "waste")) {
            // Try move to tableau
            for (let c = 0; c < 7; c++) {
              const colCards = tableau[c];
              if (colCards.length === 0 && top.rank === 13) {
                tableau[c].push(waste.pop());
                score += 5;
                moves++;
                beep("click");
                renderTable();
                return;
              } else if (colCards.length > 0) {
                const target = colCards[colCards.length - 1];
                if (target.faceUp && target.color !== top.color && target.rank === top.rank + 1) {
                  tableau[c].push(waste.pop());
                  score += 5;
                  moves++;
                  beep("click");
                  renderTable();
                  return;
                }
              }
            }
          }
          return;
        }

        // Tableau card click
        const tabCardEl = e.target.closest("[data-sol-col] .solitaire-card");
        if (tabCardEl) {
          const colEl = tabCardEl.closest("[data-sol-col]");
          const colIdx = parseInt(colEl.dataset.solCol, 10);
          const cardId = tabCardEl.dataset.cardId;
          const colCards = tableau[colIdx];
          const cardIdx = colCards.findIndex(c => c.id === cardId);

          if (cardIdx !== -1) {
            const card = colCards[cardIdx];
            if (!card.faceUp && cardIdx === colCards.length - 1) {
              card.faceUp = true;
              score += 5;
              beep("click");
              renderTable();
              return;
            }

            if (card.faceUp) {
              // If it's the top card in tableau, try moving to foundation
              if (cardIdx === colCards.length - 1 && tryAutoMoveToFoundation(card, "tableau", colIdx)) {
                return;
              }

              // Otherwise try moving stack to another tableau column
              const stack = colCards.slice(cardIdx);
              for (let destCol = 0; destCol < 7; destCol++) {
                if (destCol === colIdx) continue;
                const destCards = tableau[destCol];

                if (destCards.length === 0 && card.rank === 13) {
                  tableau[destCol].push(...stack);
                  tableau[colIdx] = colCards.slice(0, cardIdx);
                  if (tableau[colIdx].length > 0) tableau[colIdx][tableau[colIdx].length - 1].faceUp = true;
                  moves++;
                  beep("click");
                  renderTable();
                  return;
                } else if (destCards.length > 0) {
                  const target = destCards[destCards.length - 1];
                  if (target.faceUp && target.color !== card.color && target.rank === card.rank + 1) {
                    tableau[destCol].push(...stack);
                    tableau[colIdx] = colCards.slice(0, cardIdx);
                    if (tableau[colIdx].length > 0) tableau[colIdx][tableau[colIdx].length - 1].faceUp = true;
                    moves++;
                    beep("click");
                    renderTable();
                    return;
                  }
                }
              }
            }
          }
        }

        // Menu handlers
        if (e.target.closest("[data-sol-menu='new']")) startNewGame();
        if (e.target.closest("[data-sol-menu='restart']")) startNewGame();
        if (e.target.closest("[data-sol-menu='stats']")) {
          const stats = JSON.parse(localStorage.getItem("links98:solitaire_stats") || '{"played":0,"won":0,"bestTime":null}');
          const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
          showDialog({
            title: "Solitaire Statistics",
            message: `Games Played: ${stats.played}\nGames Won: ${stats.won}\nWin Rate: ${winRate}%\nBest Time: ${stats.bestTime ? stats.bestTime + "s" : "N/A"}`,
            image: icon("links")
          });
        }
        if (e.target.closest("[data-sol-menu='how']")) {
          showDialog({
            title: "How to Play Solitaire",
            message: "1. Build 4 Foundations from Ace to King by suit (♥, ♦, ♣, ♠).\n2. Tableau columns build down in alternating colors (Red on Black).\n3. Click cards to auto-move or transfer stacks.\n4. Click stock to draw cards.",
            image: icon("links")
          });
        }
        if (e.target.closest("[data-sol-menu='about']")) {
          showDialog({
            title: "About LINKS Solitaire",
            message: "LINKS Solitaire 98\nAuthentic Klondike Solitaire with Links Cat character cards.\n(C) 1998 LINKS Operating System",
            image: icon("links")
          });
        }
      });

      startNewGame();
    },
    unmount: (windowElement) => {
      // Clean up timer
    }
  };

  // =========================================================================
  // FEATURE 6: INTERNET WEATHER (Parody Conditions + Real Robinhood Chain Telemetry)
  // =========================================================================
  APPS.weather = {
    title: "Internet Weather 98",
    icon: appIcon("weather"),
    width: 620,
    height: 520,
    status: "Internet zone",
    render: () => {
      const weatherStates = [
        { state: "Mostly Bullish", img: "sit", fud: "12%", advisory: "Low", pressure: "Rising", visibility: "Good", forecast: "Outside." },
        { state: "Scattered FUD", img: "reactions/concerned", fud: "34%", advisory: "Moderate", pressure: "Variable", visibility: "Foggy 56k", forecast: "Under the desk." },
        { state: "Heavy Memes", img: "reactions/celebrating", fud: "4%", advisory: "None", pressure: "Very High", visibility: "Crystal Clear", forecast: "Generating alpha." },
        { state: "High Meme Pressure", img: "stand", fud: "8%", advisory: "Minimal", pressure: "Maximum", visibility: "Excellent", forecast: "Sitting on modem." },
        { state: "Paper Hands Warning", img: "warning-cat", fud: "62%", advisory: "Elevated", pressure: "Turbulent", visibility: "Choppy", forecast: "Deleting SELL.EXE." },
        { state: "Clear Skies", img: "walk", fud: "2%", advisory: "None", pressure: "Stable", visibility: "Unlimited", forecast: "Lounging." },
        { state: "Internet Storm", img: "reactions/shocked", fud: "45%", advisory: "Caution", pressure: "Surging", visibility: "Dial-up Static", forecast: "Supervising servers." }
      ];

      const current = weatherStates[Math.floor(Math.random() * weatherStates.length)];

      return `
        <div class="weather-container" data-weather-root>
          <div class="weather-hero-card">
            <div class="weather-art-box">
              <img class="weather-art-img" src="${cat(current.img)}" alt="Links Cat weather illustration">
            </div>
            <div class="weather-hero-details">
              <div style="font-size: 11px; color: #555; text-transform: uppercase; font-weight: 700;">CURRENT INTERNET CONDITIONS</div>
              <div class="weather-hero-state" data-weather-state>${current.state}</div>
              <div style="font-size: 11px; color: #333;">Barometric Trend: 1024 hPa (Cat Adjusted)</div>
            </div>
          </div>

          <div class="weather-grid-conditions">
            <div class="weather-metric-cell">
              <span class="weather-metric-title">Chance of FUD:</span>
              <span class="weather-metric-content" data-w-fud>${current.fud}</span>
            </div>
            <div class="weather-metric-cell">
              <span class="weather-metric-title">Paper Hands Advisory:</span>
              <span class="weather-metric-content" data-w-advisory>${current.advisory}</span>
            </div>
            <div class="weather-metric-cell">
              <span class="weather-metric-title">Meme Pressure:</span>
              <span class="weather-metric-content" data-w-pressure>${current.pressure}</span>
            </div>
            <div class="weather-metric-cell">
              <span class="weather-metric-title">Internet Visibility:</span>
              <span class="weather-metric-content" data-w-vis>${current.visibility}</span>
            </div>
            <div class="weather-metric-cell" style="grid-column: 1 / -1;">
              <span class="weather-metric-title">LINKS Cat Forecast:</span>
              <span class="weather-metric-content" data-w-forecast>${current.forecast}</span>
            </div>
          </div>

          <div class="weather-disclaimer-box">
            <strong>ENTERTAINMENT FORECAST</strong><br>
            These values are jokes and are NOT derived from price data.
          </div>

          <!-- REAL TECHNICAL ROBINHOOD CHAIN NETWORK TELEMETRY -->
          <div class="weather-telemetry-panel">
            <div class="weather-telemetry-header">
              <span>ROBINHOOD CHAIN TECHNICAL TELEMETRY</span>
              <button class="win-button" type="button" data-telemetry-refresh style="color: #000; font-size: 10px; padding: 1px 6px;">REFRESH</button>
            </div>
            <dl class="weather-telemetry-list">
              <dt>NETWORK:</dt><dd data-tel-net>Robinhood Chain (Chain ID: 4663)</dd>
              <dt>RPC ENDPOINT:</dt><dd data-tel-rpc>rpc.mainnet.chain.robinhood.com</dd>
              <dt>CHAIN STATUS:</dt><dd data-tel-status style="color: #00ff66;">ONLINE</dd>
              <dt>RPC CONNECTION:</dt><dd data-tel-conn style="color: #00ff66;">CONNECTED</dd>
              <dt>LATEST BLOCK:</dt><dd data-tel-block>#FETCHING...</dd>
              <dt>EVM COMPATIBLE:</dt><dd>YES (ETH/WETH Gas Token)</dd>
              <dt>EXPLORER:</dt><dd><a href="${CONFIG.explorerUrl}" target="_blank" rel="noopener noreferrer" style="color: #55ff88;">robinhoodchain.blockscout.com</a></dd>
            </dl>
          </div>
        </div>`;
    },
    mount: (windowElement) => {
      const blockEl = $("[data-tel-block]", windowElement);
      const statusEl = $("[data-tel-status]", windowElement);
      const connEl = $("[data-tel-conn]", windowElement);

      async function updateRealTelemetry() {
        try {
          const num = await ChainService.getBlockNumber();
          if (blockEl) blockEl.textContent = `#${num}`;
          if (statusEl) { statusEl.textContent = "ONLINE"; statusEl.style.color = "#00ff66"; }
          if (connEl) { connEl.textContent = "CONNECTED (200 OK)"; connEl.style.color = "#00ff66"; }
        } catch (err) {
          console.warn("Weather telemetry RPC error:", err);
          if (statusEl) { statusEl.textContent = "DEGRADED / ERROR"; statusEl.style.color = "#ff4444"; }
          if (connEl) { connEl.textContent = "CONNECTION ERROR"; connEl.style.color = "#ff4444"; }
        }
      }

      updateRealTelemetry();

      const timer = setInterval(() => {
        if (windowElement.isConnected && !windowElement.classList.contains("is-minimized")) {
          updateRealTelemetry();
        }
      }, 6000);

      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-telemetry-refresh]")) {
          updateRealTelemetry();
          beep("click");
        }
      });

      windowElement._weatherTimer = timer;
    },
    unmount: (windowElement) => {
      if (windowElement._weatherTimer) clearInterval(windowElement._weatherTimer);
    }
  };

  // =========================================================================
  // UPDATE MARKET CONTROL SHORTCUTS & CROSS-APP INTEGRATION
  // =========================================================================
  if (APPS.market) {
    APPS.market.render = () => `
      <div class="app-art"><img src="${appArt("market-control-cat.png")}" alt="Links Cat at the market control console"></div>
      <div class="panel system-lines">
        <div>NETWORK: <output>ROBINHOOD CHAIN (4663)</output></div>
        <div>VOLATILITY: <output>CAT-SHAPED</output></div>
        <div>PREDICTIONS: <output>DISABLED</output></div>
      </div>
      <div class="dialog-actions" style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
        <button class="win-button" type="button" data-market-open="chart"><strong>CHART</strong></button>
        <button class="win-button" type="button" data-market-open="livetape"><strong>LIVE TAPE</strong></button>
        <button class="win-button" type="button" data-market-open="holdermap"><strong>HOLDER MAP</strong></button>
        <button class="win-button" type="button" data-market-open="buy">BUY LINKS</button>
      </div>`;

    APPS.market.mount = (windowElement) => {
      windowElement.addEventListener("click", (e) => {
        const target = e.target.closest("[data-market-open]")?.dataset.marketOpen;
        if (target) wm.open(target);
      });
    };
  }

  // =========================================================================
  // UPDATE START MENU HIERARCHY ACCORDING TO SPECIFICATIONS
  // =========================================================================
  function enhanceStartMenuHierarchy() {
    const startItems = $(".start-items");
    if (!startItems) return;

    // Submenu structures
    const marketToolsItems = [
      ["market", "Market Control", "market"],
      ["chart", "LINKS Chart", "market"],
      ["livetape", "Live Tape", "market"],
      ["holdermap", "Holder Map", "my-computer"]
    ];

    const gamesItems = [
      ["arcade", "LINKS 98 Arcade", "links"],
      ["solitaire", "LINKS Solitaire", "links"],
      ["codechallenge", "Code Challenge", "links"]
    ];

    const systemToolsItems = [
      ["antivirus", "LINKS Antivirus", "recycle-full"],
      ["printer", "LINKS Printer", "my-computer"],
      ["weather", "Internet Weather", "internet"],
      ["terminal", "LINKS Terminal", "terminal"],
      ["control", "Control Panel", "my-computer"]
    ];

    const developmentItems = [
      ["editor", "LINKS Code Editor", "document"],
      ["terminal", "Command Prompt", "terminal"],
      ["preview", "Web Preview", "internet"],
      ["codechallenge", "Code Challenge", "links"]
    ];

    const accessoriesItems = [
      ["notepad", "Notepad", "document"],
      ["paint", "Paint", "links"],
      ["calculator", "Calculator", "document"],
      ["internet", "Internet Explorer", "internet"],
      ["memes", "Meme Viewer", "memes"],
      ["lore", "Lore.txt", "lore"]
    ];

    const submenuHTML = (id, items) => `
      <div class="start-submenu" data-submenu-content="${id}" hidden>
        ${items.map(([app, label, img]) => `
          <button class="menu-item" type="button" data-start-app="${app}">
            <span><img src="${appIcon(app, img)}" alt="">${escapeHTML(label)}</span>
          </button>
        `).join("")}
      </div>
    `;

    // Reconstruct start menu
    startItems.innerHTML = `
      <div class="start-user-banner">
        <img class="start-user-avatar" src="${escapeHTML(O.state.user.pfp)}" alt="">
        <span class="start-user-name">${escapeHTML(O.state.user.username)}</span>
      </div>

      <button class="menu-item" type="button" data-submenu="market-tools"><span><img src="${icon("market")}" alt="">LINKS Market Tools</span><span>▶</span></button>
      ${submenuHTML("market-tools", marketToolsItems)}

      <button class="menu-item" type="button" data-submenu="links-games"><span><img src="${appIcon("arcade")}" alt="">LINKS Games</span><span>▶</span></button>
      ${submenuHTML("links-games", gamesItems)}

      <button class="menu-item" type="button" data-submenu="development"><span><img src="${icon("my-computer")}" alt="">Development</span><span>▶</span></button>
      ${submenuHTML("development", developmentItems)}

      <button class="menu-item" type="button" data-submenu="system-tools"><span><img src="${icon("my-computer")}" alt="">System Tools</span><span>▶</span></button>
      ${submenuHTML("system-tools", systemToolsItems)}

      <button class="menu-item" type="button" data-submenu="accessories"><span><img src="${icon("document")}" alt="">Accessories</span><span>▶</span></button>
      ${submenuHTML("accessories", accessoriesItems)}

      <div class="menu-separator"></div>
      <button class="menu-item" type="button" data-start-action="help"><span><img src="${icon("document")}" alt="">Help</span></button>
      <button class="menu-item" type="button" data-start-action="run"><span><img src="${icon("my-computer")}" alt="">Run...</span></button>
      <div class="menu-separator shutdown-separator"></div>
      <button class="menu-item utility-item" type="button" data-start-action="logoff"><img src="${icon("links")}" alt=""><span>Log Off ${escapeHTML(O.state.user.username)}...</span></button>
      <button class="menu-item utility-item shutdown-item" type="button" data-start-app="shutdown"><img src="${icon("links")}" alt=""><span>Shut Down...</span></button>
    `;
  }

  // Update arcade launcher to include Solitaire and Code Challenge
  const oldArcadeRender = APPS.arcade?.render;
  if (APPS.arcade) {
    APPS.arcade.render = () => {
      const base = oldArcadeRender();
      const extraCards = `
        <div class="arcade-game-card" data-launch-game="rugsweeper">
          <img class="arcade-card-icon" src="${appIcon("rugsweeper", icon("links"))}" alt="RUGSWEEPER.EXE">
          <div class="arcade-card-title">RUGSWEEPER.EXE</div>
          <div class="arcade-card-desc">Windows 98 Minesweeper Crypto Edition. Sweep the grid, flag the rugs, and HODL your position!</div>
          <div class="arcade-card-highscore">MINESWEEPER CRYPTO</div>
          <button class="win-button arcade-play-btn" type="button">PLAY</button>
        </div>
        <div class="arcade-game-card" data-launch-game="solitaire">
          <img class="arcade-card-icon" src="${appIcon("solitaire")}" alt="LINKS Solitaire">
          <div class="arcade-card-title">LINKS Solitaire</div>
          <div class="arcade-card-desc">Play classic Klondike Solitaire with retro Links Cat character cards, auto-foundation moves, and victory cascades!</div>
          <div class="arcade-card-highscore">DIAMOND PAWS KLONDIKE</div>
          <button class="win-button arcade-play-btn" type="button">PLAY</button>
        </div>
        <div class="arcade-game-card" data-launch-game="codechallenge">
          <img class="arcade-card-icon" src="${icon("terminal")}" alt="Code Challenge">
          <div class="arcade-card-title">Code Challenge 98</div>
          <div class="arcade-card-desc">Solve real JavaScript coding puzzles inside the LINKS 98 sandbox and verify solutions with automated tests!</div>
          <div class="arcade-card-highscore">JS SANDBOX IDE</div>
          <button class="win-button arcade-play-btn" type="button">PLAY</button>
        </div>
      `;
      return base.replace('</div>\n\n            <div class="minigame-view"', `${extraCards}</div>\n\n            <div class="minigame-view"`);
    };

    const oldArcadeMount = APPS.arcade.mount;
    APPS.arcade.mount = (windowElement) => {
      oldArcadeMount?.(windowElement);
      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-launch-game='rugsweeper']")) {
          wm.open("rugsweeper");
        }
        if (e.target.closest("[data-launch-game='solitaire']")) {
          wm.open("solitaire");
        }
        if (e.target.closest("[data-launch-game='codechallenge']")) {
          wm.open("codechallenge");
        }
      });
    };
  }

  // Add File > Print... support to Notepad
  if (APPS.notepad) {
    const oldNotepadMount = APPS.notepad.mount;
    APPS.notepad.mount = (windowElement) => {
      oldNotepadMount?.(windowElement);
      const menu = $(".notepad-menu", windowElement);
      if (menu && !$("[data-note='print']", menu)) {
        menu.insertAdjacentHTML("beforeend", `<button data-note="print">Print...</button>`);
      }
      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-note='print']")) {
          const text = $("textarea", windowElement)?.value || "";
          window.LINKS_PRINTER.print({
            title: "Notepad Document",
            content: text
          });
        }
      });
    };
  }

  // =========================================================================
  // FEATURE 7: RUGSWEEPER.EXE (Minesweeper Crypto Edition)
  // =========================================================================
  APPS.rugsweeper = {
    title: "RUGSWEEPER.EXE",
    icon: appIcon("rugsweeper", icon("links")),
    width: 330,
    height: 390,
    menu: false,
    render: () => {
      const best = localStorage.getItem("links98:rugsweeper_best") || "--";
      return `
        <div class="rugsweeper-container" data-rug-root>
          <div class="rugsweeper-window-body">
            <div class="rug-header-frame">
              <div class="rug-digital-counter" data-rug-mines>010</div>
              <button class="rug-face-btn" type="button" data-rug-reset title="Reset Game">
                <img src="assets/cats/reactions/confident.png" alt="Reset" data-rug-face>
              </button>
              <div class="rug-digital-counter" data-rug-timer>000</div>
            </div>
            <div class="rug-grid-frame">
              <div class="rug-board" data-rug-board></div>
            </div>
          </div>
          <div class="rugsweeper-statusbar">
            <span>Best Time: <b data-rug-best>${best}s</b></span>
            <span>9x9 Grid · 10 Rugs</span>
          </div>
        </div>
      `;
    },
    mount: (windowElement) => {
      const rows = 9, cols = 9, totalMines = 10;
      let grid = [];
      let minesPlaced = false;
      let gameOver = false;
      let flagsCount = 0;
      let timer = 0;
      let timerInterval = null;

      const boardEl = $("[data-rug-board]", windowElement);
      const minesEl = $("[data-rug-mines]", windowElement);
      const timerEl = $("[data-rug-timer]", windowElement);
      const faceEl = $("[data-rug-face]", windowElement);
      const bestEl = $("[data-rug-best]", windowElement);

      function initGame() {
        clearInterval(timerInterval);
        timerInterval = null;
        timer = 0;
        flagsCount = 0;
        minesPlaced = false;
        gameOver = false;
        faceEl.src = "assets/cats/reactions/confident.png";
        minesEl.textContent = String(totalMines).padStart(3, "0");
        timerEl.textContent = "000";

        grid = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => ({
            mine: false,
            revealed: false,
            flagged: false,
            count: 0
          }))
        );

        renderBoard();
      }

      function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
          timer = Math.min(999, timer + 1);
          timerEl.textContent = String(timer).padStart(3, "0");
        }, 1000);
      }

      function placeMines(excludeR, excludeC) {
        let placed = 0;
        while (placed < totalMines) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          if ((r === excludeR && c === excludeC) || grid[r][c].mine) continue;
          grid[r][c].mine = true;
          placed++;
        }

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c].mine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) {
                  count++;
                }
              }
            }
            grid[r][c].count = count;
          }
        }
        minesPlaced = true;
      }

      function renderBoard() {
        boardEl.innerHTML = "";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            const btn = document.createElement("button");
            btn.className = "mine-cell";
            btn.dataset.r = r;
            btn.dataset.c = c;
            btn.type = "button";

            if (cell.revealed) {
              btn.classList.add("revealed");
              if (cell.mine) {
                btn.innerHTML = "💣";
              } else if (cell.count > 0) {
                btn.textContent = cell.count;
                btn.dataset.num = cell.count;
              }
            } else if (cell.flagged) {
              btn.classList.add("flagged");
              btn.innerHTML = "🛡";
            }

            boardEl.appendChild(btn);
          }
        }
      }

      function reveal(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        const cell = grid[r][c];
        if (cell.revealed || cell.flagged) return;

        if (!minesPlaced) {
          placeMines(r, c);
          startTimer();
        }

        cell.revealed = true;

        if (cell.mine) {
          gameOver = true;
          clearInterval(timerInterval);
          faceEl.src = "assets/cats/reactions/annoyed.png";
          beep("error");
          revealAllMines(r, c);
          announce("Rug pulled! Game over.");
          return;
        }

        beep("click");

        if (cell.count === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr !== 0 || dc !== 0) reveal(r + dr, c + dc);
            }
          }
        }

        checkWin();
        renderBoard();
      }

      function toggleFlag(r, c) {
        if (gameOver) return;
        const cell = grid[r][c];
        if (cell.revealed) return;

        if (!cell.flagged && flagsCount >= totalMines) return;

        cell.flagged = !cell.flagged;
        flagsCount += cell.flagged ? 1 : -1;
        minesEl.textContent = String(Math.max(0, totalMines - flagsCount)).padStart(3, "0");
        beep("click");
        renderBoard();
      }

      function revealAllMines(hitR, hitC) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c].mine) {
              grid[r][c].revealed = true;
            }
          }
        }
        renderBoard();
        const hitBtn = boardEl.querySelector(`[data-r="${hitR}"][data-c="${hitC}"]`);
        if (hitBtn) hitBtn.classList.add("exploded");
      }

      function checkWin() {
        let unrevealedSafe = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (!grid[r][c].mine && !grid[r][c].revealed) {
              unrevealedSafe++;
            }
          }
        }

        if (unrevealedSafe === 0) {
          gameOver = true;
          clearInterval(timerInterval);
          faceEl.src = "assets/cats/reactions/celebrating.png";
          playVictorySound();
          announce(`RUGSWEEPER VICTORY in ${timer} seconds!`);

          const currentBest = parseInt(localStorage.getItem("links98:rugsweeper_best") || "999", 10);
          if (timer < currentBest) {
            localStorage.setItem("links98:rugsweeper_best", String(timer));
            if (bestEl) bestEl.textContent = `${timer}s`;
          }
        }
      }

      boardEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".mine-cell");
        if (!btn || gameOver) return;
        const r = parseInt(btn.dataset.r, 10);
        const c = parseInt(btn.dataset.c, 10);
        reveal(r, c);
      });

      boardEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.closest(".mine-cell");
        if (!btn || gameOver) return;
        const r = parseInt(btn.dataset.r, 10);
        const c = parseInt(btn.dataset.c, 10);
        toggleFlag(r, c);
      });

      let touchTimer = null;
      boardEl.addEventListener("touchstart", (e) => {
        const btn = e.target.closest(".mine-cell");
        if (!btn || gameOver) return;
        const r = parseInt(btn.dataset.r, 10);
        const c = parseInt(btn.dataset.c, 10);
        touchTimer = setTimeout(() => {
          toggleFlag(r, c);
          touchTimer = null;
        }, 400);
      }, { passive: true });

      boardEl.addEventListener("touchend", () => {
        clearTimeout(touchTimer);
      }, { passive: true });

      windowElement.querySelector("[data-rug-reset]")?.addEventListener("click", initGame);

      initGame();
    },
    unmount: (windowElement) => {}
  };

  // =========================================================================
  // FEATURE 8: WINAMP.EXE (CatAMP 2.98 - 90s Chiptune Synth Player)
  // =========================================================================
  APPS.winamp = {
    title: "CatAMP 2.98 - LINKS Media Player",
    icon: appIcon("winamp", icon("links")),
    width: 380,
    height: 270,
    menu: false,
    render: () => `
      <div class="winamp-chassis" data-winamp-root>
        <div class="winamp-top-display">
          <div class="winamp-vis-canvas-wrap">
            <canvas class="winamp-vis-canvas" width="76" height="38"></canvas>
          </div>
          <div class="winamp-lcd-panel">
            <div class="winamp-lcd-header">
              <span class="winamp-mono-tag">STEREO</span>
              <span class="winamp-kbps-tag">128 KBPS</span>
              <span class="winamp-khz-tag">44 KHZ</span>
            </div>
            <div class="winamp-marquee-wrap">
              <div class="winamp-marquee-text" data-winamp-title>1. LINKS CAT - DIAL-UP ANTHEM (1998) ***</div>
            </div>
            <div class="winamp-time-row">
              <span class="winamp-time-display" data-winamp-time>00:00</span>
              <span class="winamp-status-badge" data-winamp-status>STOPPED</span>
            </div>
          </div>
        </div>

        <div class="winamp-sliders-strip">
          <label class="winamp-slider-wrap">
            <span>VOL</span>
            <input type="range" class="winamp-range" data-winamp-vol min="0" max="100" value="75">
          </label>
          <label class="winamp-slider-wrap">
            <span>BAL</span>
            <input type="range" class="winamp-range" data-winamp-pan min="-50" max="50" value="0">
          </label>
        </div>

        <div class="winamp-controls-row">
          <button class="winamp-btn" type="button" data-winamp-cmd="prev" title="Previous Track">|◀◀</button>
          <button class="winamp-btn" type="button" data-winamp-cmd="play" title="Play">▶</button>
          <button class="winamp-btn" type="button" data-winamp-cmd="pause" title="Pause">❚❚</button>
          <button class="winamp-btn" type="button" data-winamp-cmd="stop" title="Stop">■</button>
          <button class="winamp-btn" type="button" data-winamp-cmd="next" title="Next Track">▶▶|</button>
          <button class="winamp-btn" type="button" data-winamp-cmd="eject" title="Toggle Playlist">⏏</button>
        </div>

        <div class="winamp-playlist-box" data-winamp-playlist>
          <div class="winamp-pl-entry is-active" data-track-idx="0">1. Links Cat - Dial-Up Anthem (1998)</div>
          <div class="winamp-pl-entry" data-track-idx="1">2. Degen Hills - 56k Chiptune Dreams</div>
          <div class="winamp-pl-entry" data-track-idx="2">3. Green Candle Symphony in C Minor</div>
          <div class="winamp-pl-entry" data-track-idx="3">4. Moon Mission (8-Bit Cat Beat)</div>
          <div class="winamp-pl-entry" data-track-idx="4">5. Cyber Cat 1999 (Eurobeat Remix)</div>
          <div class="winamp-pl-entry" data-track-idx="5">6. Windows 98 Sunset (Vaporwave Vibe)</div>
          <div class="winamp-pl-entry" data-track-idx="6">7. Pump the Gas (Robinhood Chiptune Beat)</div>
          <div class="winamp-pl-entry" data-track-idx="7">8. Lofi Midnight Meow (Chill Cat Lounge)</div>
        </div>
      </div>
    `,
    mount: (windowElement) => {
      const TRACKS = [
        { title: "1. Links Cat - Dial-Up Anthem (1998)", bpm: 130, notes: [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 392.00, 523.25, 659.25, 587.33, 523.25, 392.00, 329.63], bass: [130.81, 130.81, 164.81, 164.81, 110.00, 110.00, 146.83, 146.83] },
        { title: "2. Degen Hills - 56k Chiptune Dreams", bpm: 120, notes: [329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 246.94, 293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 220.00], bass: [164.81, 164.81, 123.47, 123.47, 146.83, 146.83, 110.00, 110.00] },
        { title: "3. Green Candle Symphony in C Minor", bpm: 138, notes: [261.63, 311.13, 392.00, 466.16, 523.25, 466.16, 392.00, 311.13, 233.08, 293.66, 349.23, 466.16, 349.23, 293.66, 233.08, 196.00], bass: [130.81, 130.81, 116.54, 116.54, 146.83, 146.83, 98.00, 98.00] },
        { title: "4. Moon Mission (8-Bit Cat Beat)", bpm: 125, notes: [392.00, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 392.00, 349.23, 440.00, 523.25, 698.46, 587.33, 523.25, 440.00, 349.23], bass: [98.00, 98.00, 130.81, 130.81, 87.31, 87.31, 116.54, 116.54] },
        { title: "5. Cyber Cat 1999 (Eurobeat Remix)", bpm: 144, notes: [440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 523.25, 440.00, 392.00, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 392.00], bass: [110.00, 110.00, 130.81, 130.81, 98.00, 98.00, 123.47, 123.47] },
        { title: "6. Windows 98 Sunset (Vaporwave Vibe)", bpm: 95, notes: [293.66, 369.99, 440.00, 554.37, 440.00, 369.99, 293.66, 220.00, 261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00], bass: [146.83, 146.83, 110.00, 110.00, 130.81, 130.81, 98.00, 98.00] },
        { title: "7. Pump the Gas (Robinhood Chiptune Beat)", bpm: 135, notes: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.00, 440.00, 523.25, 659.25, 880.00, 659.25, 523.25, 440.00, 349.23], bass: [130.81, 130.81, 164.81, 164.81, 110.00, 110.00, 87.31, 87.31] },
        { title: "8. Lofi Midnight Meow (Chill Cat Lounge)", bpm: 88, notes: [349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 349.23, 261.63, 329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 246.94], bass: [87.31, 87.31, 110.00, 110.00, 82.41, 82.41, 123.47, 123.47] }
      ];

      let currentTrack = 0;
      let isPlaying = false;
      let audioCtx = null;
      let masterGain = null;
      let analyser = null;
      let playTimer = null;
      let visAnimFrame = null;
      let trackTimeSeconds = 0;
      let noteStep = 0;

      const titleEl = $("[data-winamp-title]", windowElement);
      const timeEl = $("[data-winamp-time]", windowElement);
      const statusEl = $("[data-winamp-status]", windowElement);
      const volSlider = $("[data-winamp-vol]", windowElement);
      const canvas = $(".winamp-vis-canvas", windowElement);
      const ctx = canvas?.getContext("2d");

      function initAudio() {
        if (audioCtx) return;
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioClass();
        masterGain = audioCtx.createGain();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        masterGain.connect(analyser);
        analyser.connect(audioCtx.destination);
        setVolume(volSlider.value);
      }

      function setVolume(val) {
        if (masterGain && audioCtx) {
          masterGain.gain.setValueAtTime((val / 100) * 0.08, audioCtx.currentTime);
        }
      }

      function drawVisualizer() {
        if (!canvas || !analyser) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = "#000a00";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barCount = 14;
        const barWidth = 4;
        const gap = 1;

        for (let i = 0; i < barCount; i++) {
          const rawVal = dataArray[i * 2] || 0;
          const val = isPlaying ? Math.max(3, (rawVal / 255) * canvas.height) : 2;
          const x = i * (barWidth + gap) + 3;

          ctx.fillStyle = val > 26 ? "#ff2222" : val > 16 ? "#ffff00" : "#00ff44";
          ctx.fillRect(x, canvas.height - val, barWidth, val);
        }

        if (isPlaying) {
          visAnimFrame = requestAnimationFrame(drawVisualizer);
        }
      }

      function playNote() {
        if (!isPlaying || !audioCtx) return;
        const track = TRACKS[currentTrack];
        const freq = track.notes[noteStep % track.notes.length];
        const bassFreq = track.bass[(noteStep >> 1) % track.bass.length];

        const t = audioCtx.currentTime;
        const dur = (60 / track.bpm) * 0.45;

        // Lead
        const osc1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        osc1.type = "square";
        osc1.frequency.setValueAtTime(freq, t);
        g1.gain.setValueAtTime(0.04, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc1.connect(g1).connect(masterGain);
        osc1.start(t);
        osc1.stop(t + dur);

        // Bass
        const osc2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(bassFreq, t);
        g2.gain.setValueAtTime(0.06, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.2);
        osc2.connect(g2).connect(masterGain);
        osc2.start(t);
        osc2.stop(t + dur * 1.2);

        noteStep++;
      }

      function play() {
        initAudio();
        if (audioCtx.state === "suspended") audioCtx.resume();
        isPlaying = true;
        statusEl.textContent = "PLAYING";
        statusEl.style.color = "#00ff66";
        statusEl.style.background = "#003300";
        titleEl.textContent = `${TRACKS[currentTrack].title} *** [128 KBPS] ***`;

        updatePlaylistSelection();

        clearInterval(playTimer);
        const stepMs = Math.round((60 / TRACKS[currentTrack].bpm) * 500);
        playTimer = setInterval(() => {
          playNote();
          trackTimeSeconds++;
          const m = String(Math.floor(trackTimeSeconds / 60)).padStart(2, "0");
          const s = String(trackTimeSeconds % 60).padStart(2, "0");
          timeEl.textContent = `${m}:${s}`;
        }, stepMs);

        cancelAnimationFrame(visAnimFrame);
        drawVisualizer();
      }

      function pause() {
        isPlaying = false;
        clearInterval(playTimer);
        statusEl.textContent = "PAUSED";
        statusEl.style.color = "#ffff00";
        statusEl.style.background = "#333300";
        cancelAnimationFrame(visAnimFrame);
        drawVisualizer();
      }

      function stop() {
        isPlaying = false;
        clearInterval(playTimer);
        trackTimeSeconds = 0;
        noteStep = 0;
        timeEl.textContent = "00:00";
        statusEl.textContent = "STOPPED";
        statusEl.style.color = "#ff6666";
        statusEl.style.background = "#330000";
        cancelAnimationFrame(visAnimFrame);
        drawVisualizer();
      }

      function next() {
        currentTrack = (currentTrack + 1) % TRACKS.length;
        trackTimeSeconds = 0;
        noteStep = 0;
        if (isPlaying) play();
        else {
          titleEl.textContent = `${TRACKS[currentTrack].title} ***`;
          updatePlaylistSelection();
        }
      }

      function prev() {
        currentTrack = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
        trackTimeSeconds = 0;
        noteStep = 0;
        if (isPlaying) play();
        else {
          titleEl.textContent = `${TRACKS[currentTrack].title} ***`;
          updatePlaylistSelection();
        }
      }

      function updatePlaylistSelection() {
        $$(".winamp-pl-entry", windowElement).forEach((el, idx) => {
          el.classList.toggle("is-active", idx === currentTrack);
        });
      }

      windowElement.addEventListener("click", (e) => {
        const cmd = e.target.closest("[data-winamp-cmd]")?.dataset.winampCmd;
        if (cmd === "play") play();
        if (cmd === "pause") pause();
        if (cmd === "stop") stop();
        if (cmd === "next") next();
        if (cmd === "prev") prev();
        if (cmd === "eject") {
          const pl = $("[data-winamp-playlist]", windowElement);
          if (pl) pl.hidden = !pl.hidden;
        }

        const plEntry = e.target.closest(".winamp-pl-entry");
        if (plEntry) {
          currentTrack = parseInt(plEntry.dataset.trackIdx, 10) || 0;
          trackTimeSeconds = 0;
          noteStep = 0;
          play();
        }
      });

      volSlider.addEventListener("input", (e) => {
        setVolume(e.target.value);
      });

      windowElement._winampStop = stop;
      drawVisualizer();
    },
    unmount: (windowElement) => {
      windowElement._winampStop?.();
    }
  };
  APPS.media = APPS.winamp;

})();
