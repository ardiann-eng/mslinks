(() => {
  "use strict";

  const registry = Object.freeze({
    default: "assets/cats/sit.png",
    fallback: "assets/cats/sit.png",
    happy: "assets/cats/reactions/celebrating.png",
    confident: "assets/cats/reactions/confident.png",
    concerned: "assets/cats/reactions/concerned.png",
    shocked: "assets/cats/reactions/shocked.png",
    sleeping: "assets/cats/sleep-side.png",
    computer: "assets/cats/computer.png",
    pointing: "assets/cats/point.png",
    icon: "assets/icons/links.png",
  });

  const iconRegistry = Object.freeze({
    "live-tape": "assets/icons/links98/live-tape.png",
    solitaire: "assets/icons/links98/solitaire.png",
    "my-profile": "assets/icons/links98/my-profile.png",
    "holder-map": "assets/icons/links98/holder-map.png",
    "weather-98": "assets/icons/links98/weather-98.png",
    printers: "assets/icons/links98/printers.png",
    "links-games": "assets/icons/links98/links-games.png",
    "links-exe": "assets/icons/links98/links-exe.png",
    "buy-links": "assets/icons/links98/buy-links.png",
    "links-chart": "assets/icons/links98/links-chart.png",
    "antivirus-98": "assets/icons/links98/antivirus-98.png",
    wallet: "assets/icons/links98/wallet.png",
    downloads: "assets/icons/links98/downloads.png",
    "links-radio": "assets/icons/links98/links-radio.png",
    "paint-98": "assets/icons/links98/paint-98.png",
    "token-contract": "assets/icons/links98/token-contract.png",
    "links-market": "assets/icons/links98/links-market.png",
    "links-online": "assets/icons/links98/links-online.png",
    notepad: "assets/icons/links98/notepad.png",
    "code-editor": "assets/icons/links98/code-editor.png",
    editor: "assets/icons/links98/editor.png",
    folder: "assets/icons/folder.png",
    rugsweeper: "assets/icons/links98/rugsweeper.png",
    winamp: "assets/icons/links98/winamp.png",
    catchat: "assets/icons/links98/catchat.png",
    "cat-pet": "assets/icons/links98/cat-pet.png",
  });

  const appIconRegistry = Object.freeze({
    livetape: iconRegistry["live-tape"], solitaire: iconRegistry.solitaire,
    profile: iconRegistry["my-profile"], holdermap: iconRegistry["holder-map"],
    weather: iconRegistry["weather-98"], printer: iconRegistry.printers,
    arcade: iconRegistry["links-games"], links: iconRegistry["links-exe"],
    buy: iconRegistry["buy-links"], chart: iconRegistry["links-chart"],
    antivirus: iconRegistry["antivirus-98"],
    linksmarket: iconRegistry["links-market"],
    linksonline: iconRegistry["links-online"],
    notepad: iconRegistry.notepad,
    editor: iconRegistry.editor,
    rugsweeper: iconRegistry.rugsweeper,
    winamp: iconRegistry.winamp,
    media: iconRegistry.winamp,
    catchat: iconRegistry.catchat,
    icq: iconRegistry.catchat,
    pet: iconRegistry["cat-pet"],
  });

  const dialogAssets = Object.freeze({
    success: registry.happy,
    bullish: registry.confident,
    hodl: registry.confident,
    warning: registry.concerned,
    error: registry.shocked,
    sleep: registry.sleeping,
    shutdown: registry.sleeping,
    computer: registry.computer,
    terminal: registry.computer,
    generic: registry.default,
  });

  const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  function normalizeSource(source) {
    if (typeof source !== "string") return "";
    const value = source.trim();
    if (!value || value === "undefined" || value === "null") return "";
    return value.replace(/(\.[a-z0-9]+)(?:\1)+(?=([?#]|$))/i, "$1");
  }

  function inferDialogType({ type, title = "", message = "" } = {}) {
    if (type && dialogAssets[type]) return type;
    const text = `${title} ${message}`.toLowerCase();
    if (/sleep|shutdown|shut down|safe to hold/.test(text)) return "sleep";
    if (/terminal|computer|command|run\b/.test(text)) return "computer";
    if (/error|cannot|can't|failed|denied|crash|not recognized/.test(text)) return "error";
    if (/warning|warn|concern|caution/.test(text)) return "warning";
    if (/hodl|hold mode|bullish/.test(text)) return "hodl";
    if (/success|complete|completed|copied|ready/.test(text)) return "success";
    return "generic";
  }

  function resolve(source, options = {}) {
    const normalized = normalizeSource(source);
    if (normalized) return registry[normalized] || normalized;
    const type = inferDialogType(options);
    return dialogAssets[type] || registry.fallback;
  }

  function fallbackFor(image) {
    return resolve(image.dataset.linksFallback) || registry.fallback;
  }

  function guard(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.linksFallbackFailed === "true") return;
    const source = normalizeSource(image.getAttribute("src"));
    if (!source) image.src = fallbackFor(image);
    else if (source !== image.getAttribute("src")) image.src = source;
  }

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const fallback = fallbackFor(image);
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      console.warn(`[LINKS assets] Missing image: ${normalizeSource(image.getAttribute("src"))}`);
    }
    if (image.dataset.linksFallbackApplied === "true" || normalizeSource(image.getAttribute("src")) === fallback) {
      image.dataset.linksFallbackFailed = "true";
      image.style.visibility = "hidden";
      image.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      return;
    }
    image.dataset.linksFallbackApplied = "true";
    image.src = fallback;
  }, true);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") guard(record.target);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("img")) guard(node);
        node.querySelectorAll("img").forEach(guard);
      }
    }
  });

  const startGuard = () => {
    document.querySelectorAll("img").forEach(guard);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startGuard, { once: true });
  else startGuard();

  function LinksImage({
    src,
    type,
    title,
    message,
    alt = "",
    className = "",
    fallback = registry.fallback,
    objectFit = "contain",
    pixelated = true,
  } = {}) {
    const resolved = resolve(src, { type, title, message });
    const classes = ["links-image", className].filter(Boolean).join(" ");
    const style = `object-fit:${objectFit};image-rendering:${pixelated ? "pixelated" : "auto"}`;
    return `<img src="${escapeAttribute(resolved)}" alt="${escapeAttribute(alt)}" class="${escapeAttribute(classes)}" data-links-fallback="${escapeAttribute(resolve(fallback))}" style="${style}">`;
  }

  window.LINKS_ASSETS = registry;
  window.LINKS_ASSETS_API = Object.freeze({
    LinksImage,
    icons: iconRegistry,
    appIcons: appIconRegistry,
    resolveAppIcon: (appId, fallback = registry.icon) => appIconRegistry[appId] || resolve(fallback),
    inferDialogType,
    resolve,
    resolveDialog: (options = {}) => resolve(options.image, { ...options, type: inferDialogType(options) }),
  });
})();
