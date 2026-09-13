/**
 * LINKS 98 Centralized Token Configuration
 * 
 * Token launches through PONS on Robinhood Chain.
 * If tokenAddress is empty, applications display "TOKEN NOT CONFIGURED".
 */
const LINKS_CONFIG = {
  chainId: 4663,
  chainName: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",

  tokenAddress: "0xb30c24a564e649ce7dca9f5549b870e8ef4b70d2",
  symbol: "LINKS",
  decimals: 18,

  ponsUrl: "https://www.ponsfamily.com/launchpad/0xb30c24a564e649ce7dca9f5549b870e8ef4b70d2",
  buyUrl: "https://www.ponsfamily.com/launchpad/0xb30c24a564e649ce7dca9f5549b870e8ef4b70d2",
  poolAddress: "0xf2f54c77ebb7c2ebedf2c7e0227a922f72c6875b",
  pairedAsset: "MSFT",
  pairedAddress: "0xe93237c50d904957cf27e7b1133b510c669c2e74",
  launchBlock: 61593941,

  // Additional settings
  largeTradeEthThreshold: 0.5,
  xUrl: "https://x.com/linksrh"
};

// Expose globally
window.LINKS_CONFIG = LINKS_CONFIG;

// Compatibility aliases for existing references
Object.defineProperties(window.LINKS_CONFIG, {
  TOKEN_NAME: { get() { return window.LINKS_CONFIG.symbol ? `$${window.LINKS_CONFIG.symbol}` : "$LINKS"; } },
  CONTRACT_ADDRESS: { get() { return window.LINKS_CONFIG.tokenAddress || ""; } },
  BUY_URL: { get() { return window.LINKS_CONFIG.buyUrl || window.LINKS_CONFIG.ponsUrl || ""; } },
  X_URL: { get() { return window.LINKS_CONFIG.xUrl || "https://x.com"; } },
  CHART_URL: { get() { return window.LINKS_CONFIG.tokenAddress ? `${window.LINKS_CONFIG.explorerUrl}/token/${window.LINKS_CONFIG.tokenAddress}` : ""; } },
  EXPLORER_URL: { get() { return window.LINKS_CONFIG.explorerUrl || "https://robinhoodchain.blockscout.com"; } }
});

// TOKEN_CONFIG legacy object proxying to LINKS_CONFIG
window.TOKEN_CONFIG = new Proxy(window.LINKS_CONFIG, {
  get(target, prop) {
    if (prop === "contractAddress") return target.tokenAddress;
    if (prop === "chain") return "robinhood";
    if (prop === "name") return "Links Cat";
    if (prop in target) return target[prop];
    return undefined;
  },
  set(target, prop, value) {
    if (prop === "contractAddress") { target.tokenAddress = value; return true; }
    target[prop] = value;
    return true;
  }
});

