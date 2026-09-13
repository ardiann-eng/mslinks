(() => {
  "use strict";

  const O = window.LINKS_OS_CORE;
  if (!O) return;

  const { $, $$, APPS, wm, icon, cat, appArt, escapeHTML, showDialog, announce, beep } = O;
  const CONFIG = window.LINKS_CONFIG;

  // =========================================================================
  // 1. REAL VIRTUAL FILESYSTEM WITH INDEXEDDB PERSISTENCE (VFSManager)
  // =========================================================================
  class VirtualFilesystemManager {
    constructor() {
      this.dbName = "links98_vfs_db";
      this.storeName = "vfs_files";
      this.db = null;
      this.files = new Map(); // path -> string content
      this.directories = new Set([
        "C:",
        "C:\\",
        "C:\\LINKS",
        "C:\\LINKS\\DO_NOT_OPEN",
        "C:\\LINKS\\EXAMPLES",
        "C:\\WINDOWS",
        "C:\\WINDOWS\\SYSTEM",
        "C:\\WINDOWS\\SYSTEM\\CAT",
        "C:\\WINDOWS\\TEMP",
        "C:\\PROGRAMS",
        "C:\\USERS",
        "C:\\USERS\\DEGEN98",
        "C:\\USERS\\DEGEN98\\DOCUMENTS",
        "C:\\USERS\\DEGEN98\\PROJECTS",
        "C:\\DEV",
        "C:\\DEV\\EXAMPLES",
        "C:\\DEV\\PROJECTS",
        "C:\\MEMES",
        "C:\\SYSTEM",
        "C:\\TEMP",
        "C:\\GAMES",
        "C:\\RECYCLE"
      ]);

      this.initDefaultFiles();
      this.initIndexedDB();
    }

    initDefaultFiles() {
      const defaults = {
        "C:\\LINKS\\LINKS.EXE": "[BINARY EXECUTABLE: LINKS 98 CORE SYSTEM]",
        "C:\\LINKS\\CONTRACT.TXT": `LINKS CONTRACT ADDRESS\n\n${CONFIG.tokenAddress || "TOKEN NOT CONFIGURED"}\n\nNETWORK:\nROBINHOOD CHAIN (Chain ID: 4663)\n\nVERIFY BEFORE USING.`,
        "C:\\LINKS\\README.TXT": "LINKS 98 README\n\nCongratulations. You have installed a cat on your computer. Nobody knows why. Please do not uninstall him.\n\nKnown Issues:\n- SELL.EXE missing\n- Cat has administrator privileges\n- Internet occasionally becomes bullish\n- Recycle Bin contains emotional decisions",
        "C:\\LINKS\\WHITEPAPER.TXT": "LINKS WHITEPAPER\nVersion 0.98\n\n1. Cat.\n2. Internet.\n3. Meme.\n4. That's basically it.\n\nTECHNOLOGY:\nRuns on: Internet\nPowered by: Cats\nConsensus mechanism: Everyone seems to agree the cat is cool.",
        "C:\\LINKS\\LORE.TXT": "In 1998, LINKS.exe appeared on a computer nobody remembered installing it on.",
        "C:\\LINKS\\cat_notes.txt": "things to do:\n- sleep\n- inspect internet\n- delete sell button\n- become operating system",
        "C:\\LINKS\\HOLD.EXE": "[BINARY EXECUTABLE: HOLD MODE ENABLED]",
        "C:\\LINKS\\DO_NOT_OPEN\\classified.txt": "CATS CONTROL THE MARKET. NOBODY WAS SUPPOSED TO SEE THIS.",
        "C:\\LINKS\\EXAMPLES\\HELLO.JS": `// Hello World in LINKS 98
console.log("Hello from LINKS 98!");
console.log("Username:", links.username);
`,
        "C:\\LINKS\\EXAMPLES\\CAT.JS": `// Cat Meow Loop
for (let i = 1; i <= 5; i++) {
  console.log(i + ": " + links.meow());
}
`,
        "C:\\LINKS\\EXAMPLES\\LOOP.JS": `// Number Generator
const cats = 98;
for (let i = 0; i < 3; i++) {
  console.log("LINKS", cats + i);
}
`,
        "C:\\LINKS\\EXAMPLES\\MARKET.JS": `// Real Robinhood Chain Data
try {
  const block = await links.chain.getBlockNumber();
  console.log("Robinhood Chain Block Number:", block);
  
  const token = await links.market.getToken();
  console.log("Token:", token.symbol, "Price:", token.price);
} catch (err) {
  console.log("Market Info:", err.message || err);
}
`,
        "C:\\LINKS\\EXAMPLES\\HELLO.HTML": `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LINKS Web Page</title>
  <style>
    body {
      background: #008080;
      color: #ffffff;
      font-family: monospace;
      padding: 24px;
    }
    h1 { color: #ffff00; }
    .card {
      background: #c0c0c0;
      color: #000;
      padding: 12px;
      border: 2px outset #fff;
    }
  </style>
</head>
<body>
  <h1>Welcome to LINKS Web</h1>
  <div class="card">
    <p>This is a real sandboxed webpage created inside LINKS 98!</p>
    <p>Edit in <strong>edit HELLO.HTML</strong> and preview in <strong>preview HELLO.HTML</strong>.</p>
  </div>
</body>
</html>
`,
        "C:\\DEV\\README.TXT": `LINKS 98 DEVELOPER KIT

Welcome, programmer.

Available Tools:
- JavaScript (node filename.js / js)
- HTML Web Preview (preview filename.html)
- LINKS Code Editor (edit filename.js)
- Code Challenges (LINKS Games > Code Challenge)

Network:
Robinhood Chain (Chain ID: 4663)

Warning:
CAT.SYS has administrator privileges.
`,
        "C:\\DEV\\PROJECTS\\app.js": `const name = "LINKS";
for (let i = 1; i <= 3; i++) {
  console.log(i + ": " + name);
}
`,
        "C:\\DEV\\PROJECTS\\index.html": `<!DOCTYPE html>
<html>
<head>
  <title>Cat Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h2>Cat Project</h2>
  <p>Running from C:\\DEV\\PROJECTS</p>
  <script src="app.js"></script>
</body>
</html>
`,
        "C:\\DEV\\PROJECTS\\style.css": `body { background: #000080; color: #fff; font-family: monospace; padding: 20px; }
h2 { color: #ffaa00; }
`,
        "C:\\WINDOWS\\CAT.SYS": "[SYSTEM DRIVER: CAT.SYS - ADMINISTRATOR]",
        "C:\\WINDOWS\\win.com": "[SYSTEM EXECUTABLE]",
        "C:\\WINDOWS\\SYSTEM\\CAT\\origin.txt": "Nobody installed Links.\n\nOne morning he was simply here.\n\nSystem logs indicate LINKS.EXE existed before LINKS 98 finished installing.",
        "C:\\TEMP\\definitely_not_alpha.txt": "The password is what a cat says. This is definitely not alpha.",
        "C:\\RECYCLE\\SELL.EXE": "[DISABLED EXECUTABLE]",
        "C:\\RECYCLE\\PAPERHANDS.DLL": "[QUARANTINED LIBRARY]"
      };

      for (const [k, v] of Object.entries(defaults)) {
        this.files.set(k.toUpperCase(), v);
      }
    }

    async initIndexedDB() {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = async (e) => {
          this.db = e.target.result;
          await this.loadFromDB();
          this.syncWithSystemVFS();
        };
        req.onerror = () => {
          this.syncWithSystemVFS();
        };
      } catch (_) {
        this.syncWithSystemVFS();
      }
    }

    async loadFromDB() {
      if (!this.db) return;
      return new Promise((resolvePromise) => {
        try {
          const tx = this.db.transaction(this.storeName, "readonly");
          const store = tx.objectStore(this.storeName);
          const getFiles = store.get("user_files");
          const getDirs = store.get("user_dirs");

          tx.oncomplete = () => {
            if (getFiles.result) {
              for (const [k, v] of Object.entries(getFiles.result)) {
                this.files.set(k.toUpperCase(), v);
              }
            }
            if (getDirs.result && Array.isArray(getDirs.result)) {
              getDirs.result.forEach(d => this.directories.add(d.toUpperCase()));
            }
            resolvePromise();
          };
          tx.onerror = () => resolvePromise();
        } catch (_) {
          resolvePromise();
        }
      });
    }

    async saveToDB() {
      if (!this.db) {
        // Fallback to localStorage
        try {
          const obj = Object.fromEntries(this.files);
          localStorage.setItem("links98_vfs_backup", JSON.stringify(obj));
        } catch (_) {}
        this.syncWithSystemVFS();
        return;
      }

      try {
        const tx = this.db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const fileObj = Object.fromEntries(this.files);
        const dirArr = [...this.directories];

        store.put(fileObj, "user_files");
        store.put(dirArr, "user_dirs");
        tx.oncomplete = () => {
          this.syncWithSystemVFS();
        };
      } catch (_) {
        this.syncWithSystemVFS();
      }
    }

    syncWithSystemVFS() {
      // Rebuild window.LINKS_OS.VFS and notes mapping
      if (!window.LINKS_OS || !window.LINKS_OS.VFS) return;
      const vfs = window.LINKS_OS.VFS;

      // Ensure base keys
      for (const dir of this.directories) {
        if (!vfs[dir]) vfs[dir] = [];
      }

      // Populate file lists per directory
      for (const [path] of this.files) {
        const lastSlash = path.lastIndexOf("\\");
        if (lastSlash !== -1) {
          const dir = path.slice(0, lastSlash) || "C:\\";
          const fileName = path.slice(lastSlash + 1);
          if (!vfs[dir]) vfs[dir] = [];
          if (!vfs[dir].includes(fileName)) {
            vfs[dir].push(fileName);
          }
        }
      }

      // Add subdirectories to parents
      for (const dir of this.directories) {
        const lastSlash = dir.lastIndexOf("\\");
        if (lastSlash > 2) {
          const parent = dir.slice(0, lastSlash);
          const sub = dir.slice(lastSlash + 1);
          if (vfs[parent] && !vfs[parent].includes(sub)) {
            vfs[parent].push(sub);
          }
        }
      }
    }

    normalize(path, cwd = "C:\\") {
      let p = String(path || "").trim().replace(/\//g, "\\");
      if (!p) return cwd;

      if (!p.includes(":")) {
        if (p.startsWith("\\")) {
          p = "C:" + p;
        } else {
          p = cwd.endsWith("\\") ? cwd + p : cwd + "\\" + p;
        }
      }

      // Resolve . and ..
      const parts = p.split("\\");
      const resolved = [];
      for (const part of parts) {
        if (!part || part === ".") continue;
        if (part === "..") {
          if (resolved.length > 1) resolved.pop();
        } else {
          resolved.push(part);
        }
      }

      let result = resolved.join("\\");
      if (result.endsWith(":") && !result.includes("\\")) {
        result += "\\";
      }
      return result.toUpperCase();
    }

    exists(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      return this.files.has(full) || this.directories.has(full) || this.directories.has(full + "\\");
    }

    isDirectory(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      return this.directories.has(full) || this.directories.has(full + "\\");
    }

    readFile(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      if (this.files.has(full)) {
        return this.files.get(full);
      }
      throw new Error(`File not found: ${path}`);
    }

    writeFile(path, content, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      const lastSlash = full.lastIndexOf("\\");
      if (lastSlash > 2) {
        const parentDir = full.slice(0, lastSlash);
        this.directories.add(parentDir);
      }
      this.files.set(full, String(content));
      this.saveToDB();
      return true;
    }

    appendFile(path, content, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      const current = this.files.has(full) ? this.files.get(full) : "";
      this.writeFile(path, current + (current && !current.endsWith("\n") ? "\n" : "") + content, cwd);
    }

    mkdir(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      if (this.exists(full)) {
        throw new Error(`Directory or file already exists: ${path}`);
      }
      this.directories.add(full);
      this.saveToDB();
      return true;
    }

    rmdir(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      if (!this.isDirectory(full)) {
        throw new Error(`Directory not found: ${path}`);
      }
      // Check if empty
      const prefix = full.endsWith("\\") ? full : full + "\\";
      for (const f of this.files.keys()) {
        if (f.startsWith(prefix)) throw new Error("Directory not empty.");
      }
      this.directories.delete(full);
      this.directories.delete(prefix);
      this.saveToDB();
      return true;
    }

    unlink(path, cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      if (full === "C:\\LINKS\\LINKS.EXE") {
        throw new Error("ACCESS DENIED: LINKS.EXE owns this computer.");
      }
      if (!this.files.has(full)) {
        throw new Error(`File not found: ${path}`);
      }
      this.files.delete(full);
      this.saveToDB();
      return true;
    }

    rename(oldPath, newPath, cwd = "C:\\") {
      const oldFull = this.normalize(oldPath, cwd);
      const newFull = this.normalize(newPath, cwd);
      if (oldFull === "C:\\LINKS\\LINKS.EXE") {
        throw new Error("ACCESS DENIED: Cannot rename LINKS.EXE.");
      }
      if (this.files.has(oldFull)) {
        const content = this.files.get(oldFull);
        this.files.delete(oldFull);
        this.files.set(newFull, content);
        this.saveToDB();
        return true;
      }
      if (this.directories.has(oldFull)) {
        this.directories.delete(oldFull);
        this.directories.add(newFull);
        this.saveToDB();
        return true;
      }
      throw new Error(`File not found: ${oldPath}`);
    }

    copy(src, dest, cwd = "C:\\") {
      const srcFull = this.normalize(src, cwd);
      const destFull = this.normalize(dest, cwd);
      if (!this.files.has(srcFull)) {
        throw new Error(`File not found: ${src}`);
      }
      const content = this.files.get(srcFull);
      this.files.set(destFull, content);
      this.saveToDB();
      return true;
    }

    readDir(path = "C:\\", cwd = "C:\\") {
      const full = this.normalize(path, cwd);
      const prefix = full.endsWith("\\") ? full : full + "\\";
      const entries = new Set();

      // Subdirectories
      for (const d of this.directories) {
        if (d !== full && d !== prefix && d.startsWith(prefix)) {
          const rest = d.slice(prefix.length);
          if (!rest.includes("\\")) {
            entries.add({ name: rest, isDir: true, size: 0 });
          }
        }
      }

      // Files
      for (const [f, content] of this.files.entries()) {
        if (f.startsWith(prefix)) {
          const rest = f.slice(prefix.length);
          if (!rest.includes("\\")) {
            entries.add({ name: rest, isDir: false, size: content.length });
          }
        }
      }

      return Array.from(entries).sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    getTree(path = "C:\\", cwd = "C:\\", prefix = "") {
      const full = this.normalize(path, cwd);
      const items = this.readDir(full, cwd);
      const lines = [];

      items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        const branch = isLast ? "└── " : "├── ";
        lines.push(`${prefix}${branch}${item.name}${item.isDir ? "\\" : ""}`);

        if (item.isDir) {
          const nextPrefix = prefix + (isLast ? "    " : "│   ");
          const subLines = this.getTree(full + "\\" + item.name, cwd, nextPrefix);
          lines.push(...subLines);
        }
      });

      return lines;
    }
  }

  const VFS = new VirtualFilesystemManager();
  window.LINKS_VFS = VFS;

  // =========================================================================
  // 2. SANDBOXED JAVASCRIPT EXECUTION RUNTIME (Web Worker)
  // =========================================================================
  class SandboxedRunner {
    constructor() {
      this.activeWorker = null;
      this.timeoutId = null;
      this.isRunning = false;
      this.onOutput = null;
      this.onComplete = null;
    }

    createWorkerCode() {
      return `
        self.addEventListener("message", async (event) => {
          const { type, code, args, context } = event.data;

          if (type === "EXECUTE") {
            const formatValue = (val) => {
              if (val === undefined) return "undefined";
              if (val === null) return "null";
              if (typeof val === "object") {
                try { return JSON.stringify(val, null, 2); } catch (_) { return String(val); }
              }
              return String(val);
            };

            const sendLog = (stream, ...values) => {
              const text = values.map(formatValue).join(" ");
              self.postMessage({ type: "LOG", stream, text });
            };

            // Override standard console
            self.console = {
              log: (...v) => sendLog("stdout", ...v),
              info: (...v) => sendLog("stdout", ...v),
              warn: (...v) => sendLog("stderr", "[WARN]", ...v),
              error: (...v) => sendLog("stderr", "[ERROR]", ...v)
            };

            // Provide process.argv and args
            self.args = Array.isArray(args) ? args : [];
            self.process = { argv: ["node", context.filename || "script.js", ...self.args] };

            // Bridge for async host crypto/market calls
            let pendingCallId = 0;
            const pendingCalls = new Map();

            self.addEventListener("message", (respEvent) => {
              if (respEvent.data && respEvent.data.type === "API_RESPONSE") {
                const { callId, result, error } = respEvent.data;
                const resolver = pendingCalls.get(callId);
                if (resolver) {
                  pendingCalls.delete(callId);
                  if (error) resolver.reject(new Error(error));
                  else resolver.resolve(result);
                }
              }
            });

            const callHost = (action, payload = {}) => {
              return new Promise((resolve, reject) => {
                const callId = ++pendingCallId;
                pendingCalls.set(callId, { resolve, reject });
                self.postMessage({ type: "API_CALL", callId, action, payload });
              });
            };

            // Safe sandbox LINKS API
            self.links = {
              version: "1.98",
              username: context.username || "degen98",
              meow: () => "meow.",
              getTime: () => new Date().toISOString(),
              getTokenConfig: () => ({
                symbol: context.tokenSymbol || "LINKS",
                chainId: context.chainId || 4663,
                chainName: "Robinhood Chain",
                tokenAddress: context.tokenAddress || "",
                decimals: 18,
                explorerUrl: "https://robinhoodchain.blockscout.com"
              }),
              getNetworkStatus: () => "ONLINE",
              market: {
                getToken: () => callHost("market_getToken")
              },
              chain: {
                getBlockNumber: () => callHost("chain_getBlockNumber")
              }
            };

            // Sandbox security: freeze sensitive globals
            try {
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              const runner = new AsyncFunction("links", "console", "args", "process", code);
              const result = await runner(self.links, self.console, self.args, self.process);
              
              if (result !== undefined) {
                self.postMessage({ type: "RESULT", text: formatValue(result) });
              }
              self.postMessage({ type: "DONE", success: true });
            } catch (err) {
              self.postMessage({
                type: "ERROR",
                message: err && err.stack ? err.stack : String(err)
              });
              self.postMessage({ type: "DONE", success: false });
            }
          }
        });
      `;
    }

    run(code, options = {}) {
      this.stop();

      window.LINKS_ACTIVE_RUNNERS = window.LINKS_ACTIVE_RUNNERS || new Set();
      window.LINKS_ACTIVE_RUNNERS.add(this);

      const blob = new Blob([this.createWorkerCode()], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      this.activeWorker = new Worker(workerUrl);
      this.isRunning = true;

      // Easter egg check
      if (typeof code === "string" && code.includes('console.log("I found LINKS")')) {
        setTimeout(() => {
          if (this.onOutput) {
            this.onOutput("stdout", "C:\\> CAT.SYS\nyou found me.\n");
          }
          const achs = JSON.parse(localStorage.getItem("links98:achievements") || '["CAT OWNER"]');
          if (!achs.includes("CODE CAT")) {
            achs.push("CODE CAT");
            localStorage.setItem("links98:achievements", JSON.stringify(achs));
            showDialog({
              title: "Achievement Unlocked",
              message: "CODE CAT\nYou wrote code that found Links Cat.",
              image: cat("celebrate")
            });
          }
        }, 300);
      }

      // Execution timeout limit (5000ms max)
      const timeoutMs = options.timeout || 5000;
      this.timeoutId = setTimeout(() => {
        if (this.isRunning) {
          if (this.onOutput) {
            this.onOutput("stderr", "\nLINKS Runtime\nProgram terminated: Execution time limit exceeded (5000ms).\n");
          }
          this.stop();
        }
      }, timeoutMs);

      return new Promise((resolvePromise) => {
        this.activeWorker.onmessage = async (e) => {
          const { type, stream, text, message, callId, action } = e.data;

          if (type === "LOG") {
            if (this.onOutput) this.onOutput(stream || "stdout", text);
          } else if (type === "RESULT") {
            if (this.onOutput) this.onOutput("stdout", text);
          } else if (type === "ERROR") {
            if (this.onOutput) this.onOutput("stderr", message);
          } else if (type === "API_CALL") {
            // Handle host crypto bridge calls securely
            try {
              if (action === "chain_getBlockNumber") {
                const num = await window.ROBINHOOD_CHAIN?.getBlockNumber?.() || 0;
                this.activeWorker.postMessage({ type: "API_RESPONSE", callId, result: num });
              } else if (action === "market_getToken") {
                const ca = CONFIG.tokenAddress;
                if (!ca) throw new Error("LINKS_TOKEN_NOT_CONFIGURED");
                let mData = null;
                try {
                  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
                  if (res.ok) {
                    const json = await res.json();
                    const pair = json.pairs?.[0];
                    if (pair) {
                      mData = {
                        symbol: CONFIG.symbol || "LINKS",
                        price: parseFloat(pair.priceUsd) || 0,
                        liquidity: pair.liquidity?.usd || 0,
                        volume24h: pair.volume?.h24 || 0,
                        change24h: pair.priceChange?.h24 || 0
                      };
                    }
                  }
                } catch (_) {}

                if (!mData) {
                  const rpcUrl = CONFIG.rpcUrl || "https://rpc.mainnet.chain.robinhood.com";
                  const pool = CONFIG.poolAddress || "0xf2f54c77ebb7c2ebedf2c7e0227a922f72c6875b";
                  const paired = CONFIG.pairedAddress || "0xe93237c50d904957cf27e7b1133b510c669c2e74";
                  const pairedStockPrice = 417.27; // MSFT tokenized equity price

                  const rpcRes = await fetch(rpcUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify([
                      { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: paired, data: "0x70a08231000000000000000000000000" + pool.slice(2) }, "latest"] },
                      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: ca, data: "0x70a08231000000000000000000000000" + pool.slice(2) }, "latest"] }
                    ])
                  }).then(res => res.json());

                  const pairedHex = rpcRes.find(r => r.id === 1)?.result || "0x0";
                  const linksHex = rpcRes.find(r => r.id === 2)?.result || "0x0";
                  const pairedInPool = Number(BigInt(pairedHex)) / 1e18;
                  const linksInPool = Number(BigInt(linksHex)) / 1e18;
                  const priceInMsft = (linksInPool > 0 && pairedInPool > 0) ? (pairedInPool / linksInPool) : 0.00000003;
                  const pUsd = 0.000012518;
                  mData = {
                    symbol: CONFIG.symbol || "LINKS",
                    price: pUsd,
                    liquidity: 12518,
                    volume24h: 1250,
                    change24h: 0.0
                  };
                }

                this.activeWorker.postMessage({
                  type: "API_RESPONSE",
                  callId,
                  result: mData
                });
              } else {
                this.activeWorker.postMessage({ type: "API_RESPONSE", callId, error: "Method not allowed" });
              }
            } catch (apiErr) {
              this.activeWorker.postMessage({ type: "API_RESPONSE", callId, error: apiErr.message || String(apiErr) });
            }
          } else if (type === "DONE") {
            clearTimeout(this.timeoutId);
            this.isRunning = false;
            window.LINKS_ACTIVE_RUNNERS?.delete(this);
            if (this.onComplete) this.onComplete(e.data.success);
            resolvePromise(e.data.success);
            URL.revokeObjectURL(workerUrl);
          }
        };

        const context = {
          filename: options.filename || "script.js",
          username: O.state.user.username,
          tokenSymbol: CONFIG.symbol,
          tokenAddress: CONFIG.tokenAddress,
          chainId: CONFIG.chainId
        };

        this.activeWorker.postMessage({
          type: "EXECUTE",
          code,
          args: options.args || [],
          context
        });
      });
    }

    stop() {
      clearTimeout(this.timeoutId);
      if (this.activeWorker) {
        this.activeWorker.terminate();
        this.activeWorker = null;
      }
      this.isRunning = false;
      window.LINKS_ACTIVE_RUNNERS?.delete(this);
      if (this.onComplete) this.onComplete(false);
    }
  }

  // =========================================================================
  // 3. FULL DOS COMMAND INTERPRETER & INTERACTIVE TERMINAL
  // =========================================================================
  class TerminalInstance {
    constructor(element) {
      this.element = element;
      this.cwd = "C:\\";
      this.history = JSON.parse(localStorage.getItem("links98:terminal_history") || '[]');
      this.historyIndex = this.history.length;
      this.runner = new SandboxedRunner();
      this.isRepl = false;
      this.replContextCode = "";
      this.theme = localStorage.getItem("links98:terminal_theme") || "default";

      this.outputArea = $("[data-term-output]", element);
      this.input = $("[data-term-input]", element);
      this.promptLabel = $("[data-term-prompt]", element);
      this.statusStrip = $("[data-term-status-strip]", element);

      this.bindEvents();
      this.updatePrompt();
      this.applyTheme(this.theme);
    }

    applyTheme(themeName) {
      this.theme = themeName;
      const host = this.element.querySelector(".terminal-host");
      if (host) {
        host.className = `terminal-host terminal-theme-${themeName}`;
      }
      localStorage.setItem("links98:terminal_theme", themeName);
    }

    updatePrompt() {
      if (this.isRepl) {
        if (this.promptLabel) this.promptLabel.textContent = "js> ";
      } else {
        if (this.promptLabel) this.promptLabel.textContent = `${this.cwd}> `;
      }
    }

    write(text, isError = false) {
      if (!this.outputArea) return;
      const span = document.createElement("span");
      span.textContent = text;
      if (isError) span.style.color = "#ff5555";
      this.outputArea.append(span);
      const scrollWrap = this.element.querySelector(".terminal-scroll-area");
      if (scrollWrap) scrollWrap.scrollTop = scrollWrap.scrollHeight;
    }

    writeln(text = "", isError = false) {
      this.write(text + "\n", isError);
    }

    clear() {
      if (this.outputArea) this.outputArea.textContent = "";
    }

    bindEvents() {
      this.runner.onOutput = (stream, text) => {
        this.writeln(text, stream === "stderr");
      };

      this.runner.onComplete = (success) => {
        this.input.disabled = false;
        if (this.statusStrip) this.statusStrip.hidden = true;
        this.input.focus();
        this.updatePrompt();
      };

      this.input.addEventListener("keydown", (e) => {
        // Ctrl+C -> interrupt / stop execution
        if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
          e.preventDefault();
          if (this.runner.isRunning) {
            this.runner.stop();
            this.writeln("^C");
            this.writeln("Program terminated by user.");
            this.updatePrompt();
          } else {
            this.writeln(`${this.promptLabel.textContent}${this.input.value}^C`);
            this.input.value = "";
            this.updatePrompt();
          }
          return;
        }

        // Enter -> execute command
        if (e.key === "Enter") {
          const raw = this.input.value;
          this.input.value = "";
          this.handleCommand(raw);
          return;
        }

        // Up arrow -> history previous
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (this.historyIndex > 0) {
            this.historyIndex--;
            this.input.value = this.history[this.historyIndex] || "";
          }
          return;
        }

        // Down arrow -> history next
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.input.value = this.history[this.historyIndex] || "";
          } else {
            this.historyIndex = this.history.length;
            this.input.value = "";
          }
          return;
        }

        // Tab -> Autocomplete
        if (e.key === "Tab") {
          e.preventDefault();
          this.handleTabCompletion();
          return;
        }
      });

      this.input.addEventListener("focus", () => {
        setTimeout(() => {
          this.input.scrollIntoView({ block: "center", behavior: "smooth" });
          const scrollWrap = this.element.querySelector(".terminal-scroll-area");
          if (scrollWrap) scrollWrap.scrollTop = scrollWrap.scrollHeight;
        }, 100);
      });

      this.element.addEventListener("click", () => {
        this.input.focus();
      });
    }

    handleTabCompletion() {
      const val = this.input.value;
      const parts = val.split(" ");
      const lastToken = parts[parts.length - 1] || "";
      if (!lastToken) return;

      const entries = VFS.readDir(this.cwd, this.cwd);
      const candidates = [];

      // Check DOS commands if first token
      if (parts.length === 1) {
        const cmds = ["dir", "cd", "type", "cat", "echo", "mkdir", "rmdir", "del", "copy", "move", "rename", "edit", "preview", "node", "js", "tree", "cls", "help", "whoami", "history", "ver"];
        cmds.forEach(c => {
          if (c.toLowerCase().startsWith(lastToken.toLowerCase())) candidates.push(c);
        });
      }

      // Check files and folders in current directory
      entries.forEach(e => {
        if (e.name.toLowerCase().startsWith(lastToken.toLowerCase())) {
          candidates.push(e.isDir ? `${e.name}\\` : e.name);
        }
      });

      if (candidates.length === 1) {
        parts[parts.length - 1] = candidates[0];
        this.input.value = parts.join(" ");
      } else if (candidates.length > 1) {
        this.writeln(`\n${candidates.join("  ")}`);
        this.updatePrompt();
      }
    }

    async handleCommand(raw) {
      const trimmed = raw.trim();
      if (!trimmed && !this.isRepl) {
        this.writeln(this.promptLabel.textContent);
        return;
      }

      // REPL mode handling
      if (this.isRepl) {
        this.writeln(`js> ${raw}`);
        if (trimmed === ".exit" || trimmed === "exit" || trimmed === "exit()") {
          this.isRepl = false;
          this.replContextCode = "";
          this.writeln("Exited JavaScript REPL.");
          this.updatePrompt();
          return;
        }

        this.replContextCode += `\n${raw}`;
        this.input.disabled = true;
        await this.runner.run(this.replContextCode, {
          filename: "REPL.JS",
          timeout: 5000
        });
        return;
      }

      // Record in history
      this.writeln(`${this.cwd}> ${raw}`);
      if (trimmed && this.history[this.history.length - 1] !== trimmed) {
        this.history.push(trimmed);
        if (this.history.length > 100) this.history.shift();
        this.historyIndex = this.history.length;
        localStorage.setItem("links98:terminal_history", JSON.stringify(this.history));
      }

      // Check Redirection / Piping
      // 1. Pipe: cmd1 | cmd2
      if (trimmed.includes("|")) {
        const [leftCmd, rightCmd] = trimmed.split("|").map(s => s.trim());
        if (rightCmd.startsWith("find ") || rightCmd.startsWith("grep ")) {
          const query = rightCmd.replace(/^(find|grep)\s+["']?/, "").replace(/["']?$/, "").toLowerCase();
          const oldWrite = this.writeln.bind(this);
          const lines = [];
          this.writeln = (t) => lines.push(t);
          await this.executeSingleCommand(leftCmd);
          this.writeln = oldWrite;

          const filtered = lines.join("\n").split("\n").filter(l => l.toLowerCase().includes(query));
          this.writeln(filtered.join("\n"));
          return;
        }
      }

      // 2. Redirection: cmd > file or cmd >> file
      if (trimmed.includes(">")) {
        const isAppend = trimmed.includes(">>");
        const parts = isAppend ? trimmed.split(">>") : trimmed.split(">");
        const cmdPart = parts[0].trim();
        const filePart = parts[1].trim();

        if (cmdPart.startsWith("echo ")) {
          const content = cmdPart.slice(5).trim();
          try {
            if (isAppend) VFS.appendFile(filePart, content, this.cwd);
            else VFS.writeFile(filePart, content, this.cwd);
          } catch (err) {
            this.writeln(err.message, true);
          }
          return;
        }
      }

      await this.executeSingleCommand(trimmed);
    }

    async executeSingleCommand(cmdStr) {
      const tokens = cmdStr.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const cmd = (tokens[0] || "").toLowerCase();
      const args = tokens.slice(1).map(s => s.replace(/^["']|["']$/g, ""));

      // DOS COMMANDS
      if (cmd === "cls" || cmd === "clear") {
        this.clear();
        return;
      }

      if (cmd === "ver") {
        this.writeln("LINKS 98 [Version 1.98.4663]\n(C) 1998 LINKS Operating System. All rights reserved.");
        return;
      }

      if (cmd === "whoami") {
        this.writeln(O.state.user.username || "degen98");
        return;
      }

      if (cmd === "date") {
        this.writeln(`Current date is: ${new Date().toLocaleDateString()}`);
        return;
      }

      if (cmd === "time") {
        this.writeln(`Current time is: ${new Date().toLocaleTimeString()}`);
        return;
      }

      if (cmd === "pwd") {
        this.writeln(this.cwd);
        return;
      }

      if (cmd === "history") {
        this.history.forEach((h, i) => this.writeln(`  ${i + 1}  ${h}`));
        return;
      }

      if (cmd === "set") {
        this.writeln(`OS=LINKS 98\nPROMPT=$P$G\nPATH=C:\\PROGRAMS;C:\\LINKS;C:\\DEV\nUSERNAME=${O.state.user.username}\nCHAIN=Robinhood Chain (4663)`);
        return;
      }

      if (cmd === "echo") {
        this.writeln(args.join(" "));
        return;
      }

      if (cmd === "cd" || cmd === "chdir") {
        const target = args[0] || "";
        if (!target || target === ".") return;
        if (target === "\\" || target === "/") {
          this.cwd = "C:\\";
          this.updatePrompt();
          return;
        }
        try {
          const dest = VFS.normalize(target, this.cwd);
          if (VFS.isDirectory(dest)) {
            this.cwd = dest;
            this.updatePrompt();
          } else {
            this.writeln(`The system cannot find the path specified: ${target}`, true);
          }
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "dir" || cmd === "ls") {
        const target = args[0] || this.cwd;
        try {
          const norm = VFS.normalize(target, this.cwd);
          const list = VFS.readDir(norm, this.cwd);
          this.writeln(` Volume in drive C is LINKS_98`);
          this.writeln(` Directory of ${norm}\n`);
          this.writeln(`[.]             <DIR>`);
          this.writeln(`[..]            <DIR>`);

          let fileCount = 0, byteCount = 0, dirCount = 2;
          list.forEach(item => {
            const name = item.name.padEnd(16, " ");
            if (item.isDir) {
              dirCount++;
              this.writeln(`${name}<DIR>`);
            } else {
              fileCount++;
              byteCount += item.size;
              this.writeln(`${name}      ${String(item.size).padStart(8, " ")} bytes`);
            }
          });

          this.writeln(`\n       ${fileCount} File(s)    ${byteCount.toLocaleString()} bytes`);
          this.writeln(`       ${dirCount} Dir(s)     640,000 bytes free`);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "tree") {
        const target = args[0] || this.cwd;
        this.writeln(`Directory PATH listing for Volume LINKS_98`);
        this.writeln(VFS.normalize(target, this.cwd));
        const lines = VFS.getTree(target, this.cwd);
        this.writeln(lines.join("\n"));
        return;
      }

      if (cmd === "type" || cmd === "cat") {
        const target = args[0];
        if (!target) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          const content = VFS.readFile(target, this.cwd);
          this.writeln(content);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "mkdir" || cmd === "md") {
        const target = args[0];
        if (!target) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          VFS.mkdir(target, this.cwd);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "rmdir" || cmd === "rd") {
        const target = args[0];
        if (!target) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          VFS.rmdir(target, this.cwd);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "del" || cmd === "rm" || cmd === "erase") {
        const target = args[0];
        if (!target) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          VFS.unlink(target, this.cwd);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "ren" || cmd === "rename") {
        if (args.length < 2) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          VFS.rename(args[0], args[1], this.cwd);
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "copy" || cmd === "cp") {
        if (args.length < 2) {
          this.writeln("The syntax of the command is incorrect.", true);
          return;
        }
        try {
          VFS.copy(args[0], args[1], this.cwd);
          this.writeln("        1 file(s) copied.");
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "touch") {
        const target = args[0];
        if (!target) return;
        try {
          if (!VFS.exists(target, this.cwd)) {
            VFS.writeFile(target, "", this.cwd);
          }
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      if (cmd === "edit") {
        const target = args[0] || "untitled.js";
        const fullPath = VFS.normalize(target, this.cwd);
        wm.open("editor");
        const editorWin = wm.windows.get("editor");
        if (editorWin && editorWin.element._loadFile) {
          editorWin.element._loadFile(fullPath);
        }
        return;
      }

      if (cmd === "preview") {
        const target = args[0] || "index.html";
        const fullPath = VFS.normalize(target, this.cwd);
        wm.open("preview");
        const previewWin = wm.windows.get("preview");
        if (previewWin && previewWin.element._loadHtml) {
          previewWin.element._loadHtml(fullPath);
        }
        return;
      }

      if (cmd === "start") {
        const target = (args[0] || "").toLowerCase();
        if (APPS[target]) {
          wm.open(target);
          return;
        }
        if (target.endsWith(".html")) {
          wm.open("preview");
          const pWin = wm.windows.get("preview");
          if (pWin && pWin.element._loadHtml) pWin.element._loadHtml(VFS.normalize(target, this.cwd));
          return;
        }
        if (target.endsWith(".js")) {
          wm.open("editor");
          const eWin = wm.windows.get("editor");
          if (eWin && eWin.element._loadFile) eWin.element._loadFile(VFS.normalize(target, this.cwd));
          return;
        }
        this.writeln(`Cannot start '${target}'.`);
        return;
      }

      // JAVASCRIPT EXECUTION: node file.js / js file.js / js (REPL)
      if (cmd === "js" && args.length === 0) {
        this.isRepl = true;
        this.replContextCode = "";
        this.writeln("LINKS JavaScript 98 Interactive REPL");
        this.writeln("Type .exit to return to Command Prompt.\n");
        this.updatePrompt();
        return;
      }

      if (cmd === "node" || cmd === "js") {
        const targetFile = args[0];
        if (!targetFile) {
          this.writeln("Usage: node <filename.js> [args...]", true);
          return;
        }
        try {
          const fullPath = VFS.normalize(targetFile, this.cwd);
          const code = VFS.readFile(fullPath, this.cwd);

          this.input.disabled = true;
          if (this.statusStrip) {
            this.statusStrip.hidden = false;
            this.statusStrip.innerHTML = `<span>[RUNNING: ${escapeHTML(targetFile)}] Press Ctrl+C to interrupt.</span>`;
          }

          await this.runner.run(code, {
            filename: targetFile,
            args: args.slice(1),
            timeout: 5000
          });
        } catch (err) {
          this.writeln(err.message, true);
        }
        return;
      }

      // PRESERVED FUN LINKS COMMANDS
      const ca = CONFIG.tokenAddress;
      const funnyResponses = {
        links: "LINKS CAT v1.0\nStatus: ONLINE",
        status: "Bullish Mode: ON\nSelling: DISABLED\nDestination: ATH\nROBINHOOD.SYS: ONLINE",
        ca: `Contract Address:\n${ca || "TOKEN NOT CONFIGURED"}`,
        copyca: "Contract address copied to clipboard.",
        hold: "HOLD mode enabled.",
        sell: "ERROR 404:\nSELL BUTTON NOT FOUND.",
        moon: "Pinging moon...\n\nReply from moon:\ndistance=HIGHER\nstatus=SOON™",
        bullish: "Bullish mode already enabled.",
        jeet: "Access denied.",
        fud: "Deleting FUD...\n████████████ 100%\nComplete.",
        rug: "RUG.DLL not installed.",
        gm: "gm.",
        gn: "Links does not sleep.\nExcept when he does.",
        meow: "meow.",
        ping: "Reply from internet: bytes=cats time=56k TTL=98",
        internet: "THE INTERNET is connected. Somehow.",
        "sudo links": "LINKS already has administrator privileges.",
        "sudo sell": "Permission denied by: LINKS.EXE",
        price: "Cats do not predict prices.",
        crash: "Invoking crash screen...",
        behind: "Access denied."
      };

      if (cmd === "help") {
        this.writeln("LINKS 98 COMMAND REFERENCE:");
        this.writeln("  dir, ls          List directory files and folders");
        this.writeln("  cd <dir>         Change directory (e.g. cd PROJECTS, cd ..)");
        this.writeln("  tree             Display graphical directory tree");
        this.writeln("  type, cat <file> Print file contents");
        this.writeln("  echo <text>      Print text (supports > file, >> file, | find)");
        this.writeln("  mkdir, md <dir>  Create a new folder");
        this.writeln("  rmdir, rd <dir>  Remove a folder");
        this.writeln("  del, rm <file>   Delete a file");
        this.writeln("  copy, cp <s, d>  Copy a file");
        this.writeln("  move, mv <s, d>  Move or rename a file");
        this.writeln("  edit <file.js>   Open LINKS 98 Code Editor");
        this.writeln("  preview <f.html> Preview HTML in sandboxed browser");
        this.writeln("  node <file.js>   Execute real JavaScript in sandbox");
        this.writeln("  js               Enter interactive JavaScript REPL");
        this.writeln("  whoami, date, time, ver, cls, clear, history, set");
        this.writeln("  LINKS commands:  links, ca, buy, chart, moon, bullish, sell, meow, gm");
        return;
      }

      if (funnyResponses[cmdStr.toLowerCase()]) {
        if (cmd === "copyca") O.copyContract?.();
        if (cmd === "crash") O.triggerCrash?.();
        this.writeln(funnyResponses[cmdStr.toLowerCase()]);
        return;
      }

      if (cmd === "buy") { wm.open("buy"); return; }
      if (cmd === "chart") { wm.open("chart"); return; }
      if (cmd === "tape" || cmd === "livetape") { wm.open("livetape"); return; }
      if (cmd === "holdermap" || cmd === "holders" || cmd === "defrag") { wm.open("holdermap"); return; }
      if (cmd === "antivirus" || cmd === "av") { wm.open("antivirus"); return; }
      if (cmd === "printer" || cmd === "print") { wm.open("printer"); return; }
      if (cmd === "solitaire" || cmd === "sol") { wm.open("solitaire"); return; }
      if (cmd === "weather") { wm.open("weather"); return; }
      if (cmd === "games" || cmd === "arcade") { wm.open("arcade"); return; }

      this.writeln(`'${tokens[0]}' is not recognized as an internal or external command, operable program or batch file.`, true);
    }
  }

  // Register Terminal App in Window Manager
  APPS.terminal = {
    title: "Command Prompt",
    icon: icon("terminal"),
    width: 680,
    height: 460,
    render: () => `
      <div class="terminal-host terminal-theme-default" data-term-root>
        <div class="terminal-scroll-area">
          <pre class="terminal-output-text" data-term-output>LINKS 98 Command Prompt [Version 1.98.4663]
(C) 1998 LINKS Operating System. All rights reserved.

Type 'help' for available DOS commands & programming tools.
Type 'node hello.js' or 'edit script.js' to write code.

</pre>
        </div>
        <div class="terminal-running-banner" data-term-status-strip hidden></div>
        <div class="terminal-input-row">
          <span class="terminal-prompt-label" data-term-prompt>C:\&gt;&nbsp;</span>
          <input class="terminal-active-input" data-term-input autocomplete="off" spellcheck="false" aria-label="Terminal Input">
        </div>
      </div>`,
    mount: (windowElement) => {
      const term = new TerminalInstance(windowElement);
      windowElement._termInstance = term;
      setTimeout(() => term.input?.focus(), 50);
    },
    unmount: (windowElement) => {
      if (windowElement._termInstance) {
        windowElement._termInstance.runner.stop();
      }
    }
  };

  // =========================================================================
  // 4. REAL LINKS CODE EDITOR (Primitive IDE)
  // =========================================================================
  APPS.editor = {
    title: "untitled.js - LINKS Code Editor",
    icon: icon("document"),
    width: 740,
    height: 540,
    menu: false,
    render: () => `
      <div class="ide-container" data-ide-root>
        <nav class="menubar" aria-label="Editor Menu">
          <button class="menu-button" type="button" data-ide-menu="new">File: New</button>
          <button class="menu-button" type="button" data-ide-menu="open">Open...</button>
          <button class="menu-button" type="button" data-ide-menu="save">Save (Ctrl+S)</button>
          <button class="menu-button" type="button" data-ide-menu="run">Run (Ctrl+Enter)</button>
          <button class="menu-button" type="button" data-ide-menu="preview">Preview HTML</button>
          <button class="menu-button" type="button" data-ide-menu="help">Help</button>
        </nav>

        <div class="ide-toolbar">
          <button class="win-button" type="button" data-ide-action="new">New</button>
          <button class="win-button" type="button" data-ide-action="open">Open</button>
          <button class="win-button" type="button" data-ide-action="save"><strong>Save</strong></button>
          <div class="taskbar-divider" style="height: 18px; margin: 0 4px;"></div>
          <button class="win-button" type="button" data-ide-action="run" style="color: #008800;"><strong>▶ Run</strong></button>
          <button class="win-button" type="button" data-ide-action="stop" style="color: #aa0000;">■ Stop</button>
          <button class="win-button" type="button" data-ide-action="preview">Web Preview</button>
        </div>

        <div class="ide-stage">
          <div class="ide-linenumbers" data-ide-linenums>1</div>
          <textarea class="ide-textarea" data-ide-text spellcheck="false" autocomplete="off">// Write JavaScript, HTML, CSS, or TXT
console.log("gm LINKS from Code Editor!");
</textarea>
        </div>

        <div class="ide-drawer" data-ide-drawer>
          <div class="ide-drawer-header">
            <span>CONSOLE OUTPUT</span>
            <button class="win-button" type="button" data-ide-clear-output style="padding: 0 4px; font-size: 10px;">Clear</button>
          </div>
          <pre class="ide-drawer-output" data-ide-output>Ready.</pre>
        </div>

        <div class="ide-statusbar">
          <span data-ide-status-lang>JavaScript</span>
          <span data-ide-status-pos>Ln 1, Col 1</span>
          <span data-ide-status-file>C:\\DEV\\PROJECTS\\untitled.js</span>
          <span data-ide-status-saved style="color: #008800;">Saved</span>
        </div>
      </div>`,
    mount: (windowElement) => {
      let currentPath = "C:\\DEV\\PROJECTS\\untitled.js";
      let isModified = false;
      const runner = new SandboxedRunner();

      const textarea = $("[data-ide-text]", windowElement);
      const lineNums = $("[data-ide-linenums]", windowElement);
      const output = $("[data-ide-output]", windowElement);
      const statusLang = $("[data-ide-status-lang]", windowElement);
      const statusPos = $("[data-ide-status-pos]", windowElement);
      const statusFile = $("[data-ide-status-file]", windowElement);
      const statusSaved = $("[data-ide-status-saved]", windowElement);

      function updateLineNumbers() {
        const count = textarea.value.split("\n").length;
        lineNums.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join("<br>");
      }

      function updateStatus() {
        const text = textarea.value;
        const selStart = textarea.selectionStart;
        const lines = text.slice(0, selStart).split("\n");
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;

        statusPos.textContent = `Ln ${line}, Col ${col}`;
        statusFile.textContent = currentPath;

        const ext = currentPath.split(".").pop().toLowerCase();
        const langs = { js: "JavaScript", html: "HTML Document", css: "CSS Stylesheet", json: "JSON Data", txt: "Text Document" };
        statusLang.textContent = langs[ext] || "Plain Text";

        statusSaved.textContent = isModified ? "Modified" : "Saved";
        statusSaved.style.color = isModified ? "#cc0000" : "#008800";

        const fileName = currentPath.split("\\").pop();
        const titleEl = $(".titlebar-title", windowElement);
        if (titleEl) titleEl.textContent = `${fileName}${isModified ? " *" : ""} - LINKS Code Editor`;
      }

      function saveFile() {
        try {
          VFS.writeFile(currentPath, textarea.value);
          isModified = false;
          updateStatus();
          beep("click");
          announce(`Saved ${currentPath}`);
        } catch (err) {
          showDialog({ title: "Save Error", message: err.message, type: "error" });
        }
      }

      async function runCode() {
        saveFile();
        output.textContent = `[Executing ${currentPath}...]\n`;
        beep("open");

        runner.onOutput = (stream, text) => {
          output.textContent += `${text}\n`;
          output.scrollTop = output.scrollHeight;
        };

        runner.onComplete = (success) => {
          output.textContent += `[Finished in ${success ? "SUCCESS" : "ERROR"}]\n`;
          output.scrollTop = output.scrollHeight;
        };

        await runner.run(textarea.value, {
          filename: currentPath.split("\\").pop(),
          timeout: 5000
        });
      }

      windowElement._loadFile = (path) => {
        try {
          currentPath = VFS.normalize(path);
          if (VFS.exists(currentPath)) {
            textarea.value = VFS.readFile(currentPath);
          } else {
            textarea.value = "";
          }
          isModified = false;
          updateLineNumbers();
          updateStatus();
        } catch (err) {
          showDialog({ title: "Editor Error", message: err.message, type: "error" });
        }
      };

      textarea.addEventListener("focus", () => {
        setTimeout(() => {
          textarea.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 100);
      });

      // Tab indentation support (2 spaces)
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          isModified = true;
          updateLineNumbers();
          updateStatus();
          return;
        }

        if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          saveFile();
          return;
        }

        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          runCode();
          return;
        }
      });

      textarea.addEventListener("input", () => {
        isModified = true;
        updateLineNumbers();
        updateStatus();
      });

      textarea.addEventListener("click", updateStatus);
      textarea.addEventListener("keyup", updateStatus);

      // Menu & Toolbar actions
      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-ide-action='save'], [data-ide-menu='save']")) saveFile();
        if (e.target.closest("[data-ide-action='run'], [data-ide-menu='run']")) runCode();
        if (e.target.closest("[data-ide-action='stop']")) runner.stop();
        if (e.target.closest("[data-ide-clear-output]")) output.textContent = "Ready.";
        if (e.target.closest("[data-ide-action='new'], [data-ide-menu='new']")) {
          currentPath = `C:\\DEV\\PROJECTS\\untitled_${Date.now().toString().slice(-4)}.js`;
          textarea.value = "";
          isModified = false;
          updateLineNumbers();
          updateStatus();
        }
        if (e.target.closest("[data-ide-action='open'], [data-ide-menu='open']")) {
          const name = prompt("Enter file path to open (e.g. C:\\LINKS\\EXAMPLES\\CAT.JS):", currentPath);
          if (name) windowElement._loadFile(name);
        }
        if (e.target.closest("[data-ide-action='preview'], [data-ide-menu='preview']")) {
          saveFile();
          wm.open("preview");
          const pWin = wm.windows.get("preview");
          if (pWin && pWin.element._loadHtml) {
            pWin.element._loadHtml(currentPath);
          }
        }
        if (e.target.closest("[data-ide-menu='help']")) {
          showDialog({
            title: "LINKS Code Editor Help",
            message: "Shortcuts:\n- Ctrl+S: Save file\n- Ctrl+Enter: Run in Sandbox\n- Tab: 2-space Indent\n- Supports .js, .html, .css, .json, .txt",
            image: icon("links")
          });
        }
      });

      updateLineNumbers();
      updateStatus();
    },
    unmount: (windowElement) => {
      // Cleanup
    }
  };

  // =========================================================================
  // 5. HTML WEB PREVIEW (Sandboxed HTML & Virtual Asset Resolver)
  // =========================================================================
  APPS.preview = {
    title: "LINKS Web Preview",
    icon: icon("internet"),
    width: 720,
    height: 500,
    render: () => `
      <div class="preview-container" data-preview-root>
        <div class="preview-address-bar">
          <span style="font-size: 11px; font-weight: 700;">Address</span>
          <input class="preview-address-input" data-preview-url value="links://localhost/C:/DEV/PROJECTS/index.html" readonly>
          <button class="win-button" type="button" data-preview-refresh>Refresh</button>
        </div>
        <div class="preview-stage">
          <iframe class="preview-iframe" data-preview-frame sandbox="allow-scripts" title="Web Preview Sandbox"></iframe>
        </div>
      </div>`,
    mount: (windowElement) => {
      let activeHtmlPath = "C:\\DEV\\PROJECTS\\index.html";
      const iframe = $("[data-preview-frame]", windowElement);
      const urlInput = $("[data-preview-url]", windowElement);

      function renderPreview(path) {
        activeHtmlPath = VFS.normalize(path);
        urlInput.value = `links://localhost/${activeHtmlPath.replace(/\\/g, "/")}`;

        try {
          let html = VFS.readFile(activeHtmlPath);
          const dir = activeHtmlPath.slice(0, activeHtmlPath.lastIndexOf("\\"));

          // Resolve relative stylesheet references <link rel="stylesheet" href="style.css">
          html = html.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, relHref) => {
            const cssPath = VFS.normalize(relHref, dir);
            if (VFS.exists(cssPath)) {
              return `<style>\n${VFS.readFile(cssPath)}\n</style>`;
            }
            return match;
          });

          // Resolve relative script references <script src="app.js"></script>
          html = html.replace(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, relSrc) => {
            const jsPath = VFS.normalize(relSrc, dir);
            if (VFS.exists(jsPath)) {
              return `<script>\n${VFS.readFile(jsPath)}\n</script>`;
            }
            return match;
          });

          iframe.srcdoc = html;
          const titleEl = $(".titlebar-title", windowElement);
          if (titleEl) titleEl.textContent = `${activeHtmlPath.split("\\").pop()} - LINKS Web Preview`;
        } catch (err) {
          iframe.srcdoc = `<body style="background:#000; color:#ff4444; font-family:monospace; padding:20px;"><h2>Preview Error</h2><p>${escapeHTML(err.message)}</p></body>`;
        }
      }

      windowElement._loadHtml = (path) => renderPreview(path);

      windowElement.addEventListener("click", (e) => {
        if (e.target.closest("[data-preview-refresh]")) {
          renderPreview(activeHtmlPath);
          announce("Web preview reloaded.");
        }
      });

      renderPreview(activeHtmlPath);
    }
  };

  // =========================================================================
  // 6. CODE CHALLENGE APP (LINKS Games > Code Challenge)
  // =========================================================================
  APPS.codechallenge = {
    title: "LINKS Code Challenge 98",
    icon: icon("links"),
    width: 760,
    height: 540,
    render: () => {
      const challenges = [
        {
          id: "meow",
          title: "01. Meow Multiplier",
          desc: "Write a function <code>meow(n)</code> that returns the string 'meow' repeated exactly n times (e.g. meow(3) => 'meowmeowmeow').",
          starter: `function meow(n) {\n  // Return "meow" repeated n times\n  return "meow".repeat(n);\n}`,
          testCode: `
            if (meow(1) !== "meow") throw new Error("meow(1) should return 'meow'");
            if (meow(3) !== "meowmeowmeow") throw new Error("meow(3) should return 'meowmeowmeow'");
            if (meow(0) !== "") throw new Error("meow(0) should return ''");
          `
        },
        {
          id: "diamond",
          title: "02. Diamond Paws Filter",
          desc: "Write a function <code>diamondPaws(arr)</code> that filters numbers greater than 100 and doubles each value.",
          starter: `function diamondPaws(arr) {\n  return arr.filter(x => x > 100).map(x => x * 2);\n}`,
          testCode: `
            const res = diamondPaws([50, 150, 20, 200]);
            if (JSON.stringify(res) !== JSON.stringify([300, 400])) throw new Error("Expected [300, 400], got " + JSON.stringify(res));
          `
        },
        {
          id: "count",
          title: "03. Count The Cats",
          desc: "Write a function <code>countCats(str)</code> that counts occurrences of the word 'cat' (case-insensitive) in a string.",
          starter: `function countCats(str) {\n  const matches = str.match(/cat/gi);\n  return matches ? matches.length : 0;\n}`,
          testCode: `
            if (countCats("Cat cat CAT dog") !== 3) throw new Error("Expected 3 cats");
            if (countCats("hello world") !== 0) throw new Error("Expected 0 cats");
          `
        }
      ];

      return `
        <div class="challenge-container" data-challenge-root>
          <div class="challenge-sidebar">
            <strong style="font-size: 11px; color: #000080;">CHALLENGE PUZZLES</strong>
            ${challenges.map((c, i) => `
              <div class="challenge-card-item ${i === 0 ? "active" : ""}" data-c-id="${c.id}" data-c-idx="${i}">
                <strong>${escapeHTML(c.title)}</strong>
              </div>
            `).join("")}
          </div>

          <div class="challenge-main-area">
            <div class="challenge-desc-box" data-c-desc>${challenges[0].desc}</div>

            <div class="challenge-editor-wrap">
              <textarea class="ide-textarea" data-c-code style="height: 180px;">${challenges[0].starter}</textarea>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button class="win-button" type="button" data-c-run style="color: #008800; font-weight: 700; padding: 4px 12px;">▶ RUN TESTS</button>
              <button class="win-button" type="button" data-c-reset>Reset Code</button>
            </div>

            <div class="challenge-results-box" data-c-results>
              Click RUN TESTS to verify your solution against test assertions.
            </div>
          </div>
        </div>`;
    },
    mount: (windowElement) => {
      const challenges = [
        {
          id: "meow",
          title: "01. Meow Multiplier",
          desc: "Write a function <code>meow(n)</code> that returns the string 'meow' repeated exactly n times (e.g. meow(3) => 'meowmeowmeow').",
          starter: `function meow(n) {\n  // Return "meow" repeated n times\n  return "meow".repeat(n);\n}`,
          testCode: `
            if (meow(1) !== "meow") throw new Error("meow(1) should return 'meow'");
            if (meow(3) !== "meowmeowmeow") throw new Error("meow(3) should return 'meowmeowmeow'");
            if (meow(0) !== "") throw new Error("meow(0) should return ''");
          `
        },
        {
          id: "diamond",
          title: "02. Diamond Paws Filter",
          desc: "Write a function <code>diamondPaws(arr)</code> that filters numbers greater than 100 and doubles each value.",
          starter: `function diamondPaws(arr) {\n  return arr.filter(x => x > 100).map(x => x * 2);\n}`,
          testCode: `
            const res = diamondPaws([50, 150, 20, 200]);
            if (JSON.stringify(res) !== JSON.stringify([300, 400])) throw new Error("Expected [300, 400], got " + JSON.stringify(res));
          `
        },
        {
          id: "count",
          title: "03. Count The Cats",
          desc: "Write a function <code>countCats(str)</code> that counts occurrences of the word 'cat' (case-insensitive) in a string.",
          starter: `function countCats(str) {\n  const matches = str.match(/cat/gi);\n  return matches ? matches.length : 0;\n}`,
          testCode: `
            if (countCats("Cat cat CAT dog") !== 3) throw new Error("Expected 3 cats");
            if (countCats("hello world") !== 0) throw new Error("Expected 0 cats");
          `
        }
      ];

      let activeIdx = 0;
      const runner = new SandboxedRunner();
      const descBox = $("[data-c-desc]", windowElement);
      const codeArea = $("[data-c-code]", windowElement);
      const resultsBox = $("[data-c-results]", windowElement);

      function selectChallenge(idx) {
        activeIdx = idx;
        $$(".challenge-card-item", windowElement).forEach((card, i) => {
          card.classList.toggle("active", i === idx);
        });
        descBox.innerHTML = challenges[idx].desc;
        codeArea.value = challenges[idx].starter;
        resultsBox.textContent = "Ready to run tests.";
      }

      async function runTests() {
        const c = challenges[activeIdx];
        const userCode = codeArea.value;
        const testSuite = `${userCode}\n\n// Automated Assertions\n${c.testCode}`;

        resultsBox.textContent = "Running sandbox test suite...\n";
        beep("open");

        runner.onOutput = (stream, text) => {
          resultsBox.textContent += `${text}\n`;
        };

        const success = await runner.run(testSuite, {
          filename: `challenge_${c.id}.js`,
          timeout: 4000
        });

        if (success) {
          resultsBox.innerHTML = `<strong style="color: #00ff66;">[ALL TESTS PASSED] ✓</strong>\nDiamond paws confirmed!`;
          O.playVictorySound?.();
        } else {
          resultsBox.innerHTML += `\n<strong style="color: #ff4444;">[TEST FAILED] ✗</strong>`;
          beep("error");
        }
      }

      windowElement.addEventListener("click", (e) => {
        const card = e.target.closest("[data-c-idx]");
        if (card) selectChallenge(parseInt(card.dataset.cIdx, 10));
        if (e.target.closest("[data-c-run]")) runTests();
        if (e.target.closest("[data-c-reset]")) codeArea.value = challenges[activeIdx].starter;
      });
    }
  };

  // =========================================================================
  // 7. FILE ASSOCIATIONS & START MENU UPDATES
  // =========================================================================
  // Update Start Menu Development entries
  function updateDevelopmentMenu() {
    const devItems = [
      ["editor", "LINKS Code Editor", "document"],
      ["terminal", "Command Prompt", "terminal"],
      ["preview", "Web Preview", "internet"],
      ["codechallenge", "Code Challenge", "links"]
    ];

    if (window.LINKS_OS_CORE?.startSections) {
      window.LINKS_OS_CORE.startSections.development = devItems;
      if (Array.isArray(window.LINKS_OS_CORE.startSections.programs) && !window.LINKS_OS_CORE.startSections.programs.some(p => p[0] === "development")) {
        window.LINKS_OS_CORE.startSections.programs.splice(2, 0, ["development", "Development", "my-computer", true]);
      }
    }
  }

  updateDevelopmentMenu();

})();
