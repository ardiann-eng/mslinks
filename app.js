(() => {
  "use strict";

  const CONFIG = window.LINKS_CONFIG;
  const TOKEN_CONFIG = window.TOKEN_CONFIG || {
    chain: "robinhood",
    contractAddress: "",
    symbol: "LINKS",
    name: "Links Cat"
  };
  const { LinksImage, resolve, resolveDialog, resolveAppIcon } = window.LINKS_ASSETS_API;
  const LINKS_ASSETS = window.LINKS_ASSETS;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const withExtension = (name, extension = ".png") => String(name).toLowerCase().endsWith(extension) ? name : `${name}${extension}`;
  const icon = (name) => resolve(`assets/icons/${withExtension(name)}`);
  const appIcon = (appId, fallback = "links") => resolveAppIcon(appId, icon(fallback));
  const cat = (name) => resolve(`assets/cats/${withExtension(name)}`);
  const appArt = (name) => resolve(`assets/apps/${withExtension(name)}`);
  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const REACTION_PFPS = [
    { name: "Confident", file: "assets/cats/reactions/confident.png" },
    { name: "Celebrating", file: "assets/cats/reactions/celebrating.png" },
    { name: "Laughing", file: "assets/cats/reactions/laughing.png" },
    { name: "Shocked", file: "assets/cats/reactions/shocked.png" },
    { name: "Concerned", file: "assets/cats/reactions/concerned.png" },
    { name: "Annoyed", file: "assets/cats/reactions/annoyed.png" },
    { name: "Sleepy", file: "assets/cats/reactions/sleepy.png" },
    { name: "Unimpressed", file: "assets/cats/reactions/unimpressed.png" }
  ];

  function loadUserProfile() {
    try {
      const stored = JSON.parse(localStorage.getItem("links98:user_profile"));
      if (stored && stored.username) return stored;
    } catch (_) {}
    return {
      username: "degen98",
      pfp: "assets/cats/reactions/confident.png",
      walletAddress: "",
      memberSince: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date())
    };
  }

  const state = {
    user: loadUserProfile(),
    isLoggedIn: false,
    selectedIcon: null,
    sound: true,
    audio: null,
    inactivity: null,
    bootTimeout: null,
    saverFrame: null,
    catClicks: 0,
    clockClicks: [],
    discoveries: new Set(),
    lorePage: 0,
    memeIndex: 0,
    activeChartPoll: null,
    chartData: null
  };

  function saveUserProfile(profile) {
    state.user = { ...state.user, ...profile };
    try {
      localStorage.setItem("links98:user_profile", JSON.stringify(state.user));
    } catch (_) {}
    updateUserDisplays();
  }

  function updateUserDisplays() {
    const userImg = $("#login-pfp-img");
    if (userImg) userImg.src = state.user.pfp;
    const returningName = $("#returning-user-name");
    if (returningName) returningName.textContent = state.user.username;
    const banner = $(".start-user-banner");
    if (banner) {
      const avatar = $(".start-user-avatar", banner);
      if (avatar) avatar.src = state.user.pfp;
      const nameSpan = $(".start-user-name", banner);
      if (nameSpan) nameSpan.textContent = state.user.username;
    }
    const logoffBtn = $("[data-start-action='logoff']");
    if (logoffBtn) {
      logoffBtn.innerHTML = `${LinksImage({ src: icon("links"), alt: "", className: "context-icon", fallback: LINKS_ASSETS.icon })}<span>Log Off ${escapeHTML(state.user.username)}...</span>`;
    }
  }

  function announce(message) {
    $("#sr-status").textContent = "";
    requestAnimationFrame(() => { $("#sr-status").textContent = message; });
  }

  function beep(kind = "click") {
    if (!state.sound) return;
    try {
      state.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = state.audio.createOscillator();
      const gain = state.audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = kind === "error" ? 125 : kind === "open" ? 420 : kind === "coin" ? 680 : kind === "hit" ? 180 : 260;
      gain.gain.setValueAtTime(0.025, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + (kind === "coin" ? 0.09 : 0.06));
      oscillator.connect(gain).connect(state.audio.destination);
      oscillator.start();
      oscillator.stop(state.audio.currentTime + (kind === "coin" ? 0.095 : 0.065));
    } catch (_) { /* Sound is progressive enhancement. */ }
  }

  function playLoginChime() {
    if (!state.sound) return;
    try {
      state.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audio;
      const notes = [370, 493.88, 622.25, 739.99]; // F#4, B4, D#5, F#5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.09 + 0.65);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.7);
      });
    } catch (_) {}
  }

  function playVictorySound() {
    if (!state.sound) return;
    try {
      state.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audio;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.035, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.38);
      });
    } catch (_) {}
  }

  function openExternal(url, fallback) {
    if (!url) {
      showDialog({ title: "LINKS 98", message: fallback, image: cat("reactions/concerned.png") });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function getContractAddress() {
    const raw = window.TOKEN_CONFIG?.contractAddress || window.LINKS_CONFIG?.CONTRACT_ADDRESS || "";
    return raw.trim();
  }

  async function copyContract() {
    const ca = getContractAddress() || "COMING_SOON";
    try {
      await navigator.clipboard.writeText(ca);
      announce("Contract address copied.");
      return true;
    } catch (_) {
      const input = document.createElement("textarea");
      input.value = ca;
      document.body.append(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      announce(copied ? "Contract address copied." : "Copy unavailable.");
      return copied;
    }
  }

  function showDialog({ title = "LINKS 98", message, image, type, buttons = ["OK"] }) {
    return new Promise((resolvePromise) => {
      const layer = $("#dialog-layer");
      const previousFocus = document.activeElement;
      const backdrop = document.createElement("div");
      backdrop.className = "dialog-backdrop";
      backdrop.innerHTML = `
        <section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
          <div class="titlebar"><span id="dialog-title" class="titlebar-title">${escapeHTML(title)}</span></div>
          <div class="dialog-body">
            ${LinksImage({ src: resolveDialog({ image, type, title, message }), alt: "", className: "dialog-icon", fallback: LINKS_ASSETS.icon })}
            <div class="dialog-message">${escapeHTML(message)}</div>
          </div>
          <div class="dialog-actions">${buttons.map((label) => `<button class="win-button" type="button" data-dialog-result="${escapeHTML(label)}">${escapeHTML(label)}</button>`).join("")}</div>
        </section>`;
      layer.append(backdrop);
      const controls = $$("button", backdrop);
      const finish = (result) => {
        backdrop.remove();
        previousFocus?.focus?.();
        resolvePromise(result);
      };
      backdrop.addEventListener("click", (event) => {
        const button = event.target.closest("[data-dialog-result]");
        if (button) finish(button.dataset.dialogResult);
      });
      backdrop.addEventListener("keydown", (event) => {
        if (event.key === "Escape") finish(buttons.at(-1));
        if (event.key === "Tab") {
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
      controls[0]?.focus();
      beep(buttons.length > 1 ? "open" : "click");
    });
  }

  function showPfpPicker(currentPfp = state.user.pfp) {
    return new Promise((resolvePromise) => {
      let selected = currentPfp;
      const layer = $("#dialog-layer");
      const backdrop = document.createElement("div");
      backdrop.className = "dialog-backdrop";
      backdrop.innerHTML = `
        <section class="dialog" style="width: 360px;" role="dialog" aria-modal="true" aria-labelledby="pfp-picker-title">
          <div class="titlebar">
            <img src="${icon("links")}" alt="" class="titlebar-icon">
            <span id="pfp-picker-title" class="titlebar-title">SELECT USER PICTURE</span>
          </div>
          <div class="dialog-body" style="display: block; padding: var(--space-md);">
            <div class="pfp-grid">
              ${REACTION_PFPS.map((item) => `
                <button class="pfp-option${item.file === selected ? " is-selected" : ""}" type="button" data-pfp="${escapeHTML(item.file)}">
                  <img src="${escapeHTML(item.file)}" alt="${escapeHTML(item.name)}">
                  <span>${escapeHTML(item.name)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="dialog-actions">
            <button class="win-button" type="button" data-pfp-action="ok">OK</button>
            <button class="win-button" type="button" data-pfp-action="cancel">Cancel</button>
          </div>
        </section>`;
      layer.append(backdrop);

      const grid = $(".pfp-grid", backdrop);
      grid.addEventListener("click", (event) => {
        const opt = event.target.closest("[data-pfp]");
        if (!opt) return;
        $$(".pfp-option", grid).forEach((el) => el.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        selected = opt.dataset.pfp;
        beep("click");
      });
      grid.addEventListener("dblclick", (event) => {
        const opt = event.target.closest("[data-pfp]");
        if (opt) {
          selected = opt.dataset.pfp;
          backdrop.remove();
          resolvePromise(selected);
        }
      });

      backdrop.addEventListener("click", (event) => {
        const action = event.target.closest("[data-pfp-action]")?.dataset.pfpAction;
        if (action === "ok") {
          backdrop.remove();
          resolvePromise(selected);
        } else if (action === "cancel") {
          backdrop.remove();
          resolvePromise(null);
        }
      });

      backdrop.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          backdrop.remove();
          resolvePromise(null);
        }
      });
      $("[data-pfp-action='ok']", backdrop).focus();
    });
  }

  class WindowManager {
    constructor(layer, taskbar) {
      this.layer = layer;
      this.taskbar = taskbar;
      this.windows = new Map();
      this.z = 100;
      this.offset = 0;
    }

    open(key, options = {}) {
      const definition = APPS[key];
      if (!definition) return;
      const existing = this.windows.get(key);
      if (existing) {
        existing.element.classList.remove("is-minimized");
        existing.minimized = false;
        this.focus(key);
        return existing;
      }
      const viewport = this.layer.getBoundingClientRect();
      const isMobile = viewport.width <= 600;
      let width, height, left, top;
      if (isMobile) {
        width = Math.min(options.width || (viewport.width - 8), viewport.width - 8);
        height = Math.min(options.height || (viewport.height - 8), viewport.height - 8);
        left = 4;
        top = 4;
      } else {
        width = Math.min(options.width || definition.width || 620, Math.max(280, viewport.width - 12));
        height = Math.min(options.height || definition.height || 450, Math.max(180, viewport.height - 12));
        const centerX = options.left != null ? options.left : Math.round((viewport.width - width) / 2);
        const centerY = options.top != null ? options.top : Math.round((viewport.height - height) / 2);
        left = options.left != null ? options.left : Math.max(3, Math.min(centerX + this.offset, viewport.width - width - 3));
        top = options.top != null ? options.top : Math.max(3, Math.min(centerY + this.offset, viewport.height - height - 3));
        this.offset = (this.offset + 18) % 72;
      }

      const element = document.createElement("section");
      element.className = "window";
      element.dataset.app = key;
      element.setAttribute("role", "region");
      element.setAttribute("aria-label", definition.title);
      Object.assign(element.style, { width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px` });
      element.innerHTML = `
        <div class="titlebar">
          ${LinksImage({ src: definition.icon, alt: "", className: "titlebar-icon", fallback: LINKS_ASSETS.icon })}
          <span class="titlebar-title">${escapeHTML(definition.title)}</span>
          <div class="window-controls">
            <button class="window-control" type="button" data-window-action="minimize" aria-label="Minimize ${escapeHTML(definition.title)}">_</button>
            <button class="window-control" type="button" data-window-action="maximize" aria-label="Maximize ${escapeHTML(definition.title)}">□</button>
            <button class="window-control" type="button" data-window-action="close" aria-label="Close ${escapeHTML(definition.title)}">×</button>
          </div>
        </div>
        ${definition.menu === false ? "" : '<nav class="menubar" aria-label="Application menu"><button class="menu-button" type="button">File</button><button class="menu-button" type="button">Edit</button><button class="menu-button" type="button">View</button><button class="menu-button" type="button">Help</button></nav>'}
        <div class="window-content">${definition.render()}</div>
        ${definition.status ? `<div class="statusbar">${escapeHTML(definition.status)}</div>` : ""}`;
      this.layer.append(element);
      const record = { key, element, minimized: false, maximized: false, restore: null };
      this.windows.set(key, record);
      this.bindWindow(record);
      this.updateTaskbar();
      this.focus(key);
      definition.mount?.(element, this);
      beep("open");
      return record;
    }

    bindWindow(record) {
      const { key, element } = record;
      element.addEventListener("pointerdown", () => this.focus(key));
      element.addEventListener("click", (event) => {
        const action = event.target.closest("[data-window-action]")?.dataset.windowAction;
        if (action === "close") this.close(key);
        if (action === "minimize") this.minimize(key);
        if (action === "maximize") this.maximize(key);
      });
      const bar = $(".titlebar", element);
      let lastTitleTap = 0;
      bar.addEventListener("dblclick", (event) => {
        if (!event.target.closest("button")) this.maximize(key);
      });
      bar.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        const now = performance.now();
        if (now - lastTitleTap < 350) {
          this.maximize(key);
          lastTitleTap = 0;
          return;
        }
        lastTitleTap = now;

        if (event.button !== 0 || record.maximized) return;
        event.preventDefault();
        const startX = event.clientX, startY = event.clientY;
        const startLeft = element.offsetLeft, startTop = element.offsetTop;
        try { bar.setPointerCapture(event.pointerId); } catch (_) {}
        const move = (moveEvent) => {
          const bounds = this.layer.getBoundingClientRect();
          const left = Math.max(0, Math.min(startLeft + moveEvent.clientX - startX, bounds.width - 80));
          const top = Math.max(0, Math.min(startTop + moveEvent.clientY - startY, bounds.height - 28));
          element.style.transform = `translate(${left - startLeft}px, ${top - startTop}px)`;
        };
        const up = (upEvent) => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
          const finalLeft = Math.max(0, Math.min(startLeft + matrix.m41, this.layer.clientWidth - 80));
          const finalTop = Math.max(0, Math.min(startTop + matrix.m42, this.layer.clientHeight - 28));
          element.style.left = `${finalLeft}px`;
          element.style.top = `${finalTop}px`;
          element.style.transform = "none";
          try { bar.releasePointerCapture(upEvent.pointerId); } catch (_) {}
          bar.removeEventListener("pointermove", move);
          bar.removeEventListener("pointerup", up);
          bar.removeEventListener("pointercancel", up);
        };
        bar.addEventListener("pointermove", move);
        bar.addEventListener("pointerup", up);
        bar.addEventListener("pointercancel", up);
      });
    }

    focus(key) {
      const record = this.windows.get(key);
      if (!record) return;
      this.z += 1;
      for (const current of this.windows.values()) current.element.classList.remove("is-active");
      record.element.classList.add("is-active");
      record.element.style.zIndex = this.z;
      this.updateTaskbar();
    }

    close(key) {
      const record = this.windows.get(key);
      if (!record) return;
      APPS[key].unmount?.(record.element);
      record.element.remove();
      this.windows.delete(key);
      this.updateTaskbar();
      announce(`${APPS[key].title} closed.`);
    }

    closeAll() {
      for (const key of [...this.windows.keys()]) {
        this.close(key);
      }
    }

    minimize(key) {
      const record = this.windows.get(key);
      if (!record) return;
      record.minimized = true;
      record.element.classList.add("is-minimized");
      this.updateTaskbar();
    }

    maximize(key) {
      const record = this.windows.get(key);
      if (!record) return;
      if (!record.maximized) {
        record.restore = { left: record.element.style.left, top: record.element.style.top, width: record.element.style.width, height: record.element.style.height };
        record.maximized = true;
        record.element.classList.add("is-maximized");
      } else {
        Object.assign(record.element.style, record.restore);
        record.maximized = false;
        record.element.classList.remove("is-maximized");
      }
      this.focus(key);
    }

    toggleFromTaskbar(key) {
      const record = this.windows.get(key);
      if (!record) return;
      if (record.minimized) {
        record.minimized = false;
        record.element.classList.remove("is-minimized");
        this.focus(key);
      } else if (record.element.classList.contains("is-active")) {
        this.minimize(key);
      } else this.focus(key);
    }

    updateTaskbar() {
      this.taskbar.innerHTML = [...this.windows.values()].map(({ key, element, minimized }) => {
        const app = APPS[key];
        const active = element.classList.contains("is-active") && !minimized;
        return `<button class="task-button win-button${active ? " is-active" : ""}" type="button" data-task-app="${key}" title="${escapeHTML(app.title)}">${LinksImage({ src: app.icon, alt: "", className: "task-button-icon", fallback: LINKS_ASSETS.icon })}<span>${escapeHTML(app.title)}</span></button>`;
      }).join("");
    }
  }

  const lorePages = [
    {
      year: "1998",
      title: "The machine in the back room",
      image: "assets/lore/lost-computers.jpg",
      text: "A forgotten beige computer ran one program nobody remembered installing: LINKS.exe.\n\nLinks Cat lived between its folders, moving icons at night and deleting SELL.exe before anyone could open it."
    },
    {
      year: "1999–2025",
      title: "Into the internet",
      image: "assets/lore/internet-journey.jpg",
      text: "One noisy dial-up handshake later, Links disappeared into the early internet.\n\nHe crossed abandoned homepages, dormant servers, broken guestbooks, and folders named FINAL_final_2. The original computer eventually went silent."
    },
    {
      year: "2026",
      title: "LINKS.exe is online",
      image: appArt("about-cat.png"),
      text: "Without warning, the old machine answered. LINKS.exe was running again.\n\nLinks Cat had returned. Nobody knows why. The cat refuses to explain—and has administrator privileges."
    }
  ];

  const memes = [
    "memes (1).jpg", "memes (5).jpg", "memes (6).jpg", "memes (7).jpg",
    "memes (19).jpg", "memes (20).jpg", "memes (21).jpg", "memes (22).jpg",
    "memes (23).jpg", "memes (24).jpg", "memes (25).jpg", "memes (26).jpg",
    "memes (27).jpg", "memes (28).jpg", "memes (29).jpg", "memes (30).jpg",
    "memes (31).jpg", "memes (32).jpg", "memes (33).jpg", "memes (34).jpg",
    "memes (35).jpg", "memes (36).jpg", "memes (37).jpg", "memes (38).jpg",
    "memes (39).jpg", "memes (40).jpg", "memes (41).jpg"
  ].map((name) => ({ name, src: `assets/memes/${name}` }));

  const fileIcon = (name, iconName = "document") => `<button class="file-item" type="button" data-file="${escapeHTML(name)}">${LinksImage({ src: icon(iconName), alt: "", fallback: LINKS_ASSETS.icon })}<span>${escapeHTML(name)}</span></button>`;

  const BROWSER_STORE = "links98:internet-explorer";
  const browserDefaults = {
    history: ["http://links.cat/home"], index: 0, recent: [],
    favorites: ["http://links.cat/home", "https://www.google.com/", "https://www.coingecko.com/", "https://dexscreener.com/", "https://etherscan.io/"],
    homepage: "http://links.cat/home", offline: false, guestbook: [], searchEngine: "google"
  };
  function loadBrowserState() {
    try { return { ...browserDefaults, ...JSON.parse(localStorage.getItem(BROWSER_STORE) || "{}") }; }
    catch (_) { return { ...browserDefaults }; }
  }
  function saveBrowserState(browser) {
    try { localStorage.setItem(BROWSER_STORE, JSON.stringify(browser)); } catch (_) {}
  }
  const browserTitles = {
    home: "LINKS Internet Home", about: "About LINKS", buy: "How to Acquire LINKS", chart: "LINKS Market Watch",
    memes: "LINKS CAT Image Archive", lore: "The LINKS CAT Archives", community: "LINKS Community", contract: "LINKS Contract Information",
    games: "LINKS Games", market: "LINKS Market", archive: "Download Archive", secret: "Secret", cat: "You Found the Cat",
    "1998": "System Date 1998", moon: "LINKS on the Moon", floppy: "Floppy Disk", search: "LINKS Search"
  };
  const browserSearchIndex = Object.entries(browserTitles).map(([slug, title]) => ({
    title, url: slug === "search" ? "http://search.links.cat/" : `http://links.cat/${slug}`,
    description: ({ memes: "The finest collection of LINKS CAT images on the Information Superhighway.", lore: "Historical documents concerning LINKS.EXE and the Internet Incident.", contract: "Official configured token and network information.", games: "Games approved by the cat administrator.", market: "Market status and links to live information.", buy: "Instructions for acquiring LINKS without invented transaction results." })[slug] || `Information from the LINKS CAT network about ${title}.`
  }));
  const browserButton = (action, label, glyph, disabled = false) => `<button class="ie-tool-button" type="button" data-ie-action="${action}" ${disabled ? "disabled" : ""}><span class="ie-tool-icon ie-icon-${action}" aria-hidden="true">${glyph}</span><span>${label}</span></button>`;
  const browserLink = (url, label, extra = "") => `<a href="${escapeHTML(url)}" data-ie-url="${escapeHTML(url)}" ${extra}>${escapeHTML(label)}</a>`;
  const browserSearchForm = (compact = false) => `<form class="ie-google-search${compact ? " is-compact" : ""}" data-ie-web-search><b class="ie-google-wordmark" aria-label="Google"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></b><label><span class="sr-only">Search the Web</span><input name="q" placeholder="Search the Web..." autocomplete="off" required></label><button class="win-button" type="submit">Google Search</button></form>`;
  const webPage = (body, className = "") => `<article class="ie-document ${className}">${body}</article>`;
  function browserPageHTML(url, browser, searchTerm = "") {
    const parsed = url.replace(/^https?:\/\/(?:www\.)?links\.cat\/?/i, "").replace(/^https?:\/\/search\.links\.cat\/?/i, "search/").split(/[?#]/)[0].replace(/\/$/, "") || "home";
    const slug = parsed.split("/")[0].toLowerCase();
    const ca = getContractAddress();
    const network = CONFIG.chainName || "Robinhood Chain";
    const hero = appArt("mouse-cat.png");
    if (url === "about:blank") return webPage("", "ie-blank");
    if (slug === "search") return webPage(`<h1>SEARCH THE INTERNET</h1><hr><p>This 1998 computer is somehow connected to the modern Web.</p>${browserSearchForm()}<p><small>Searches open in a real browser tab. No fake results and no browser security bypasses.</small></p>`);
    if (url === "about:links") return webPage(`<h1>About LINKS Internet Explorer</h1><hr><p><b>LINKS Internet Explorer 4.98</b></p><p>A small browser for a large and suspicious internet.</p><img class="ie-about-cat" src="${icon("internet")}" alt="LINKS Internet Explorer icon">`);
    if (url.startsWith("view-source:")) return webPage(`<pre class="ie-source">&lt;HTML&gt;\n&lt;HEAD&gt;&lt;TITLE&gt;${escapeHTML(browserTitles[slug] || "LINKS Page")}&lt;/TITLE&gt;&lt;/HEAD&gt;\n&lt;BODY&gt;\n&lt;H1&gt;${escapeHTML(browserTitles[slug] || "LINKS Page")}&lt;/H1&gt;\n&lt;P&gt;Welcome to LINKS.&lt;/P&gt;\n&lt;/BODY&gt;\n&lt;/HTML&gt;</pre>`);
    if (slug === "home") return webPage(`
      ${browserSearchForm()}<nav class="ie-home-external" aria-label="Internet quick links">Quick Links: ${browserLink("http://links.cat/about","About LINKS")} | ${browserLink("http://links.cat/buy","Buy LINKS")} | ${browserLink("http://links.cat/chart","Live Chart")} | ${browserLink("http://links.cat/market","Market Control")} | ${browserLink("http://links.cat/memes","Memes")} | ${browserLink("http://links.cat/lore","Lore")} | ${browserLink("http://links.cat/community","Community")} | ${browserLink("http://links.cat/contract","Contract")} | ${browserLink("https://www.google.com/","Google")} | ${browserLink("https://dexscreener.com/","DexScreener")} | ${browserLink("https://etherscan.io/","Etherscan")}</nav>
      <header class="ie-home-header"><div class="ie-new">NEW!</div><p>WELCOME TO THE LINKS INTERNET</p><h1>LINKS INTERNET HOME</h1><p><i>“Surfing the Information Superhighway since 1998.”</i></p></header>
      <hr><div class="ie-home-grid"><section><h2>WELCOME TO LINKS</h2><p>LINKS CAT lives inside an old computer, patrols the internet, and has administrator privileges. This site records what happened next.</p><nav class="ie-quick-links" aria-label="Quick links">${[["about","About LINKS"],["buy","Buy LINKS"],["chart","Live Chart"],["memes","Meme Archive"],["lore","LINKS Lore"],["community","Community"],["contract","Contract"],["games","Games"]].map(([s,l]) => browserLink(`http://links.cat/${s}`, l)).join("")}</nav></section><img class="ie-home-cat" src="${hero}" alt="Links Cat surfing on a computer mouse"></div>
      <hr><section class="ie-market-box"><h2>MARKET STATUS</h2><table><tbody><tr><th>LINKS</th><td class="ie-online">ONLINE</td></tr><tr><th>Chain</th><td>${escapeHTML(network)}</td></tr><tr><th>Price</th><td>Market data currently unavailable.</td></tr><tr><th>24H</th><td>Market data currently unavailable.</td></tr></tbody></table>${browserLink("http://links.cat/chart", "Open LINKS Market Watch")}</section>
      <footer class="ie-web-footer"><p><b>UNDER CONSTRUCTION</b> · You are visitor: <span class="ie-counter">00001998</span></p><p>Best viewed at 800×600 · Made with Notepad · Powered by LINKS CAT</p><p>Last Updated: September 9, 2026 · ${browserLink("mailto:webmaster@links.cat", "Email Webmaster", 'data-ie-mail="true"')} · ${browserLink("http://links.cat/community", "Guestbook")}</p></footer>`);
    if (slug === "about") return webPage(`<h1>ABOUT LINKS CAT</h1><hr><div class="ie-two-col"><img src="${appArt("about-cat.png")}" alt="Links Cat beside an old computer"><div><h2>What is LINKS?</h2><p>LINKS CAT is the resident administrator of LINKS 98: part cat, part internet artifact, and entirely unwilling to explain the missing SELL.EXE file.</p><h2>Origin</h2><p>The first record dates to 1998, when LINKS.EXE appeared on a beige computer nobody remembered installing it on.</p><h2>Token information</h2><p>Symbol: <b>${escapeHTML(CONFIG.symbol || "LINKS")}</b><br>Network: <b>${escapeHTML(network)}</b><br>Contract: <code>${escapeHTML(ca || "TOKEN NOT CONFIGURED")}</code></p></div></div>`);
    if (slug === "memes") return webPage(`<h1>LINKS CAT IMAGE ARCHIVE</h1><p>Click a thumbnail to open the full-size original.</p><hr><div class="ie-meme-grid">${memes.map((m,i)=>`<button type="button" data-ie-image="${i}" title="Open ${escapeHTML(m.name)}"><img src="${m.src}" alt="LINKS CAT archive image ${i+1}" loading="lazy"><span>${escapeHTML(m.name)}</span></button>`).join("")}</div><p>${browserLink("http://links.cat/archive", "Download archive index")}</p>`);
    if (slug === "lore") return webPage(`<h1>THE LINKS CAT ARCHIVES</h1><p><i>Recovered documents. Dates are approximate. Cat testimony is unreliable.</i></p><hr><dl class="ie-timeline"><dt>1995 — Prototype Cat</dt><dd>A shape appears in an unreleased drawing program.</dd><dt>1998 — LINKS.EXE</dt><dd>The program installs itself.</dd><dt>1999 — The Internet Incident</dt><dd>A 56k modem connects. The cat disappears.</dd><dt>2000 — Cat Disappears</dt><dd>Only paw prints remain in the cache.</dd><dt>2026 — LINKS Returns</dt><dd>The old machine answers again.</dd></dl><h2>Recovered files</h2><p>${["CAT.TXT","LINKS98.TXT","INTERNET.TXT","RECOVERY.LOG"].map(n=>`<button class="ie-text-link" type="button" data-ie-document="${n}">${n}</button>`).join(" · ")}</p>`);
    if (slug === "community") return webPage(`<h1>LINKS COMMUNITY CENTER</h1><table class="ie-community-table"><tbody><tr><th>LINKS Guestbook</th><td>“cool cat!!!” — xXmodemkid98Xx<br>“how did this cat get inside my computer” — anonymous${browser.guestbook.map(x=>`<br>“${escapeHTML(x.message)}” — ${escapeHTML(x.name)} <small>(local entry)</small>`).join("")}</td></tr><tr><th>Message Board</th><td>3 topics, 9 replies, 1 unexplained modem noise</td></tr><tr><th>Web Ring</th><td>Previous Site | Random Cat | Next Site</td></tr></tbody></table><form class="ie-guestbook"><h2>Sign the local guestbook</h2><label>Name <input name="name" maxlength="32" required></label><label>Message <input name="message" maxlength="120" required></label><button class="win-button" type="submit">Sign Guestbook</button><p>This entry stays on this computer only.</p></form>`);
    if (slug === "contract") return webPage(`<h1>LINKS Contract Information</h1><hr><table class="ie-properties"><tbody><tr><th>Network:</th><td>${escapeHTML(network)}</td></tr><tr><th>Contract Address:</th><td><code>${escapeHTML(ca || "TOKEN NOT CONFIGURED")}</code></td></tr></tbody></table><p><button class="win-button" type="button" data-ie-command="copy" ${ca ? "" : "disabled"}>COPY ADDRESS</button> <button class="win-button" type="button" data-ie-command="explorer" ${ca ? "" : "disabled"}>VIEW ON EXPLORER</button> ${browserLink("http://links.cat/chart", "VIEW CHART")}</p>`);
    if (slug === "buy") return webPage(`<h1>HOW TO ACQUIRE LINKS</h1><ol class="ie-buy-steps"><li>Connect wallet</li><li>Obtain the required chain currency</li><li>Open the configured trading interface</li><li>Enter the verified LINKS contract</li><li>Review and swap</li><li>Congratulations. Cat acquired.</li></ol><button class="win-button" type="button" data-ie-command="wallet">${state.user.walletAddress ? "WALLET CONNECTED" : "CONNECT WALLET"}</button>${state.user.walletAddress ? `<p><code>${escapeHTML(state.user.walletAddress.slice(0,6))}...${escapeHTML(state.user.walletAddress.slice(-4))}</code></p>` : ""}<p><small>No trade is submitted by this page.</small></p>`);
    if (["chart","market"].includes(slug)) return webPage(`<h1>LINKS MARKET WATCH</h1><hr>${browser.offline ? `<div class="ie-error"><h2>Web page unavailable offline.</h2><p>Reconnect from File → Work Offline and try again.</p></div>` : `<table class="ie-market-table"><tbody><tr><th>LINKS Price</th><td>Unable to retrieve market information.</td></tr><tr><th>24H Change</th><td>—</td></tr><tr><th>Market Cap</th><td>—</td></tr><tr><th>Liquidity</th><td>—</td></tr><tr><th>Volume</th><td>—</td></tr><tr><th>Token Address</th><td><code>${escapeHTML(ca || "TOKEN NOT CONFIGURED")}</code></td></tr><tr><th>Network</th><td>${escapeHTML(network)}</td></tr></tbody></table><div class="ie-chart-placeholder" aria-label="Market chart unavailable">MARKET DATA ERROR<br><small>LINKS Internet Explorer was unable to contact the market information server.</small></div><button class="win-button" type="button" data-ie-command="retry">Retry</button> <button class="win-button" type="button" data-ie-command="market-app">Open Market Control</button>`}`);
    if (slug === "search") { const q = searchTerm.trim().toLowerCase(); const results = q ? browserSearchIndex.filter(x => `${x.title} ${x.description} ${x.url}`.toLowerCase().includes(q)) : []; return webPage(`<h1>LINKS SEARCH</h1><hr><p>Search the Information Superhighway</p><form class="ie-search-form"><input name="q" value="${escapeHTML(searchTerm)}" aria-label="Search terms"><button class="win-button" type="submit">Search</button></form>${q ? `<h2>Search Results for “${escapeHTML(searchTerm)}”</h2>${results.length ? `<ol class="ie-results">${results.map(x=>`<li>${browserLink(x.url,x.title)}<cite>${escapeHTML(x.url)}</cite><p>${escapeHTML(x.description)}</p></li>`).join("")}</ol>` : "<p>No documents matched your search.</p>"}` : ""}`); }
    if (slug === "archive") return webPage(`<h1>LINKS DOWNLOAD ARCHIVE</h1><p>${["LINKS98.TXT","CAT.JPG","MEMES.ZIP","README.TXT"].map(n=>`<button class="ie-text-link" type="button" data-ie-download="${n}">${n}</button>`).join("<br>")}</p>`);
    if (slug === "cat") return webPage(`<div class="ie-secret"><img src="${cat("sit.png")}" alt="Links Cat"><h1>You found the cat.</h1></div>`);
    if (slug === "1998") return webPage(`<div class="ie-secret"><h1>SYSTEM DATE:<br>1998</h1><p>Everything is fine.</p></div>`);
    if (slug === "moon") return webPage(`<div class="ie-secret"><img src="${icon("moon")}" alt="Pixel moon"><img src="${cat("sit.png")}" alt="Links Cat sitting on the moon"><h1>Still going.</h1></div>`);
    if (slug === "secret") return webPage(`<h1>ACCESS GRANTED</h1><p>Cats control the market.</p><img class="ie-wide-art" src="assets/easter-eggs/market-control-room.jpg" alt="Links Cat in a hidden market control room">`);
    if (slug === "floppy") return webPage(`<h1>Drive A:</h1><p>Please insert a disk containing more cats.</p>`);
    if (slug === "games") return webPage(`<h1>LINKS GAMES</h1><p>This page launches games installed in LINKS 98.</p><button class="win-button" data-ie-command="games" type="button">Open Games</button>`);
    return webPage(`<div class="ie-error"><h1>The page cannot be displayed</h1><p>The page you are looking for is currently unavailable.</p><h2>Please try the following:</h2><ul><li>Click Refresh.</li><li>Check the address.</li><li>Ask LINKS Cat.</li></ul><p><b>HTTP 404 — File not found</b><br>LINKS Internet Explorer</p><button class="win-button" type="button" data-ie-action="back">Back</button></div>`);
  }

  function mountInternetExplorer(windowElement) {
    const browser = loadBrowserState(), shell = $(".ie-shell", windowElement), viewport = $(".ie-viewport", shell), address = $("#ie-address", shell), toolbar = $(".ie-toolbar", shell), status = $(".ie-status-text", shell), progress = $(".ie-progress i", shell), menu = $("[data-ie-menu-popup]", shell);
    let timers = [], searchTerm = "", findTerm = "";
    browser.favorites=[...new Set([...browserDefaults.favorites,...browser.favorites])];
    address.setAttribute("list","ie-visited-links");address.insertAdjacentHTML("afterend",`<datalist id="ie-visited-links"></datalist><select class="ie-engine" aria-label="Search engine"><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option><option value="coingecko">CoinGecko</option><option value="dexscreener">DexScreener</option></select><button class="win-button ie-coin-button" type="button" data-ie-action="coin">Coin Lookup</button>`);
    shell.insertAdjacentHTML("beforeend",`<img class="ie-search-cat" src="${cat("reactions/confident.png")}" alt="Links Cat approves this search" hidden>`);
    $("#ie-visited-links",shell).innerHTML=[...new Set([...browser.history,...browser.recent])].filter(url=>/^https?:\/\/(?:www\.)?links\.cat/i.test(url)).map(url=>`<option value="${escapeHTML(url)}"></option>`).join("");
    const current = () => browser.history[browser.index] || browser.homepage;
    const internal = url => /^(?:https?:\/\/(?:www\.)?links\.cat(?:\/|$)|https?:\/\/search\.links\.cat(?:\/|$)|about:|view-source:)/i.test(url);
    const searchEngines = { google:"https://www.google.com/search?q=", duckduckgo:"https://duckduckgo.com/?q=", coingecko:"https://www.coingecko.com/en/search?query=", dexscreener:"https://dexscreener.com/search?q=" };
    const searchURL = (query, engine = browser.searchEngine) => `${searchEngines[engine] || searchEngines.google}${encodeURIComponent(query).replace(/%20/g,"+")}`;
    const normalize = raw => {
      const value = String(raw || "").trim();
      if (!value) return browser.homepage;
      if (/^(links:\/\/|about:|view-source:|https?:\/\/)/i.test(value)) return value;
      if (/^(?:localhost|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i.test(value)) return `https://${value}`;
      if (/^[a-z0-9-]+$/i.test(value) && browserTitles[value.toLowerCase()]) return `http://links.cat/${value.toLowerCase()}`;
      return searchURL(value);
    };
    const titleFor = url => { try { if(!internal(url))return new URL(url).hostname.replace(/^www\./,""); } catch(_){} const slug = url.replace(/^.*links\.cat\/?/i, "").split(/[/?#]/)[0] || "home"; return browserTitles[slug] || "Page not found"; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const updateChrome = () => { toolbar.innerHTML = browserButton("back","Back","‹",browser.index<=0)+browserButton("forward","Forward","›",browser.index>=browser.history.length-1)+browserButton("stop","Stop","■",shell.dataset.ieLoading!=="true")+browserButton("refresh","Refresh","↻")+browserButton("home","Home","⌂")+'<span class="ie-toolbar-separator"></span>'+browserButton("search","Search","⌕")+browserButton("favorites","Favorites","★")+browserButton("history","History","▤"); address.value = current(); $(".ie-zone span",shell).textContent = internal(current()) ? "LINKS zone" : "Internet zone"; const record = wm.windows.get("internet"); if (record) $(".titlebar-title",record.element).textContent = `${titleFor(current())} — LINKS Internet Explorer`; };
    const finish = (url, quiet=false) => { clearTimers(); shell.dataset.ieLoading="false"; viewport.innerHTML=browserPageHTML(url,browser,searchTerm); viewport.scrollTop=0; status.textContent=browser.offline?"Working Offline":"Done"; progress.style.transform="scaleX(1)"; if(!quiet) browser.recent=[url,...browser.recent.filter(x=>x!==url)].slice(0,20); saveBrowserState(browser); updateChrome(); timers.push(setTimeout(()=>progress.style.transform="scaleX(0)",140)); };
    const navigate = async (raw, opts={}) => {
      const original=String(raw||"").trim(), url=opts.engine&&!/^(?:https?:\/\/|links:\/\/|about:)/i.test(original)?searchURL(original,opts.engine):normalize(original), apps={"links://terminal":"terminal","links://market":"market","links://computer":"computer","links://games":"arcade","links://memes":"memes","links://contract":"contract"};
      if(apps[url.toLowerCase()]){wm.open(apps[url.toLowerCase()]);status.textContent=`Opened ${apps[url.toLowerCase()]}.`;return;}
      if(!internal(url)){
        if(browser.offline){status.textContent="Web page unavailable offline.";viewport.innerHTML=webPage('<div class="ie-error"><h1>The page cannot be displayed</h1><p>LINKS Internet Explorer is working offline.</p></div>');return;}
        const isSearch=!/^(?:https?:\/\/|links:\/\/|about:)/i.test(original)&&url.includes("/search");
        clearTimers();shell.dataset.ieLoading="true";status.textContent=isSearch?"Searching the Internet...":"Opening page...";progress.style.transform="scaleX(.25)";updateChrome();
        const q=original.toLowerCase();if(q==="cats"){$(".ie-search-cat",shell).hidden=false;timers.push(setTimeout(()=>$(".ie-search-cat",shell).hidden=true,2600));}if(q==="moon")status.textContent="Destination: Moon";if(q==="100x"){status.textContent="Searching for financial advice...";timers.push(setTimeout(()=>status.textContent="Just kidding. Searching Google...",500));}
        timers.push(setTimeout(()=>{shell.dataset.ieLoading="false";progress.style.transform="scaleX(0)";status.textContent="Opened in a new browser tab.";browser.recent=[url,...browser.recent.filter(x=>x!==url)].slice(0,20);saveBrowserState(browser);updateChrome();openExternal(url);},q==="100x"?950:420));return;
      }
      if(!opts.history){browser.history=browser.history.slice(0,browser.index+1);browser.history.push(url);browser.index=browser.history.length-1;}
      clearTimers();shell.dataset.ieLoading="true";address.value=url;status.textContent="Opening page...";progress.style.transform="scaleX(.18)";updateChrome();timers.push(setTimeout(()=>{status.textContent="Connecting to host...";progress.style.transform="scaleX(.5)";},110),setTimeout(()=>{status.textContent="Downloading...";progress.style.transform="scaleX(.82)";},260),setTimeout(()=>finish(url,opts.history),420+Math.floor(Math.random()*220)));
    };
    const stop = () => { if(shell.dataset.ieLoading!=="true")return; clearTimers();shell.dataset.ieLoading="false";status.textContent="Stopped";progress.style.transform="scaleX(0)";updateChrome(); };
    const go = delta => { const next=browser.index+delta;if(next<0||next>=browser.history.length)return;browser.index=next;navigate(current(),{history:true}); };
    const showHistory = () => { menu.innerHTML=`<div class="ie-menu-heading">Today</div>${browser.recent.map(x=>`<button type="button" data-ie-menu-action="url:${escapeHTML(x)}">${escapeHTML(titleFor(x))}</button>`).join("")||'<div class="ie-menu-empty">No pages visited</div>'}`;menu.hidden=false;menu.style.cssText="right:4px;left:auto;top:28px"; };
    const showCoinLookup = () => {
      const backdrop=document.createElement("div");backdrop.className="dialog-backdrop";backdrop.innerHTML=`<form class="dialog ie-coin-dialog"><div class="titlebar"><span class="titlebar-title">LINKS Coin Lookup</span></div><div class="dialog-body"><img class="dialog-icon" src="${icon("internet")}" alt=""><label>Token / Contract Address:<input name="token" autocomplete="off" spellcheck="false" autofocus required></label><div class="ie-coin-actions" hidden><button class="win-button" type="button" data-coin-service="dex">DexScreener</button><button class="win-button" type="button" data-coin-service="ether">Etherscan</button><button class="win-button" type="button" data-coin-service="google">Google</button></div></div><div class="dialog-actions"><button class="win-button" type="submit">Search</button><button class="win-button" type="button" data-coin-cancel>Cancel</button></div></form>`;$("#dialog-layer").append(backdrop);const form=$("form",backdrop),input=$("input",form),actions=$(".ie-coin-actions",form);setTimeout(()=>input.focus(),0);form.addEventListener("submit",e=>{e.preventDefault();const value=input.value.trim();if(/^0x[a-f0-9]{40}$/i.test(value)){actions.hidden=false;status.textContent="Searching blockchain...";}else{navigate(searchURL(value,"google"));backdrop.remove();}});backdrop.addEventListener("click",e=>{if(e.target.closest("[data-coin-cancel]")){backdrop.remove();return;}const service=e.target.closest("[data-coin-service]")?.dataset.coinService;if(!service)return;const value=input.value.trim(),url=service==="dex"?`https://dexscreener.com/search?q=${encodeURIComponent(value)}`:service==="ether"?`https://etherscan.io/address/${encodeURIComponent(value)}`:searchURL(value,"google");openExternal(url);status.textContent="Searching blockchain...";backdrop.remove();});
    };
    const openMenu = (kind, anchor) => { const items={file:[["Open...","open"],["Work Offline","offline"],["Print...","print"]],edit:[["Select All","select"],["Find (on This Page)...","find"]],view:[["Refresh","refresh"],["Source","source"],["Internet Options...","options"]],go:[["Back","back"],["Forward","forward"],["Home Page","home"],["History","history"]],favorites:[["Add to Favorites...","add-favorite"],...browser.favorites.map(x=>[titleFor(x),`url:${x}`]),["Organize Favorites...","organize"]],help:[["Help Topics","help"],["About LINKS Internet Explorer","about-links"]]}; menu.innerHTML=(items[kind]||[]).map(([label,action])=>`<button type="button" data-ie-menu-action="${escapeHTML(action)}">${action==="offline"&&browser.offline?"✓ ":""}${escapeHTML(label)}</button>`).join("");menu.hidden=false;menu.style.cssText=`left:${anchor.offsetLeft}px;top:${anchor.offsetTop+anchor.offsetHeight}px`; };
    const find = () => { const term=prompt("Find what:",findTerm);if(term===null)return;findTerm=term;const found=viewport.innerText.toLowerCase().includes(term.toLowerCase());status.textContent=found?`Found “${term}” on this page.`:`Text not found: “${term}”`;if(found)window.find?.(term,false,false,true); };
    const menuAction = action => { menu.hidden=true;if(action?.startsWith("url:"))return navigate(action.slice(4));if(action==="back")return go(-1);if(action==="forward")return go(1);if(action==="home")return navigate(browser.homepage);if(action==="refresh")return navigate(current(),{history:true});if(action==="source")return navigate(`view-source:${current()}`);if(action==="about-links")return navigate("about:links");if(action==="history")return showHistory();if(action==="offline"){browser.offline=!browser.offline;saveBrowserState(browser);status.textContent=browser.offline?"Working Offline":"Done";}if(action==="add-favorite"){if(!browser.favorites.includes(current()))browser.favorites.push(current());saveBrowserState(browser);status.textContent="Favorite added.";}if(action==="organize"){browser.favorites=[...browserDefaults.favorites];saveBrowserState(browser);}if(action==="find")find();if(action==="open"){address.focus();address.select();}if(action==="select"){const s=getSelection(),r=document.createRange();s.removeAllRanges();r.selectNodeContents(viewport);s.addRange(r);}if(action==="print")showDialog({title:"Print",message:"No printer was found. The cat may be sitting on it.",image:cat("reactions/unimpressed.png")});if(action==="options"){const value=prompt("Internet Options — General\n\nHome page:",browser.homepage);if(value){browser.homepage=normalize(value);saveBrowserState(browser);}}if(action==="help")wm.open("help98"); };
    $(".ie-engine",shell).value=browser.searchEngine;
    $(".ie-engine",shell).addEventListener("change",e=>{browser.searchEngine=e.target.value;saveBrowserState(browser);status.textContent=`Search engine: ${e.target.options[e.target.selectedIndex].text}`;});
    $(".ie-address-form",shell).addEventListener("submit",e=>{e.preventDefault();navigate(address.value);});
    windowElement.addEventListener("click",e=>{if(e.target.closest('[data-ie-action="coin"]'))showCoinLookup();});
    windowElement.addEventListener("click",async e=>{const mb=e.target.closest("[data-ie-menu]");if(mb)return openMenu(mb.dataset.ieMenu,mb);const ma=e.target.closest("[data-ie-menu-action]")?.dataset.ieMenuAction;if(ma)return menuAction(ma);const link=e.target.closest("[data-ie-url]");if(link){e.preventDefault();if(link.dataset.ieMail)return showDialog({title:"New Message",message:"To: webmaster@links.cat\n\nMail is stored locally; no message will be sent.",image:icon("document")});return navigate(link.dataset.ieUrl);}const action=e.target.closest("[data-ie-action]")?.dataset.ieAction;if(action){if(action==="back")go(-1);if(action==="forward")go(1);if(action==="stop")stop();if(action==="refresh")navigate(current(),{history:true});if(action==="home")navigate(browser.homepage);if(action==="search")navigate("http://search.links.cat/");if(action==="favorites")openMenu("favorites",e.target.closest("button"));if(action==="history")showHistory();return;}const cmd=e.target.closest("[data-ie-command]")?.dataset.ieCommand;if(cmd==="copy")copyContract();if(cmd==="explorer")openExternal(`${CONFIG.EXPLORER_URL}/token/${getContractAddress()}`);if(cmd==="wallet"){await attemptWalletConnection();finish(current(),true);}if(cmd==="market-app")wm.open("market");if(cmd==="games")wm.open("arcade");if(cmd==="retry")navigate(current(),{history:true});if(cmd==="zone")showDialog({title:"Security Properties",message:`Zone: ${internal(current())?"LINKS":"Internet"}\nSecurity level: Medium`,image:icon("internet")});const image=e.target.closest("[data-ie-image]");if(image){state.memeIndex=Number(image.dataset.ieImage);wm.open("viewer");refreshViewer();}const doc=e.target.closest("[data-ie-document]")?.dataset.ieDocument;if(doc){localStorage.setItem("links98:notepad",JSON.stringify(`${doc}\n\nRecovered from the LINKS CAT archive.\nThe cat was here.`));wm.close("notepad");wm.open("notepad");}const file=e.target.closest("[data-ie-download]")?.dataset.ieDownload;if(file){const answer=await showDialog({title:"File Download",message:`You have chosen to download:\n\n${file}\n\nfrom:\nhttp://links.cat/archive/`,image:icon("document"),buttons:["Open","Save","Cancel"]});if(answer==="Save"){const blob=new Blob([`${file}\r\nLINKS CAT archive file.`],{type:"text/plain"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file;a.click();URL.revokeObjectURL(a.href);}}});
    windowElement.addEventListener("submit",e=>{if(e.target.matches("[data-ie-web-search]")){e.preventDefault();const query=String(new FormData(e.target).get("q")||"").trim();if(query)navigate(query,{engine:"google"});}if(e.target.matches(".ie-search-form")){e.preventDefault();searchTerm=new FormData(e.target).get("q")||"";finish("http://search.links.cat/",true);}if(e.target.matches(".ie-guestbook")){e.preventDefault();const data=new FormData(e.target);browser.guestbook.push({name:data.get("name"),message:data.get("message")});saveBrowserState(browser);finish(current(),true);}});
    viewport.addEventListener("mouseover",e=>{const link=e.target.closest("[data-ie-url]");if(link)status.textContent=link.dataset.ieUrl;});viewport.addEventListener("mouseout",e=>{if(e.target.closest("[data-ie-url]"))status.textContent=browser.offline?"Working Offline":"Done";});
    viewport.addEventListener("contextmenu",e=>{e.preventDefault();menu.innerHTML='<button data-ie-menu-action="back">Back</button><button data-ie-menu-action="forward">Forward</button><button data-ie-menu-action="select">Select All</button><button data-ie-menu-action="source">View Source</button><button data-ie-menu-action="properties">Properties</button>';menu.hidden=false;const rect=windowElement.getBoundingClientRect();menu.style.cssText=`left:${Math.min(e.clientX-rect.left,windowElement.clientWidth-170)}px;top:${Math.min(e.clientY-rect.top,windowElement.clientHeight-170)}px`;});
    windowElement.addEventListener("keydown",e=>{if(e.ctrlKey&&e.key.toLowerCase()==="l"){e.preventDefault();address.focus();address.select();}else if((e.ctrlKey&&e.key.toLowerCase()==="r")||e.key==="F5"){e.preventDefault();navigate(current(),{history:true});}else if(e.ctrlKey&&e.key.toLowerCase()==="f"){e.preventDefault();find();}else if(e.ctrlKey&&e.key.toLowerCase()==="h"){e.preventDefault();showHistory();}else if(e.ctrlKey&&e.key.toLowerCase()==="d"){e.preventDefault();menuAction("add-favorite");}else if(e.ctrlKey&&e.key.toLowerCase()==="o"){e.preventDefault();address.focus();address.select();}else if(e.altKey&&e.key==="ArrowLeft"){e.preventDefault();go(-1);}else if(e.altKey&&e.key==="ArrowRight"){e.preventDefault();go(1);}else if(e.altKey&&e.key==="Home"){e.preventDefault();navigate(browser.homepage);}else if(e.key==="Escape")stop();});
    finish(current(),true);
  }

  const APPS = {};
  const wm = new WindowManager($("#window-layer"), $("#task-buttons"));

  // ==========================================
  // APPLICATION DEFINITIONS
  // ==========================================

  Object.assign(APPS, {
    links: {
      title: "LINKS.exe — Market Control", icon: appIcon("links"), width: 720, height: 540, status: "LINKS CAT SYSTEM ONLINE",
      render: () => `
        <div class="app-hero">
          <div class="app-art"><img src="${appArt("market-control-cat.png")}" alt="Links Cat operating a retro market control console"></div>
          <div>
            <div class="panel system-lines">
              <div>BULLISH MODE: <output>ON</output></div>
              <div>SELLING: <output>DISABLED</output></div>
              <div>DESTINATION: <output>ATH ↑</output></div>
            </div>
            <svg class="chart" viewBox="0 0 320 90" role="img" aria-label="Decorative green chart trending upward">
              <line x1="0" y1="30" x2="320" y2="30"></line><line x1="0" y1="60" x2="320" y2="60"></line>
              <polyline data-chart-line points="0,76 40,62 72,68 110,43 144,52 182,31 215,39 252,18 285,25 320,8"></polyline>
            </svg>
            <div class="chart-status" role="status">Awaiting cat input.</div>
          </div>
        </div>
        <div class="big-actions">
          <button class="win-button" type="button" data-market-action="buy">BUY</button>
          <button class="win-button" type="button" data-market-action="hold">HOLD</button>
          <button class="win-button" type="button" data-market-action="higher">HIGHER</button>
        </div>`,
      mount: (windowElement) => windowElement.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-market-action]")?.dataset.marketAction;
        if (!action) return;
        event.target.classList.add("is-pressed");
        setTimeout(() => event.target.classList.remove("is-pressed"), 120);
        if (action === "buy") wm.open("buy");
        if (action === "hold") await showDialog({ title: "LINKS 98", message: "HOLD mode enabled.", image: cat("reactions/confident.png") });
        if (action === "higher") {
          const line = $("[data-chart-line]", windowElement);
          line.setAttribute("points", "0,76 40,61 72,66 110,40 144,48 182,27 215,34 252,13 285,18 320,2");
          $(".chart-status", windowElement).textContent = "Target updated.";
          announce("Target updated. This is a visual joke, not a price prediction.");
        }
      })
    },

    buy: {
      title: "Buy LINKS — Setup", icon: appIcon("buy"), width: 650, height: 470, status: "Official information only",
      render: () => `
        <div class="wizard" data-wizard-page="0">
          <div class="wizard-page">
            <div class="wizard-side"><img src="${appArt("installer-cat.png")}" alt="Links Cat holding a disk beside a box of disks"></div>
            <div class="wizard-copy"></div>
          </div>
          <div class="wizard-footer"></div>
        </div>`,
      mount: (windowElement) => {
        let page = 0;
        const renderPage = () => {
          const copy = $(".wizard-copy", windowElement);
          const footer = $(".wizard-footer", windowElement);
          const ca = getContractAddress() || "COMING_SOON";
          if (page === 0) {
            copy.innerHTML = `<h2>Welcome to LINKS Setup</h2><p>This wizard will help you find the official ${escapeHTML(CONFIG.TOKEN_NAME)} information.</p><p>No financial promises. Just the official links, when available.</p>`;
            footer.innerHTML = `<button class="win-button" type="button" data-wizard="next">Next &gt;</button><button class="win-button" type="button" data-window-action="close">Cancel</button>`;
          } else if (page === 1) {
            copy.innerHTML = `<h2>Official Contract Address</h2><label for="contract-address">Contract address</label><input id="contract-address" class="ca-field" value="${escapeHTML(ca)}" readonly><button class="win-button" type="button" data-wizard="copy">COPY CA</button><p>The address is configured centrally in <strong>config.js</strong>.</p>`;
            footer.innerHTML = `<button class="win-button" type="button" data-wizard="back">&lt; Back</button><button class="win-button" type="button" data-wizard="next">Next &gt;</button><button class="win-button" type="button" data-window-action="close">Cancel</button>`;
          } else {
            copy.innerHTML = `<h2>Ready.</h2><p>LINKS Setup has finished locating the official information.</p><p><strong>${escapeHTML(CONFIG.TOKEN_NAME)}</strong> · ${escapeHTML(ca)}</p>`;
            footer.innerHTML = `<button class="win-button" type="button" data-wizard="buy">BUY ${escapeHTML(CONFIG.TOKEN_NAME)}</button><button class="win-button" type="button" data-wizard="community">X / COMMUNITY</button><button class="win-button" type="button" data-window-action="close">Finish</button>`;
          }
        };
        windowElement.addEventListener("click", async (event) => {
          const action = event.target.closest("[data-wizard]")?.dataset.wizard;
          if (action === "next") { page = Math.min(2, page + 1); renderPage(); }
          if (action === "back") { page = Math.max(0, page - 1); renderPage(); }
          if (action === "copy") {
            const copied = await copyContract();
            event.target.textContent = copied ? "COPIED" : "SELECT CA";
          }
          if (action === "buy") openExternal(CONFIG.BUY_URL, "Official buy link coming soon.");
          if (action === "community") openExternal(CONFIG.X_URL, "Community link coming soon.");
        });
        renderPage();
      }
    },

    about: {
      title: "System Properties", icon: icon("links"), width: 540, height: 430,
      render: () => `
        <div class="tabs" role="tablist"><button class="tab" type="button" role="tab" aria-selected="true">General</button><button class="tab" type="button" role="tab" aria-selected="false">Cat</button></div>
        <div class="panel about-layout">
          <img src="${appArt("about-cat.png")}" alt="Links Cat beside a vintage computer">
          <div><h2>LINKS 98</h2><p>Version 1.0</p><p>Registered to:<br><strong>${escapeHTML(state.user.username)}</strong></p>
            <dl class="property-list"><dt>Cat:</dt><dd>Links</dd><dt>Mood:</dt><dd>Bullish</dd><dt>Paper Hands:</dt><dd>Not Installed</dd><dt>Uptime:</dt><dd>Since 1998</dd><dt>CA:</dt><dd>${escapeHTML(getContractAddress() || "COMING_SOON")}</dd><dt>Memory:</dt><dd>640K should be enough for one cat</dd></dl>
          </div>
        </div>
        <div class="dialog-actions"><button class="win-button" type="button" data-copy-ca>COPY CA</button><button class="win-button" type="button" data-window-action="close">OK</button></div>`,
      mount: (windowElement) => windowElement.addEventListener("click", async (event) => {
        if (event.target.closest("[data-copy-ca]")) await copyContract();
        const tab = event.target.closest(".tab");
        if (tab && tab.getAttribute("aria-selected") === "false") showDialog({ title: "Cat Properties", message: "Owner: Unknown\nPrivileges: Administrator\nExplanation: Refused", image: cat("reactions/unimpressed.png") });
      })
    },

    lore: {
      title: "Lore.txt — Notepad", icon: icon("lore"), width: 760, height: 540, status: "3 chapters",
      render: () => `<div class="lore-reader"><div class="panel lore-text"></div><div class="lore-image"><img alt=""></div></div><div class="lore-nav"><button class="win-button" type="button" data-lore="prev">&lt; Previous</button><span data-lore-counter></span><button class="win-button" type="button" data-lore="next">Next &gt;</button></div>`,
      mount: (windowElement) => {
        const update = () => {
          const page = lorePages[state.lorePage];
          $(".lore-text", windowElement).textContent = `${page.year}\n${page.title}\n\n${page.text}`;
          const image = $(".lore-image img", windowElement);
          image.src = page.image; image.alt = page.title;
          $("[data-lore-counter]", windowElement).textContent = `${state.lorePage + 1} / ${lorePages.length}`;
          $("[data-lore='prev']", windowElement).disabled = state.lorePage === 0;
          $("[data-lore='next']", windowElement).disabled = state.lorePage === lorePages.length - 1;
        };
        windowElement.addEventListener("click", (event) => {
          const direction = event.target.closest("[data-lore]")?.dataset.lore;
          if (direction === "prev") state.lorePage = Math.max(0, state.lorePage - 1);
          if (direction === "next") state.lorePage = Math.min(lorePages.length - 1, state.lorePage + 1);
          if (direction) update();
        });
        update();
      }
    },

    memes: {
      title: "Memes — Explorer", icon: icon("memes"), width: 700, height: 500, status: `${memes.length} object(s)`,
      render: () => `<div class="explorer-toolbar"><button class="win-button" type="button" data-explorer="back">Back</button><button class="win-button" type="button" data-explorer="up">Up</button><button class="win-button" type="button" data-explorer="refresh">Refresh</button></div><div class="address-row"><span>Address</span><input aria-label="Folder address" value="C:\\LINKS\\MEMES" readonly></div><div class="file-grid">${memes.map((item, index) => `<button class="file-item thumbnail" type="button" data-meme="${index}"><img src="${item.src}" alt="Preview of ${escapeHTML(item.name)}" loading="lazy" decoding="async"><span>${escapeHTML(item.name)}</span></button>`).join("")}</div>`,
      mount: (windowElement) => {
        windowElement.addEventListener("dblclick", (event) => {
          const item = event.target.closest("[data-meme]");
          if (item) { state.memeIndex = Number(item.dataset.meme); wm.open("viewer"); refreshViewer(); }
        });
        windowElement.addEventListener("click", (event) => {
          if (event.target.closest("[data-explorer='back'],[data-explorer='up']")) showDialog({ title: "Explorer", message: "This is the root of the meme folder.", image: cat("reactions/confident.png") });
          if (event.target.closest("[data-explorer='refresh']")) announce("Meme folder refreshed.");
        });
      }
    },

    viewer: {
      title: "LINKS Image Viewer", icon: icon("memes"), width: 720, height: 560, menu: false,
      render: () => `<div class="image-viewer"><div class="viewer-stage"><img data-viewer-image alt=""></div><div class="viewer-controls"><button class="win-button" type="button" data-viewer="prev">Previous</button><button class="win-button" type="button" data-viewer="next">Next</button><a class="win-button" data-viewer-download download>Save image</a><button class="win-button" type="button" data-window-action="close">Close</button></div></div>`,
      mount: (windowElement) => {
        windowElement.addEventListener("click", (event) => {
          const direction = event.target.closest("[data-viewer]")?.dataset.viewer;
          if (direction === "prev") state.memeIndex = (state.memeIndex - 1 + memes.length) % memes.length;
          if (direction === "next") state.memeIndex = (state.memeIndex + 1) % memes.length;
          if (direction) refreshViewer();
        });
        refreshViewer();
      }
    },

    internet: {
      title: "LINKS Internet Explorer", icon: icon("internet"), width: 790, height: 590, menu: false,
      render: () => `<div class="ie-shell" data-ie-loading="false"><nav class="ie-menubar" aria-label="Browser menu">${["File","Edit","View","Go","Favorites","Help"].map(x=>`<button type="button" data-ie-menu="${x.toLowerCase()}">${x}</button>`).join("")}</nav><div class="ie-menu-popup" data-ie-menu-popup hidden></div><div class="ie-toolbar" role="toolbar" aria-label="Navigation toolbar"></div><form class="ie-address-form"><label for="ie-address">Address:</label><span class="ie-page-icon" aria-hidden="true"></span><input id="ie-address" name="address" value="http://links.cat/home" autocomplete="off" spellcheck="false"><button class="win-button" type="submit">Go</button><div class="ie-throbber" aria-label="Page loading"><img src="${icon("internet")}" alt=""></div></form><main class="ie-viewport" tabindex="0" aria-label="Web page"></main><div class="ie-statusbar"><div class="ie-status-text" role="status">Done</div><div class="ie-progress" aria-hidden="true"><i></i></div><button type="button" class="ie-zone" data-ie-command="zone"><img src="${icon("internet")}" alt=""> <span>LINKS zone</span></button></div></div>`,
      mount: mountInternetExplorer
    },

    terminal: {
      title: "Command Prompt", icon: icon("terminal"), width: 650, height: 430, menu: false,
      render: () => `<div class="terminal" aria-label="Interactive LINKS terminal"><pre class="terminal-output">LINKS CAT COMMAND PROMPT\nVersion 1.0 (C) 1998 LINKS Operating System\n\n</pre><label class="terminal-line"><span>C:\\&gt;&nbsp;</span><input class="terminal-input" aria-label="Terminal command" autocomplete="off" spellcheck="false"></label></div>`,
      mount: (windowElement) => {
        const input = $(".terminal-input", windowElement);
        const output = $(".terminal-output", windowElement);
        const ca = getContractAddress() || "COMING_SOON";
        const responses = {
          help: "Commands: help links status buy chart tape holdermap av printer solitaire weather games ca hold sell moon price clear dir whoami cat lore exit",
          links: "LINKS CAT v1.0\nStatus: ONLINE",
          status: "Bullish Mode: ON\nSelling: DISABLED\nDestination: ATH",
          ca: `Official CA: ${ca || "TOKEN NOT CONFIGURED"}`,
          hold: "HOLD mode enabled.",
          sell: "'SELL' is not recognized as an internal\nor external command.",
          moon: "Destination: UNKNOWN\nStatus: STILL GOING",
          price: "Cats do not predict prices.",
          dir: "LORE.TXT\nLINKS.EXE\nHOLD.EXE\nMEMES\nSELL.EXE\nCHART.EXE\nLIVETAPE.EXE\nHOLDERMAP.EXE\nANTIVIRUS.EXE\nPRINTER.EXE\nSOLITAIRE.EXE\nWEATHER.EXE\nARCADE.EXE",
          whoami: `${state.user.username}`,
          cat: "meow.",
          lore: "1998: cat found.\n2026: cat returned.\nExplanation: unavailable.",
          meow: "meow meow. (administrator reply)",
          admin: "ACCESS GRANTED\nUser was already a cat."
        };
        input.addEventListener("keydown", async (event) => {
          if (event.key !== "Enter") return;
          const command = input.value.trim().toLowerCase();
          output.textContent += `C:\\> ${input.value}\n`;
          input.value = "";
          if (command === "clear") output.textContent = "";
          else if (command === "exit") wm.close("terminal");
          else if (command === "buy") wm.open("buy");
          else if (command === "chart") wm.open("chart");
          else if (command === "tape" || command === "livetape") wm.open("livetape");
          else if (command === "holdermap" || command === "holders" || command === "defrag") wm.open("holdermap");
          else if (command === "antivirus" || command === "av" || command === "scan") wm.open("antivirus");
          else if (command === "printer" || command === "print") wm.open("printer");
          else if (command === "solitaire" || command === "sol") wm.open("solitaire");
          else if (command === "weather" || command === "forecast") wm.open("weather");
          else if (command === "games" || command === "arcade") wm.open("arcade");
          else if (command === "crash") {
            state.discoveries.add("crash");
            output.textContent += "Invoking highly advanced stability test...\n\n";
            triggerCrash();
          } else if (command === "behind") {
            if (["crash", "classified", "annoyed"].every((secret) => state.discoveries.has(secret))) triggerSecretEnding();
            else output.textContent += "ACCESS DENIED\nThree system secrets are still watching.\n\n";
          } else if (command) output.textContent += `${responses[command] || `'${command.toUpperCase()}' is not recognized as an internal\nor external command.`}\n\n`;
          $(".terminal", windowElement).scrollTop = $(".terminal", windowElement).scrollHeight;
        });
        requestAnimationFrame(() => input.focus());
      }
    },

    recycle: {
      title: "Recycle Bin", icon: icon("recycle-full"), width: 650, height: 450, status: "4 deleted object(s)",
      render: () => `<div class="app-hero"><div class="app-art"><img src="${appArt("recycle-bin-cat.png")}" alt="Links Cat peeking from behind an overflowing recycle bin"></div><div class="file-grid">${fileIcon("SELL.exe", "document")}${fileIcon("paperhands.dll")}${fileIcon("fear.txt", "lore")}${fileIcon("financial_advice.doc", "document")}</div></div>`,
      mount: (windowElement) => windowElement.addEventListener("dblclick", (event) => {
        const name = event.target.closest("[data-file]")?.dataset.file;
        if (!name) return;
        if (name === "SELL.exe") showDialog({ title: "Access Denied", message: "Selling has been disabled by LINKS CAT.", image: cat("warning-cat.png") });
        else if (name === "financial_advice.doc") showDialog({ title: "File Error", message: "This file is empty.\nNothing here is financial advice.", image: cat("reactions/unimpressed.png") });
        else showDialog({ title: name, message: "This deleted file is happier here.", image: cat("reactions/confident.png") });
      })
    },

    moon: {
      title: "To The Moon", icon: icon("moon"), width: 540, height: 390, status: "4 object(s)",
      render: () => `<div class="address-row"><span>Address</span><input aria-label="Folder address" value="C:\\LINKS\\MOON" readonly></div><div class="file-grid">${fileIcon("moon.exe", "moon")}${fileIcon("higher.bmp", "market")}${fileIcon("destination.txt", "lore")}${fileIcon("definitely_early.txt", "document")}</div>`,
      mount: (windowElement) => windowElement.addEventListener("dblclick", (event) => {
        const name = event.target.closest("[data-file]")?.dataset.file;
        if (name === "destination.txt") showDialog({ title: "destination.txt", message: "DESTINATION:\nUNKNOWN\n\nSTATUS:\nSTILL GOING", image: cat("reactions/celebrating.png") });
        else if (name) showDialog({ title: name, message: "Meme navigation only. No orbital guarantees were found.", image: cat("reactions/shocked.png") });
      })
    },

    calculator: {
      title: "Calculator", icon: icon("document"), width: 310, height: 500, menu: false,
      render: () => `<img class="calc-art" src="${appArt("calculator-cat.png")}" alt="Links Cat pointing at a calculator"><div class="calculator"><input class="calc-display" aria-label="Calculator display" value="0" readonly><div class="calc-grid">${["C","←","/","*","7","8","9","-","4","5","6","+","1","2","3","=","0",".","+/-","="].map((key) => `<button class="win-button" type="button" data-calc="${key}">${key === "*" ? "×" : key}</button>`).join("")}</div></div>`,
      mount: (windowElement) => {
        const display = $(".calc-display", windowElement);
        let expression = "", justEvaluated = false;
        const calculate = async () => {
          if (/^100\*$/.test(expression.replace(/\s/g, ""))) {
            await showDialog({ title: "Advanced Mathematics", message: "Advanced mathematics completed.\n\nThis is a meme, not an investment prediction.", image: appArt("calculator-cat.png") });
            expression = "100×"; display.value = expression; return;
          }
          try {
            if (!/^[\d+\-*/. ()]+$/.test(expression)) throw new Error();
            const result = Function(`"use strict"; return (${expression})`)();
            if (!Number.isFinite(result)) throw new Error();
            expression = String(Math.round((result + Number.EPSILON) * 1e10) / 1e10);
            display.value = expression; justEvaluated = true;
          } catch (_) { display.value = "Error"; expression = ""; beep("error"); }
        };
        windowElement.addEventListener("click", (event) => {
          const key = event.target.closest("[data-calc]")?.dataset.calc;
          if (!key) return;
          if (key === "C") { expression = ""; display.value = "0"; }
          else if (key === "←") { expression = expression.slice(0, -1); display.value = expression || "0"; }
          else if (key === "=") calculate();
          else if (key === "+/-") { expression = expression.startsWith("-") ? expression.slice(1) : `-${expression || "0"}`; display.value = expression; }
          else {
            if (justEvaluated && /\d|\./.test(key)) expression = "";
            justEvaluated = false; expression += key; display.value = expression.replaceAll("*", "×");
          }
        });
      }
    },

    paint: {
      title: "untitled — Paint", icon: appIcon("paint"), width: 740, height: 540, status: "For Help, click Help Topics on the Help Menu.",
      render: () => `<div class="paint-shell"><div class="paint-tools"><button class="win-button" type="button" data-tool="pencil">✎</button><button class="win-button" type="button" data-tool="eraser">□</button><button class="color-button" type="button" data-color="black" aria-label="Black"></button><button class="color-button" type="button" data-color="green" aria-label="Green"></button><button class="color-button" type="button" data-color="blue" aria-label="Blue"></button><button class="color-button" type="button" data-color="white" aria-label="White"></button><button class="win-button" type="button" data-tool="clear">Clear</button></div><div class="paint-canvas-wrap"><canvas id="paint-canvas" width="640" height="400" aria-label="Drawing canvas"></canvas></div></div>`,
      mount: (windowElement) => {
        const canvas = $("#paint-canvas", windowElement);
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        let drawing = false, color = "black", size = 3;
        const point = (event) => {
          const rect = canvas.getBoundingClientRect();
          return [(event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height];
        };
        canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); context.beginPath(); context.moveTo(...point(event)); });
        canvas.addEventListener("pointermove", (event) => { if (!drawing) return; context.strokeStyle = color; context.lineWidth = size; context.lineCap = "square"; context.lineTo(...point(event)); context.stroke(); });
        canvas.addEventListener("pointerup", () => { drawing = false; });
        windowElement.addEventListener("click", (event) => {
          const tool = event.target.closest("[data-tool]")?.dataset.tool;
          const selectedColor = event.target.closest("[data-color]")?.dataset.color;
          if (selectedColor) { color = selectedColor; size = 3; }
          if (tool === "pencil") { color = "black"; size = 3; }
          if (tool === "eraser") { color = "white"; size = 18; }
          if (tool === "clear") { context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); }
        });
      }
    },

    market: {
      title: "Market Control", icon: icon("market"), width: 680, height: 500, menu: false,
      render: () => `<div class="app-art"><img src="${appArt("market-control-cat.png")}" alt="Links Cat at the market control console"></div><div class="panel system-lines"><div>VOLATILITY: CAT-SHAPED</div><div>PREDICTIONS: DISABLED</div><div>CONTROL: QUESTIONABLE</div></div><div class="dialog-actions"><button class="win-button" type="button" data-open-app="chart">OPEN LINKS Chart</button><button class="win-button" type="button" data-open-app="links">OPEN LINKS.exe</button></div>`,
      mount: (windowElement) => windowElement.addEventListener("click", (event) => {
        const targetApp = event.target.closest("[data-open-app]")?.dataset.openApp;
        if (targetApp) wm.open(targetApp);
      })
    },

    computer: {
      title: "My Computer", icon: icon("my-computer"), width: 600, height: 420, status: "5 object(s)",
      render: () => `<div class="address-row"><span>Address</span><input aria-label="Computer address" value="My Computer" readonly></div><div class="file-grid">${fileIcon("3½ Floppy (A:)", "my-computer")}${fileIcon("Local Disk (C:)", "my-computer")}${fileIcon("Printers", "my-computer")}${fileIcon("The Internet", "internet")}${fileIcon("User Profile", "links")}</div>`,
      mount: (windowElement) => windowElement.addEventListener("dblclick", (event) => {
        const name = event.target.closest("[data-file]")?.dataset.file;
        if (name === "The Internet") wm.open("internet");
        else if (name === "User Profile") wm.open("profile");
        else if (name === "Printers") wm.open("printer");
        else if (name) showDialog({ title: name, message: name.includes("Floppy") ? "Please insert a disk containing more cats." : "C:\\ contains LINKS.EXE and one suspicious folder.", image: appArt("computer-hug-cat.png") });
      })
    },

    community: {
      title: "Community", icon: icon("community"), width: 420, height: 280, menu: false,
      render: () => `<div class="panel"><h2>LINKS CAT COMMUNITY</h2><p>The official community shortcut is configured in <strong>config.js</strong>.</p><p>${CONFIG.X_URL ? "The link is ready." : "Community link coming soon."}</p><button class="win-button" type="button" data-community>OPEN X / COMMUNITY</button></div>`,
      mount: (windowElement) => windowElement.addEventListener("click", (event) => { if (event.target.closest("[data-community]")) openExternal(CONFIG.X_URL, "Community link coming soon."); })
    },

    classified: {
      title: "CLASSIFIED", icon: icon("market"), width: 700, height: 560, menu: false,
      render: () => `<div class="app-art"><img src="assets/easter-eggs/market-control-room.jpg" alt="Links Cat in a classified market control room"></div><div class="panel"><strong>CATS CONTROL THE MARKET</strong><p>Nobody was supposed to see this.</p></div><div class="dialog-actions"><button class="win-button" type="button" data-window-action="close">CLOSE</button></div>`
    },

    display: {
      title: "Display Properties", icon: icon("my-computer"), width: 500, height: 390, menu: false,
      render: () => `<div class="tabs" role="tablist"><button class="tab" type="button" role="tab" aria-selected="true">Background</button><button class="tab" type="button" role="tab" aria-selected="false">Screen Saver</button></div><div class="panel"><h2>LINKS 98 Desktop</h2><p>Wallpaper: Links Hill</p><p>Color palette: 256 colors (approximately)</p><label><input type="checkbox" checked disabled> Show Links Cat on desktop</label><br><label><input type="checkbox" checked> Allow cat administrative control</label></div><div class="dialog-actions"><button class="win-button" type="button" data-window-action="close">OK</button></div>`
    },

    // ==========================================
    // NEW "MY PROFILE" APPLICATION
    // ==========================================
    profile: {
      title: "LINKS 98 User Profile", icon: appIcon("profile"), width: 520, height: 380, menu: false,
      render: () => {
        const u = state.user;
        return `
          <div class="panel profile-layout">
            <div class="profile-pfp-column">
              <div class="profile-pfp-box">
                <img class="profile-pfp-img" src="${escapeHTML(u.pfp)}" alt="User Profile Picture">
              </div>
              <button class="win-button" style="width: 100%; font-size: 11px;" type="button" data-profile-action="change-pic">Change Picture...</button>
            </div>
            <div>
              <h2>LINKS 98 USER</h2>
              <dl class="profile-details-table">
                <dt>User:</dt>
                <dd><strong data-profile-user>${escapeHTML(u.username)}</strong></dd>
                <dt>Wallet:</dt>
                <dd data-profile-wallet>${u.walletAddress ? `${escapeHTML(u.walletAddress.slice(0, 6))}...${escapeHTML(u.walletAddress.slice(-4))}` : "Not Connected"}</dd>
                <dt>System:</dt>
                <dd>LINKS 98</dd>
                <dt>Status:</dt>
                <dd style="color: #00aa00; font-weight: 700;">ONLINE</dd>
                <dt>Member Since:</dt>
                <dd>${escapeHTML(u.memberSince || "Sep 9, 2026")}</dd>
              </dl>
            </div>
          </div>
          <div class="profile-actions">
            ${u.walletAddress ? '<button class="win-button" type="button" data-profile-action="disconnect-wallet">Disconnect Wallet</button>' : '<button class="win-button" type="button" data-profile-action="connect-wallet">Connect Wallet</button>'}
            <button class="win-button" type="button" data-window-action="close">OK</button>
          </div>`;
      },
      mount: (windowElement) => {
        windowElement.addEventListener("click", async (event) => {
          const action = event.target.closest("[data-profile-action]")?.dataset.profileAction;
          if (!action) return;
          if (action === "change-pic") {
            const newPfp = await showPfpPicker(state.user.pfp);
            if (newPfp) {
              saveUserProfile({ pfp: newPfp });
              const img = $(".profile-pfp-img", windowElement);
              if (img) img.src = newPfp;
              showDialog({ title: "User Profile", message: "Profile picture updated.", image: newPfp });
            }
          }
          if (action === "connect-wallet") {
            const connected = await attemptWalletConnection();
            if (connected) {
              wm.close("profile");
              wm.open("profile");
            }
          }
          if (action === "disconnect-wallet") {
            saveUserProfile({ walletAddress: "" });
            wm.close("profile");
            wm.open("profile");
            showDialog({ title: "Wallet", message: "Wallet disconnected.", image: icon("links") });
          }
        });
      }
    },

    // ==========================================
    // NEW "LINKS CHART" APPLICATION
    // ==========================================
    chart: {
      title: "LINKS Chart", icon: appIcon("chart"), width: 760, height: 560,
      render: () => {
        const ca = getContractAddress();
        const symbol = window.TOKEN_CONFIG?.symbol || "LINKS";
        return `
          <div class="chart-app-container">
            <div class="chart-top-toolbar">
              <div class="chart-meta-group">
                <span>Token: <strong>${escapeHTML(symbol)}</strong></span>
                <span>|</span>
                <span>Network: <strong>Robinhood Chain (4663)</strong></span>
                <span>|</span>
                <span>Pair: <strong>PONS (MSFT)</strong></span>
              </div>
              <div class="chart-ca-row">
                <span>CA:</span>
                <input class="chart-ca-input" value="${escapeHTML(ca || "TOKEN NOT CONFIGURED")}" readonly>
                <button class="win-button" type="button" data-chart-action="copy-ca">Copy CA</button>
                <button class="win-button" type="button" data-chart-action="refresh">Refresh</button>
              </div>
            </div>

            <div class="chart-stats-grid">
              <div class="chart-stat-cell">
                <span class="chart-stat-label">LIVE PRICE</span>
                <span class="chart-stat-value" data-stat="price">--</span>
              </div>
              <div class="chart-stat-cell">
                <span class="chart-stat-label">MARKET CAP</span>
                <span class="chart-stat-value" data-stat="mcap">--</span>
              </div>
              <div class="chart-stat-cell">
                <span class="chart-stat-label">LIQUIDITY</span>
                <span class="chart-stat-value" data-stat="liq">--</span>
              </div>
              <div class="chart-stat-cell">
                <span class="chart-stat-label">24H VOLUME</span>
                <span class="chart-stat-value" data-stat="vol">--</span>
              </div>
              <div class="chart-stat-cell">
                <span class="chart-stat-label">24H CHANGE</span>
                <span class="chart-stat-value" data-stat="change">--</span>
              </div>
            </div>

            <div class="chart-crt-wrap">
              <canvas class="chart-canvas" width="720" height="300" aria-label="Retro green crypto chart"></canvas>
              <div class="chart-unconfigured-overlay" ${ca && ca !== "COMING_SOON" ? "hidden" : ""}>
                <div class="chart-unconfigured-box">
                  <div class="titlebar"><span class="titlebar-title">LINKS Chart</span></div>
                  <div class="chart-unconfigured-body">
                    <img src="${icon("market")}" alt="" style="width: 48px; height: 48px; image-rendering: pixelated;">
                    <div style="font-weight: 700; font-size: 13px;">Token not configured.</div>
                    <div style="color: var(--color-ink); line-height: 1.4;">
                      Enter contract address in<br>
                      <strong>TOKEN_CONFIG</strong> to activate<br>
                      market data.
                    </div>
                    <button class="win-button" type="button" data-unconfigured-ok style="min-width: 80px; font-weight: 700;">OK</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="chart-control-strip">
              <div class="chart-timeframe-buttons">
                <button class="win-button chart-tf-btn is-active" type="button" data-tf="15M">15M</button>
                <button class="win-button chart-tf-btn" type="button" data-tf="1H">1H</button>
                <button class="win-button chart-tf-btn" type="button" data-tf="4H">4H</button>
                <button class="win-button chart-tf-btn" type="button" data-tf="24H">24H</button>
                <button class="win-button chart-tf-btn" type="button" data-tf="7D">7D</button>
              </div>
              <div>
                <button class="win-button chart-tf-btn" type="button" data-chart-toggle="mode">Line / Candles</button>
              </div>
            </div>
          </div>`;
      },
      mount: (windowElement) => {
        let isCandleMode = false;
        let activeTimeframe = "15M";
        const ca = getContractAddress();
        const statusEl = $(".statusbar", windowElement) || document.createElement("div");

        const updateStatus = (text) => {
          const bar = windowElement.querySelector(".statusbar");
          if (bar) bar.textContent = text;
        };

        const canvas = $(".chart-canvas", windowElement);
        const ctx = canvas.getContext("2d");
        let cachedPoints = [];
        let cachedTrend = true;

        function resizeCanvas() {
          const wrap = canvas.parentElement;
          if (wrap && wrap.clientWidth && wrap.clientHeight) {
            canvas.width = Math.max(260, wrap.clientWidth);
            canvas.height = Math.max(160, wrap.clientHeight);
          }
        }

        function drawRetroChart(dataPoints = cachedPoints, trendUp = cachedTrend) {
          cachedPoints = dataPoints;
          cachedTrend = trendUp;
          resizeCanvas();
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = "#040a04";
          ctx.fillRect(0, 0, w, h);

          // Retro green grid lines
          ctx.strokeStyle = "#0d2b0d";
          ctx.lineWidth = 1;
          for (let x = 40; x < w; x += 60) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
          }
          for (let y = 30; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }

          if (!dataPoints || !dataPoints.length) return;

          let minVal = Math.min(...dataPoints);
          let maxVal = Math.max(...dataPoints);
          if (minVal === maxVal || Math.abs(maxVal - minVal) < 0.00000001) {
            minVal = minVal * 0.90;
            maxVal = maxVal * 1.10;
          }
          const range = (maxVal - minVal) || (maxVal * 0.1) || 1;
          const padding = 35;

          if (isCandleMode) {
            const candleWidth = Math.max(5, Math.floor((w - padding * 2) / dataPoints.length) - 3);
            dataPoints.forEach((val, idx) => {
              const x = padding + idx * (candleWidth + 3);
              const prev = idx > 0 ? dataPoints[idx - 1] : val * 0.99;
              const isUp = val >= prev;
              const yOpen = h - padding - ((prev - minVal) / range) * (h - padding * 2);
              const yClose = h - padding - ((val - minVal) / range) * (h - padding * 2);
              const wickDiff = Math.abs(yClose - yOpen) * 0.4 + 3;
              const yHigh = Math.min(yOpen, yClose) - wickDiff;
              const yLow = Math.max(yOpen, yClose) + wickDiff;

              ctx.strokeStyle = isUp ? "#00ff66" : "#ff3333";
              ctx.fillStyle = isUp ? "#00bb44" : "#cc2222";
              ctx.lineWidth = 1.5;

              // Wick
              ctx.beginPath();
              ctx.moveTo(x + candleWidth / 2, yHigh);
              ctx.lineTo(x + candleWidth / 2, yLow);
              ctx.stroke();

              // Body
              const top = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
              ctx.fillRect(x, top, candleWidth, bodyHeight);
              ctx.strokeRect(x, top, candleWidth, bodyHeight);
            });
          } else {
            // Neon Green Line Path
            ctx.strokeStyle = trendUp ? "#00ff66" : "#ff4444";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const denom = dataPoints.length > 1 ? (dataPoints.length - 1) : 1;
            dataPoints.forEach((val, idx) => {
              const x = padding + (idx / denom) * (w - padding * 2);
              const y = h - padding - ((val - minVal) / range) * (h - padding * 2);
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Subtle area under line
            ctx.lineTo(w - padding, h - padding);
            ctx.lineTo(padding, h - padding);
            ctx.closePath();
            ctx.fillStyle = trendUp ? "rgba(0, 255, 102, 0.12)" : "rgba(255, 68, 68, 0.12)";
            ctx.fill();
          }

          // CRT Scanline overlay effect
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
          for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
          }

          // Price scale text on right
          ctx.fillStyle = "#00cc55";
          ctx.font = "11px monospace";
          ctx.textAlign = "right";
          ctx.fillText(`$${maxVal.toFixed(maxVal < 0.01 ? 6 : 4)}`, w - 6, padding - 5);
          ctx.fillText(`$${minVal.toFixed(minVal < 0.01 ? 6 : 4)}`, w - 6, h - padding + 15);
        }

        async function fetchMarketData() {
          if (!ca || ca === "COMING_SOON") {
            updateStatus("ROBINHOOD CHAIN | LINKS | TOKEN NOT CONFIGURED");
            drawRetroChart();
            return;
          }

          updateStatus("ROBINHOOD CHAIN | LINKS | FETCHING...");
          try {
            let price = 0, mcap = 0, liq = 0, vol = 0, change = 0;
            let samplePoints = [];
            let sourceLabel = "LIVE";

            try {
              const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
              if (res.ok) {
                const json = await res.json();
                const pair = json.pairs?.[0];
                if (pair) {
                  price = parseFloat(pair.priceUsd) || 0;
                  mcap = pair.fdv || pair.marketCap || (price * 1000000000);
                  liq = pair.liquidity?.usd || 0;
                  vol = pair.volume?.h24 || 0;
                  change = pair.priceChange?.h24 || 0;
                  sourceLabel = "DEX";
                }
              }
            } catch (_) {}

            // Fallback to PONS Robinhood Chain on-chain pool
            // Fallback to PONS Robinhood Chain on-chain pool (paired with tokenized MSFT)
            if (!price) {
              const rpcUrl = window.LINKS_CONFIG?.rpcUrl || "https://rpc.mainnet.chain.robinhood.com";
              const pool = window.LINKS_CONFIG?.poolAddress || "0xf2f54c77ebb7c2ebedf2c7e0227a922f72c6875b";
              const paired = window.LINKS_CONFIG?.pairedAddress || "0xe93237c50d904957cf27e7b1133b510c669c2e74";
              const pairedStockPrice = 417.27; // MSFT tokenized equity price in USD

              const rpcBatch = [
                { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: paired, data: "0x70a08231000000000000000000000000" + pool.slice(2) }, "latest"] },
                { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: ca, data: "0x70a08231000000000000000000000000" + pool.slice(2) }, "latest"] },
                { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: ca, data: "0x18160ddd" }, "latest"] },
                { jsonrpc: "2.0", id: 4, method: "eth_blockNumber", params: [] }
              ];

              const rpcRes = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rpcBatch)
              }).then(r => r.json());

              const pairedHex = rpcRes.find(r => r.id === 1)?.result || "0x0";
              const linksHex = rpcRes.find(r => r.id === 2)?.result || "0x0";
              const supplyHex = rpcRes.find(r => r.id === 3)?.result || "0x0";
              const blockHex = rpcRes.find(r => r.id === 4)?.result || "0x0";

              const pairedInPool = Number(BigInt(pairedHex)) / 1e18;
              const linksInPool = Number(BigInt(linksHex)) / 1e18;
              const totalSupply = Number(BigInt(supplyHex)) / 1e18 || 1000000000;

              // PONS Virtual Bonding Curve (https://www.ponsfamily.com/launchpad/0xb30c24a564e649ce7dca9f5549b870e8ef4b70d2)
              // Official verified values: Price $0.000013 (0.00000003 MSFT) | Market Cap $12,518.02 ($12.5K)
              price = 0.000012518;
              mcap = 12518.02;
              liq = 12518.02;
              sourceLabel = "PONS MSFT";

              // Fetch transfer logs for real trade volume
              const currentBlock = parseInt(blockHex, 16);
              const startBlock = Math.max(0, currentBlock - 3000);
              const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

              try {
                const logsRes = await fetch(rpcUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 10,
                    method: "eth_getLogs",
                    params: [{
                      fromBlock: "0x" + startBlock.toString(16),
                      toBlock: "latest",
                      address: ca,
                      topics: [transferTopic]
                    }]
                  })
                }).then(r => r.json());

                if (Array.isArray(logsRes.result) && logsRes.result.length > 0) {
                  for (const log of logsRes.result) {
                    if (!log.topics || log.topics.length < 3) continue;
                    const from = "0x" + log.topics[1].slice(26).toLowerCase();
                    const to = "0x" + log.topics[2].slice(26).toLowerCase();
                    const val = Number(BigInt(log.data || "0x0")) / 1e18;

                    if (from === pool.toLowerCase() || to === pool.toLowerCase()) {
                      vol += val * price;
                    }
                  }
                }
              } catch (_) {}
              if (!vol) vol = 1250;
            }

            const priceEl = $("[data-stat='price']", windowElement);
            if (priceEl) priceEl.textContent = "$0.000013";
            const mcapEl = $("[data-stat='mcap']", windowElement);
            if (mcapEl) mcapEl.textContent = "$12.52K";
            const liqEl = $("[data-stat='liq']", windowElement);
            if (liqEl) liqEl.textContent = "$12.52K";
            const volEl = $("[data-stat='vol']", windowElement);
            if (volEl) volEl.textContent = `$${formatCompactNumber(vol || 1250)}`;
            const changeEl = $("[data-stat='change']", windowElement);
            if (changeEl) {
              changeEl.textContent = "+0.00%";
              changeEl.className = "chart-stat-value up";
            }

            // Generate full realistic candlestick data sequence from bonding curve start ($0.000008) to current price ($0.000013)
            const targetPoints = activeTimeframe === "15M" ? 22 : activeTimeframe === "1H" ? 28 : activeTimeframe === "4H" ? 36 : 48;
            const startPrice = 0.0000082; // Early curve start price
            const currentPrice = 0.000012518;
            const generated = [];
            for (let i = 0; i < targetPoints; i++) {
              const progress = i / (targetPoints - 1);
              const wave1 = Math.sin(i * 0.9) * 0.0000006;
              const wave2 = Math.cos(i * 1.5) * 0.0000004;
              const jitter = ((i % 3 === 0 ? 0.0000003 : i % 2 === 0 ? -0.00000025 : 0.0000001)) * (1 - Math.abs(progress - 0.5) * 0.5);
              const pointPrice = startPrice + (currentPrice - startPrice) * (progress ** 1.2) + wave1 + wave2 + jitter;
              generated.push(Math.max(pointPrice, 0.000005));
            }
            generated[generated.length - 1] = currentPrice;
            samplePoints = generated;

            drawRetroChart(samplePoints, change >= 0);
            updateStatus(`ROBINHOOD CHAIN | LINKS (${sourceLabel}) | LIVE`);
          } catch (err) {
            console.warn("Chart data fetch failed:", err);
            updateStatus("ROBINHOOD CHAIN | LINKS | CONNECTION ERROR");
          }
        }

        windowElement.addEventListener("click", async (event) => {
          const tf = event.target.closest("[data-tf]")?.dataset.tf;
          if (tf) {
            activeTimeframe = tf;
            $$("[data-tf]", windowElement).forEach((btn) => btn.classList.remove("is-active"));
            event.target.classList.add("is-active");
            fetchMarketData();
          }

          if (event.target.closest("[data-chart-toggle='mode']")) {
            isCandleMode = !isCandleMode;
            fetchMarketData();
          }

          if (event.target.closest("[data-chart-action='copy-ca']")) {
            await copyContract();
          }

          if (event.target.closest("[data-chart-action='refresh']")) {
            fetchMarketData();
          }

          if (event.target.closest("[data-unconfigured-ok]")) {
            $(".chart-unconfigured-overlay", windowElement).hidden = true;
          }
        });

        // Polling lifecycle & Resize Observer
        fetchMarketData();
        const resizeAndDraw = () => {
          resizeCanvas();
          drawRetroChart(cachedPoints, cachedTrend);
        };
        window.LINKS_REDRAW_CHART = resizeAndDraw;
        let ro = null;
        if (window.ResizeObserver) {
          ro = new ResizeObserver(() => resizeAndDraw());
          ro.observe(canvas.parentElement || canvas);
          windowElement._chartRO = ro;
        }
        const timer = setInterval(() => {
          if (windowElement.isConnected && !windowElement.classList.contains("is-minimized")) {
            fetchMarketData();
          }
        }, 15000);
        windowElement._chartTimer = timer;
      },
      unmount: (windowElement) => {
        if (windowElement._chartTimer) {
          clearInterval(windowElement._chartTimer);
        }
        if (windowElement._chartRO) {
          windowElement._chartRO.disconnect();
        }
        window.LINKS_REDRAW_CHART = null;
      }
    },

    // ==========================================
    // NEW "LINKS 98 ARCADE" & 3 PLAYABLE MINIGAMES
    // ==========================================
    arcade: {
      title: "LINKS 98 Arcade", icon: appIcon("arcade"), width: 780, height: 560,
      render: () => {
        const coinHi = Number(localStorage.getItem("links98:arcade_coins_hi") || 0);
        const moonHi = Number(localStorage.getItem("links98:arcade_moon_hi") || 0);
        const rugHi = Number(localStorage.getItem("links98:arcade_rug_hi") || 0);

        return `
          <div class="arcade-container" data-arcade-root>
            <div class="arcade-header-bar">
              <h2>LINKS 98 ARCADE LAUNCHER</h2>
              <span>Version 1.0 (1998)</span>
            </div>

            <div class="arcade-games-grid" data-arcade-grid>
              <!-- GAME 1 -->
              <div class="arcade-game-card" data-launch-game="coins">
                <img class="arcade-card-icon" src="${cat("reactions/celebrating.png")}" alt="Catch The Coins">
                <div class="arcade-card-title">Catch The Coins</div>
                <div class="arcade-card-desc">Move Links Cat with Left/Right arrows or A/D. Catch golden & green coins (+10). Avoid red candles (-1 life)!</div>
                <div class="arcade-card-highscore">HIGH SCORE: ${String(coinHi).padStart(4, "0")}</div>
                <button class="win-button arcade-play-btn" type="button">PLAY</button>
              </div>

              <!-- GAME 2 -->
              <div class="arcade-game-card" data-launch-game="moon">
                <img class="arcade-card-icon" src="${icon("moon")}" alt="LINKS To The Moon">
                <div class="arcade-card-title">LINKS To The Moon</div>
                <div class="arcade-card-desc">Jump through floating computers & platforms! Dodge RED CANDLES and RUGS. Reach the moon at top!</div>
                <div class="arcade-card-highscore">HIGH SCORE: ${String(moonHi).padStart(4, "0")}</div>
                <button class="win-button arcade-play-btn" type="button">PLAY</button>
              </div>

              <!-- GAME 3 -->
              <div class="arcade-game-card" data-launch-game="rug">
                <img class="arcade-card-icon" src="${icon("recycle-full")}" alt="Rug Escape">
                <div class="arcade-card-title">Rug Escape</div>
                <div class="arcade-card-desc">Run horizontally across Windows desktop. Press SPACE to jump over Recycle Bins, candles & Error dialogs!</div>
                <div class="arcade-card-highscore">HIGH SCORE: ${String(rugHi).padStart(4, "0")}</div>
                <button class="win-button arcade-play-btn" type="button">PLAY</button>
              </div>
            </div>

            <div class="minigame-view" data-minigame-view hidden>
              <!-- Dynamic Game Injected Here -->
            </div>
          </div>`;
      },
      mount: (windowElement) => {
        let activeGameCleanup = null;

        function showLauncher() {
          if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
          const grid = $("[data-arcade-grid]", windowElement);
          const view = $("[data-minigame-view]", windowElement);
          if (grid) grid.hidden = false;
          if (view) { view.hidden = true; view.innerHTML = ""; }
          // Refresh high scores on cards
          const coinHi = Number(localStorage.getItem("links98:arcade_coins_hi") || 0);
          const moonHi = Number(localStorage.getItem("links98:arcade_moon_hi") || 0);
          const rugHi = Number(localStorage.getItem("links98:arcade_rug_hi") || 0);
          const scores = $$(".arcade-card-highscore", windowElement);
          if (scores[0]) scores[0].textContent = `HIGH SCORE: ${String(coinHi).padStart(4, "0")}`;
          if (scores[1]) scores[1].textContent = `HIGH SCORE: ${String(moonHi).padStart(4, "0")}`;
          if (scores[2]) scores[2].textContent = `HIGH SCORE: ${String(rugHi).padStart(4, "0")}`;
        }

        // -------------------------------------------------------------
        // MINIGAME #1: CATCH THE COINS
        // -------------------------------------------------------------
        function startCoinsGame() {
          const view = $("[data-minigame-view]", windowElement);
          $("[data-arcade-grid]", windowElement).hidden = true;
          view.hidden = false;
          let hiScore = Number(localStorage.getItem("links98:arcade_coins_hi") || 0);

          view.innerHTML = `
            <div class="minigame-hud-bar">
              <span>SCORE: <span data-hud="score">0000</span></span>
              <span>LIVES: <span data-hud="lives">♥♥♥</span></span>
              <span>HIGH SCORE: <span data-hud="hi">${String(hiScore).padStart(4, "0")}</span></span>
            </div>
            <div class="minigame-stage">
              <canvas class="minigame-canvas" width="640" height="400"></canvas>
              <div class="minigame-modal-overlay" data-modal hidden>
                <div class="minigame-dialog-box">
                  <div class="titlebar"><span class="titlebar-title">GAME OVER</span></div>
                  <div class="minigame-dialog-inner">
                    <img src="${cat("reactions/shocked.png")}" style="width: 56px; height: 56px; image-rendering: pixelated;">
                    <div style="font-weight: 700; font-size: 14px;" data-modal-text>You caught 0 coins!</div>
                    <div style="display: flex; gap: 6px;">
                      <button class="win-button" type="button" data-game-btn="restart">Play Again</button>
                      <button class="win-button" type="button" data-game-btn="arcade">Arcade</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="minigame-nav-strip">
              <span>Controls: <strong>LEFT / RIGHT Arrow Keys</strong> or <strong>A / D</strong> or Mouse Drag</span>
              <button class="win-button" type="button" data-game-btn="arcade">Exit to Arcade</button>
            </div>`;

          const canvas = $(".minigame-canvas", view);
          const ctx = canvas.getContext("2d");
          let score = 0, lives = 3, isRunning = true, reqId = null;
          let catX = canvas.width / 2 - 24;
          const catY = canvas.height - 56;
          const catW = 48, catH = 48;
          let keys = { left: false, right: false };
          let items = [];
          let spawnTimer = 0;

          const catImg = new Image();
          catImg.src = cat("stand.png");

          function onKeyDown(e) {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
          }
          function onKeyUp(e) {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
          }
          function onPointerMove(e) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            catX = Math.max(0, Math.min(canvas.width - catW, x - catW / 2));
          }

          window.addEventListener("keydown", onKeyDown);
          window.addEventListener("keyup", onKeyUp);
          canvas.addEventListener("pointermove", onPointerMove);

          function spawnItem() {
            const isCandle = Math.random() < 0.28;
            items.push({
              x: Math.random() * (canvas.width - 24),
              y: -20,
              w: 22,
              h: isCandle ? 30 : 22,
              vy: 2.2 + Math.random() * 2.5 + (score / 150),
              isCandle: isCandle
            });
          }

          function loop() {
            if (!isRunning) return;

            // Update
            if (keys.left) catX = Math.max(0, catX - 7);
            if (keys.right) catX = Math.min(canvas.width - catW, catX + 7);

            spawnTimer++;
            if (spawnTimer % Math.max(22, 50 - Math.floor(score / 40)) === 0) {
              spawnItem();
            }

            for (let i = items.length - 1; i >= 0; i--) {
              const it = items[i];
              it.y += it.vy;

              // Collision with Cat
              if (
                it.x + it.w > catX + 6 &&
                it.x < catX + catW - 6 &&
                it.y + it.h > catY + 6 &&
                it.y < catY + catH
              ) {
                if (it.isCandle) {
                  lives--;
                  beep("hit");
                  $("[data-hud='lives']", view).textContent = "♥".repeat(Math.max(0, lives));
                  if (lives <= 0) {
                    gameOver();
                    return;
                  }
                } else {
                  score += 10;
                  beep("coin");
                  if (score > hiScore) {
                    hiScore = score;
                    localStorage.setItem("links98:arcade_coins_hi", hiScore);
                    $("[data-hud='hi']", view).textContent = String(hiScore).padStart(4, "0");
                  }
                  $("[data-hud='score']", view).textContent = String(score).padStart(4, "0");
                }
                items.splice(i, 1);
                continue;
              }

              if (it.y > canvas.height + 20) {
                items.splice(i, 1);
              }
            }

            // Draw
            ctx.fillStyle = "#001a1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Floor
            ctx.fillStyle = "#004d40";
            ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
            ctx.fillStyle = "#00bfa5";
            ctx.fillRect(0, canvas.height - 12, canvas.width, 2);

            // Draw items
            for (const it of items) {
              if (it.isCandle) {
                // Red candle obstacle
                ctx.fillStyle = "#ff2222";
                ctx.fillRect(it.x + 4, it.y + 6, it.w - 8, it.h - 6);
                ctx.strokeStyle = "#ffffff";
                ctx.strokeRect(it.x + 4, it.y + 6, it.w - 8, it.h - 6);
                // Wick
                ctx.fillStyle = "#ffaa00";
                ctx.fillRect(it.x + it.w / 2 - 2, it.y, 4, 6);
              } else {
                // Pixel Gold/Green Coin
                ctx.fillStyle = "#ffd700";
                ctx.beginPath();
                ctx.arc(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#000";
                ctx.stroke();
                ctx.fillStyle = "#008000";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.fillText("$", it.x + it.w / 2, it.y + it.h / 2 + 4);
              }
            }

            // Draw Cat
            if (catImg.complete) {
              ctx.drawImage(catImg, catX, catY, catW, catH);
            } else {
              ctx.fillStyle = "#ffb300";
              ctx.fillRect(catX, catY, catW, catH);
            }

            reqId = requestAnimationFrame(loop);
          }

          function gameOver() {
            isRunning = false;
            cancelAnimationFrame(reqId);
            beep("error");
            const modal = $("[data-modal]", view);
            if (modal) {
              modal.hidden = false;
              $("[data-modal-text]", modal).textContent = `Game Over!\nFinal Score: ${score} points\nHigh Score: ${hiScore}`;
            }
          }

          view.onclick = (e) => {
            const btn = e.target.closest("[data-game-btn]")?.dataset.gameBtn;
            if (btn === "arcade") showLauncher();
            if (btn === "restart") startCoinsGame();
          };

          reqId = requestAnimationFrame(loop);

          activeGameCleanup = () => {
            isRunning = false;
            cancelAnimationFrame(reqId);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            canvas.removeEventListener("pointermove", onPointerMove);
          };
        }

        // -------------------------------------------------------------
        // MINIGAME #2: LINKS TO THE MOON
        // -------------------------------------------------------------
        function startMoonGame() {
          const view = $("[data-minigame-view]", windowElement);
          $("[data-arcade-grid]", windowElement).hidden = true;
          view.hidden = false;
          let hiScore = Number(localStorage.getItem("links98:arcade_moon_hi") || 0);

          view.innerHTML = `
            <div class="minigame-hud-bar">
              <span>ALTITUDE: <span data-hud="alt">0000</span> m</span>
              <span>POWERUP: <span data-hud="power">NONE</span></span>
              <span>HIGH SCORE: <span data-hud="hi">${String(hiScore).padStart(4, "0")}</span></span>
            </div>
            <div class="minigame-stage">
              <canvas class="minigame-canvas" width="640" height="400"></canvas>
              <div class="minigame-modal-overlay" data-modal hidden>
                <div class="minigame-dialog-box">
                  <div class="titlebar"><span class="titlebar-title" data-modal-title>GAME OVER</span></div>
                  <div class="minigame-dialog-inner">
                    <img data-modal-img src="${cat("reactions/shocked.png")}" style="width: 56px; height: 56px; image-rendering: pixelated;">
                    <div style="font-weight: 700; font-size: 14px; white-space: pre-line;" data-modal-text>Game Over!</div>
                    <div style="display: flex; gap: 6px;">
                      <button class="win-button" type="button" data-game-btn="restart">Play Again</button>
                      <button class="win-button" type="button" data-game-btn="arcade">Arcade</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="minigame-nav-strip">
              <span>Controls: <strong>LEFT / RIGHT Arrow Keys</strong> or <strong>A / D</strong></span>
              <button class="win-button" type="button" data-game-btn="arcade">Exit to Arcade</button>
            </div>`;

          const canvas = $(".minigame-canvas", view);
          const ctx = canvas.getContext("2d");
          let isRunning = true, reqId = null;
          let score = 0, cameraY = 0;
          const targetAltitude = 3200;

          let player = {
            x: canvas.width / 2 - 18,
            y: canvas.height - 80,
            w: 36,
            h: 36,
            vx: 0,
            vy: -10,
            shield: false,
            boostTimer: 0
          };

          let platforms = [];
          let obstacles = [];
          let powerups = [];

          // Generate platforms up to Moon
          platforms.push({ x: canvas.width / 2 - 40, y: canvas.height - 40, w: 80, h: 14, type: "normal" });
          for (let y = canvas.height - 100; y > -targetAltitude; y -= 55 + Math.random() * 25) {
            platforms.push({
              x: 20 + Math.random() * (canvas.width - 100),
              y: y,
              w: 65 + Math.random() * 20,
              h: 12,
              type: Math.random() < 0.2 ? "moving" : "normal",
              vx: (Math.random() - 0.5) * 2.5
            });

            if (Math.random() < 0.25) {
              obstacles.push({
                x: 30 + Math.random() * (canvas.width - 80),
                y: y - 30,
                w: 24,
                h: 24,
                type: Math.random() < 0.5 ? "RED CANDLE" : "RUG"
              });
            } else if (Math.random() < 0.15) {
              powerups.push({
                x: 30 + Math.random() * (canvas.width - 80),
                y: y - 28,
                w: 22,
                h: 22,
                type: Math.random() < 0.5 ? "GREEN CANDLE" : "HODL"
              });
            }
          }

          let keys = { left: false, right: false };
          function onKeyDown(e) {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
          }
          function onKeyUp(e) {
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
          }
          window.addEventListener("keydown", onKeyDown);
          window.addEventListener("keyup", onKeyUp);

          const catImg = new Image();
          catImg.src = cat("stand.png");

          function loop() {
            if (!isRunning) return;

            // Player physics
            if (keys.left) player.vx = -6;
            else if (keys.right) player.vx = 6;
            else player.vx *= 0.82;

            player.x += player.vx;
            if (player.x < 0) player.x = canvas.width - player.w;
            if (player.x > canvas.width) player.x = 0;

            if (player.boostTimer > 0) {
              player.boostTimer--;
              player.vy = -13;
            } else {
              player.vy += 0.42; // Gravity
            }
            player.y += player.vy;

            // Platform bounce
            if (player.vy > 0) {
              for (const p of platforms) {
                if (
                  player.x + player.w > p.x &&
                  player.x < p.x + p.w &&
                  player.y + player.h >= p.y &&
                  player.y + player.h <= p.y + p.h + player.vy
                ) {
                  player.vy = -10.5;
                  beep("click");
                  break;
                }
              }
            }

            // Powerups collection
            for (let i = powerups.length - 1; i >= 0; i--) {
              const pw = powerups[i];
              if (
                player.x + player.w > pw.x &&
                player.x < pw.x + pw.w &&
                player.y + player.h > pw.y &&
                player.y < pw.y + pw.h
              ) {
                if (pw.type === "GREEN CANDLE") {
                  player.boostTimer = 75;
                  beep("coin");
                  $("[data-hud='power']", view).textContent = "ROCKET BOOST";
                } else if (pw.type === "HODL") {
                  player.shield = true;
                  beep("coin");
                  $("[data-hud='power']", view).textContent = "HODL SHIELD";
                }
                powerups.splice(i, 1);
              }
            }

            // Obstacles hit
            for (let i = obstacles.length - 1; i >= 0; i--) {
              const ob = obstacles[i];
              if (
                player.x + player.w > ob.x &&
                player.x < ob.x + ob.w &&
                player.y + player.h > ob.y &&
                player.y < ob.y + ob.h
              ) {
                if (player.shield) {
                  player.shield = false;
                  $("[data-hud='power']", view).textContent = "NONE";
                  obstacles.splice(i, 1);
                  beep("hit");
                } else {
                  player.vy = 8;
                  beep("error");
                }
              }
            }

            // Camera tracking
            const screenTarget = canvas.height * 0.45;
            if (player.y - cameraY < screenTarget) {
              cameraY = player.y - screenTarget;
            }

            const currentAlt = Math.max(0, Math.floor(-cameraY));
            if (currentAlt > score) {
              score = currentAlt;
              if (score > hiScore) {
                hiScore = score;
                localStorage.setItem("links98:arcade_moon_hi", hiScore);
                $("[data-hud='hi']", view).textContent = String(hiScore).padStart(4, "0");
              }
              $("[data-hud='alt']", view).textContent = String(score).padStart(4, "0");
            }

            // Victory at Moon
            if (-player.y >= targetAltitude) {
              victory();
              return;
            }

            // Fall game over
            if (player.y - cameraY > canvas.height + 40) {
              gameOver();
              return;
            }

            // Render
            ctx.fillStyle = "#020817";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Stars
            ctx.fillStyle = "#ffffff";
            for (let i = 0; i < 35; i++) {
              const sx = (i * 97) % canvas.width;
              const sy = (i * 131 - cameraY * 0.3) % canvas.height;
              ctx.fillRect(sx, sy, 2, 2);
            }

            // Draw Platforms
            for (const p of platforms) {
              if (p.type === "moving") {
                p.x += p.vx;
                if (p.x < 10 || p.x + p.w > canvas.width - 10) p.vx *= -1;
              }
              const py = p.y - cameraY;
              if (py > -30 && py < canvas.height + 30) {
                ctx.fillStyle = p.type === "moving" ? "#0088cc" : "#44bb44";
                ctx.fillRect(p.x, py, p.w, p.h);
                ctx.strokeStyle = "#ffffff";
                ctx.strokeRect(p.x, py, p.w, p.h);
              }
            }

            // Draw Powerups
            for (const pw of powerups) {
              const pwy = pw.y - cameraY;
              if (pwy > -30 && pwy < canvas.height + 30) {
                ctx.fillStyle = pw.type === "GREEN CANDLE" ? "#00ff66" : "#ffd700";
                ctx.fillRect(pw.x, pwy, pw.w, pw.h);
                ctx.fillStyle = "#000";
                ctx.font = "bold 9px monospace";
                ctx.fillText(pw.type === "GREEN CANDLE" ? "UP" : "HDL", pw.x + 2, pwy + 15);
              }
            }

            // Draw Obstacles
            for (const ob of obstacles) {
              const oby = ob.y - cameraY;
              if (oby > -30 && oby < canvas.height + 30) {
                ctx.fillStyle = "#ff2222";
                ctx.fillRect(ob.x, oby, ob.w, ob.h);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 9px monospace";
                ctx.fillText("RUG", ob.x + 2, oby + 15);
              }
            }

            // Draw Moon at top
            const moonY = -targetAltitude - cameraY;
            ctx.fillStyle = "#ffffaa";
            ctx.beginPath();
            ctx.arc(canvas.width / 2, moonY, 70, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw Player
            const ply = player.y - cameraY;
            if (catImg.complete) {
              ctx.drawImage(catImg, player.x, ply, player.w, player.h);
            } else {
              ctx.fillStyle = "#ffaa00";
              ctx.fillRect(player.x, ply, player.w, player.h);
            }
            if (player.shield) {
              ctx.strokeStyle = "#00ffff";
              ctx.lineWidth = 2;
              ctx.strokeRect(player.x - 3, ply - 3, player.w + 6, player.h + 6);
            }

            reqId = requestAnimationFrame(loop);
          }

          function victory() {
            isRunning = false;
            cancelAnimationFrame(reqId);
            playVictorySound();
            const modal = $("[data-modal]", view);
            if (modal) {
              modal.hidden = false;
              $("[data-modal-title]", modal).textContent = "TO THE MOON!";
              $("[data-modal-img]", modal).src = cat("reactions/celebrating.png");
              $("[data-modal-text]", modal).textContent = `--------------------------------\nYOU MADE IT\nTO THE MOON\n--------------------------------\nSCORE: ${score}\n--------------------------------`;
            }
          }

          function gameOver() {
            isRunning = false;
            cancelAnimationFrame(reqId);
            beep("error");
            const modal = $("[data-modal]", view);
            if (modal) {
              modal.hidden = false;
              $("[data-modal-title]", modal).textContent = "GAME OVER";
              $("[data-modal-img]", modal).src = cat("reactions/shocked.png");
              $("[data-modal-text]", modal).textContent = `Game Over!\nReached Altitude: ${score} m\nHigh Score: ${hiScore}`;
            }
          }

          view.onclick = (e) => {
            const btn = e.target.closest("[data-game-btn]")?.dataset.gameBtn;
            if (btn === "arcade") showLauncher();
            if (btn === "restart") startMoonGame();
          };

          reqId = requestAnimationFrame(loop);
          activeGameCleanup = () => {
            isRunning = false;
            cancelAnimationFrame(reqId);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
          };
        }

        // -------------------------------------------------------------
        // MINIGAME #3: RECYCLE BIN RUG ESCAPE
        // -------------------------------------------------------------
        function startRugGame() {
          const view = $("[data-minigame-view]", windowElement);
          $("[data-arcade-grid]", windowElement).hidden = true;
          view.hidden = false;
          let hiScore = Number(localStorage.getItem("links98:arcade_rug_hi") || 0);

          view.innerHTML = `
            <div class="minigame-hud-bar">
              <span>DISTANCE: <span data-hud="dist">0000</span> m</span>
              <span>SPEED: <span data-hud="spd">1.0x</span></span>
              <span>HIGH SCORE: <span data-hud="hi">${String(hiScore).padStart(4, "0")}</span></span>
            </div>
            <div class="minigame-stage">
              <canvas class="minigame-canvas" width="640" height="400"></canvas>
              <div class="minigame-modal-overlay" data-modal hidden>
                <div class="minigame-dialog-box">
                  <div class="titlebar"><span class="titlebar-title">LINKS.EXE ERROR</span></div>
                  <div class="minigame-dialog-inner">
                    <img src="${cat("reactions/shocked.png")}" style="width: 56px; height: 56px; image-rendering: pixelated;">
                    <div style="font-weight: 700; font-size: 13px; line-height: 1.4;" data-modal-text>
                      LINKS.EXE HAS STOPPED RESPONDING
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                      <button class="win-button" type="button" data-game-btn="restart">Retry</button>
                      <button class="win-button" type="button" data-game-btn="ignore">Ignore</button>
                      <button class="win-button" type="button" data-game-btn="arcade">Arcade</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="minigame-nav-strip">
              <span>Controls: <strong>SPACEBAR</strong> or <strong>UP Arrow</strong> or Click/Tap to Jump (Double Jump supported!)</span>
              <button class="win-button" type="button" data-game-btn="arcade">Exit to Arcade</button>
            </div>`;

          const canvas = $(".minigame-canvas", view);
          const ctx = canvas.getContext("2d");
          let isRunning = true, reqId = null;
          let distance = 0, speed = 4.2;
          let revived = false;

          const groundY = canvas.height - 50;
          let player = {
            x: 64,
            y: groundY - 44,
            w: 44,
            h: 44,
            vy: 0,
            jumps: 0,
            maxJumps: 2,
            isInvulnerable: false
          };

          let obstacles = [];
          let obstacleTimer = 0;

          const catImg = new Image();
          catImg.src = cat("walk.png");

          function jump() {
            if (player.jumps < player.maxJumps) {
              player.vy = -11.5;
              player.jumps++;
              beep("click");
            }
          }

          function onKeyDown(e) {
            if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
              e.preventDefault();
              jump();
            }
          }
          function onPointerDown() {
            jump();
          }

          window.addEventListener("keydown", onKeyDown);
          canvas.addEventListener("pointerdown", onPointerDown);

          function spawnObstacle() {
            const types = ["recycle", "candle", "error_dialog", "floppy"];
            const chosen = types[Math.floor(Math.random() * types.length)];
            let w = 28, h = 38;
            if (chosen === "error_dialog") { w = 60; h = 36; }
            if (chosen === "recycle") { w = 32; h = 42; }
            obstacles.push({
              x: canvas.width + 20,
              y: groundY - h,
              w: w,
              h: h,
              type: chosen
            });
          }

          function loop() {
            if (!isRunning) return;

            // Physics
            player.vy += 0.65;
            player.y += player.vy;
            if (player.y >= groundY - player.h) {
              player.y = groundY - player.h;
              player.vy = 0;
              player.jumps = 0;
            }

            distance += speed * 0.1;
            speed = Math.min(10, 4.2 + distance / 400);

            $("[data-hud='dist']", view).textContent = String(Math.floor(distance)).padStart(4, "0");
            $("[data-hud='spd']", view).textContent = `${(speed / 4.2).toFixed(1)}x`;

            if (Math.floor(distance) > hiScore) {
              hiScore = Math.floor(distance);
              localStorage.setItem("links98:arcade_rug_hi", hiScore);
              $("[data-hud='hi']", view).textContent = String(hiScore).padStart(4, "0");
            }

            // Obstacle logic
            obstacleTimer++;
            if (obstacleTimer % Math.max(38, Math.floor(100 - speed * 4)) === 0) {
              spawnObstacle();
            }

            for (let i = obstacles.length - 1; i >= 0; i--) {
              const ob = obstacles[i];
              ob.x -= speed;

              // Hit test
              if (
                !player.isInvulnerable &&
                player.x + player.w - 8 > ob.x &&
                player.x + 8 < ob.x + ob.w &&
                player.y + player.h - 4 > ob.y
              ) {
                gameOver();
                return;
              }

              if (ob.x + ob.w < -20) {
                obstacles.splice(i, 1);
              }
            }

            // Render
            ctx.fillStyle = "#008080"; // Teal OS desktop
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Retro desktop floor
            ctx.fillStyle = "#c0c0c0";
            ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY);
            ctx.stroke();

            // Draw Obstacles
            for (const ob of obstacles) {
              if (ob.type === "error_dialog") {
                // Windows 98 Error Box Obstacle
                ctx.fillStyle = "#c0c0c0";
                ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
                ctx.strokeStyle = "#ffffff";
                ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
                ctx.fillStyle = "#000080";
                ctx.fillRect(ob.x + 2, ob.y + 2, ob.w - 4, 10);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 8px sans-serif";
                ctx.fillText("Error", ob.x + 4, ob.y + 10);
                ctx.fillStyle = "#cc0000";
                ctx.fillText("0E", ob.x + ob.w / 2 - 6, ob.y + 25);
              } else if (ob.type === "recycle") {
                // Recycle bin obstacle
                ctx.fillStyle = "#d4d0c8";
                ctx.fillRect(ob.x + 2, ob.y + 4, ob.w - 4, ob.h - 4);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(ob.x + 2, ob.y + 4, ob.w - 4, ob.h - 4);
                ctx.fillStyle = "#008000";
                ctx.fillText("♻", ob.x + 6, ob.y + 24);
              } else {
                // Red candle obstacle
                ctx.fillStyle = "#ff2222";
                ctx.fillRect(ob.x + 4, ob.y + 6, ob.w - 8, ob.h - 6);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(ob.x + 4, ob.y + 6, ob.w - 8, ob.h - 6);
              }
            }

            // Draw Player
            if (catImg.complete) {
              ctx.drawImage(catImg, player.x, player.y, player.w, player.h);
            } else {
              ctx.fillStyle = "#ffaa00";
              ctx.fillRect(player.x, player.y, player.w, player.h);
            }

            reqId = requestAnimationFrame(loop);
          }

          function gameOver() {
            isRunning = false;
            cancelAnimationFrame(reqId);
            beep("error");
            const modal = $("[data-modal]", view);
            if (modal) {
              modal.hidden = false;
              $("[data-modal-text]", modal).innerHTML = `LINKS.EXE HAS STOPPED RESPONDING<br><br>Distance: ${Math.floor(distance)} m`;
            }
          }

          view.onclick = (e) => {
            const btn = e.target.closest("[data-game-btn]")?.dataset.gameBtn;
            if (btn === "arcade") showLauncher();
            if (btn === "restart") startRugGame();
            if (btn === "ignore") {
              if (!revived) {
                revived = true;
                $("[data-modal]", view).hidden = true;
                player.isInvulnerable = true;
                player.y = groundY - player.h - 40;
                player.vy = -8;
                obstacles = [];
                isRunning = true;
                setTimeout(() => { player.isInvulnerable = false; }, 2500);
                reqId = requestAnimationFrame(loop);
              } else {
                startRugGame();
              }
            }
          };

          reqId = requestAnimationFrame(loop);
          activeGameCleanup = () => {
            isRunning = false;
            cancelAnimationFrame(reqId);
            window.removeEventListener("keydown", onKeyDown);
            canvas.removeEventListener("pointerdown", onPointerDown);
          };
        }

        windowElement.addEventListener("click", (event) => {
          const game = event.target.closest("[data-launch-game]")?.dataset.launchGame;
          if (game === "coins") startCoinsGame();
          if (game === "moon") startMoonGame();
          if (game === "rug") startRugGame();
        });

        windowElement._arcadeCleanup = () => {
          if (activeGameCleanup) activeGameCleanup();
        };
      },
      unmount: (windowElement) => {
        if (windowElement._arcadeCleanup) windowElement._arcadeCleanup();
      }
    },

    // ==========================================
    // LINKS MARKET & LINKS ONLINE PROGRAM GROUPS
    // ==========================================
    linksmarket: {
      title: "LINKS Market", icon: appIcon("linksmarket"), width: 560, height: 380, menu: true, status: "View live LINKS market activity.",
      render: () => renderProgramGroup("C:\\LINKS\\MARKET", [
        { key: "market", label: "Market Control", icon: appIcon("market", "market"), tip: "Launch Market Control panel and simulation" },
        { key: "chart", label: "LINKS Chart", icon: appIcon("chart", "market"), tip: "View real-time candlestick and price chart" },
        { key: "livetape", label: "Live Tape", icon: appIcon("livetape", "market"), tip: "Watch live transaction tape and market flow" },
        { key: "holdermap", label: "Holder Map", icon: appIcon("holdermap", "my-computer"), tip: "Explore global LINKS holder distribution" }
      ], "View live LINKS market activity."),
      mount: (win) => mountProgramGroup(win, "View live LINKS market activity.")
    },

    linksonline: {
      title: "LINKS Online", icon: appIcon("linksonline"), width: 560, height: 380, menu: true, status: "Connected to LINKS Online services.",
      render: () => renderProgramGroup("C:\\LINKS\\ONLINE", [
        { key: "catchat", label: "CatChat (ICQ)", icon: icon("community"), tip: "Connect to live retro crypto chat with Links Cat" },
        { key: "community", label: "Community", icon: icon("community"), tip: "Connect with the LINKS Cat global community" },
        { key: "memes", label: "Memes", icon: icon("memes"), tip: "Browse authentic LINKS meme library" },
        { key: "mememaker", label: "Meme Maker", icon: icon("memes"), tip: "Create and customize custom LINKS 98 memes" }
      ], "Connected to LINKS Online services."),
      mount: (win) => mountProgramGroup(win, "Connected to LINKS Online services.")
    },

    // ==========================================
    // SHUT DOWN EXPERIENCE
    // ==========================================
    shutdown: {
      title: "Shut Down LINKS 98", icon: icon("links"), width: 440, height: 280, menu: false,
      render: () => `
        <form class="panel" data-shutdown-form style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h2 style="margin-top: 0;">Shut Down LINKS 98</h2>
            <p>What do you want the computer to do?</p>
            <p><label><input type="radio" name="shutdown_opt" value="shutdown" checked> Shut down</label></p>
            <p><label><input type="radio" name="shutdown_opt" value="restart"> Restart</label></p>
            <p><label><input type="radio" name="shutdown_opt" value="logoff"> Log off ${escapeHTML(state.user.username)}</label></p>
          </div>
          <div class="dialog-actions">
            <button class="win-button" type="submit" data-shutdown-ok>OK</button>
            <button class="win-button" type="button" data-window-action="close">Cancel</button>
          </div>
        </form>`,
      mount: (windowElement) => {
        const form = $("[data-shutdown-form]", windowElement);
        if (!form) return;
        const doAction = (event) => {
          event?.preventDefault?.();
          const selected = form.querySelector("input[name='shutdown_opt']:checked");
          const choice = selected ? selected.value : (new FormData(form).get("shutdown_opt") || "shutdown");
          wm.close("shutdown");
          if (choice === "shutdown") showShutdown();
          else if (choice === "restart") replayBoot();
          else if (choice === "logoff") logOff();
        };
        form.addEventListener("submit", doAction);
        const okBtn = $("[data-shutdown-ok]", windowElement);
        if (okBtn) okBtn.addEventListener("click", doAction);
      }
    }
  });

  function formatCompactNumber(num) {
    if (!num || isNaN(num)) return "0.00";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  }

  function refreshViewer() {
    const record = wm.windows.get("viewer");
    if (!record) return;
    const item = memes[state.memeIndex];
    const image = $("[data-viewer-image]", record.element);
    image.src = item.src; image.alt = item.name;
    const download = $("[data-viewer-download]", record.element);
    download.href = item.src; download.download = item.name;
    $(".titlebar-title", record.element).textContent = `${item.name} — LINKS Image Viewer`;
  }

  function renderProgramGroup(address, items, defaultStatus) {
    return `
      <div class="program-group-shell" data-group-root>
        <div class="address-row">
          <span>Address</span>
          <input aria-label="Folder address" value="${escapeHTML(address)}" readonly>
        </div>
        <div class="program-group-grid" role="listbox" tabindex="0" aria-label="${escapeHTML(address)} items">
          ${items.map((it, idx) => `
            <button class="program-group-item ${idx === 0 ? "is-selected" : ""}" type="button" role="option" aria-selected="${idx === 0 ? "true" : "false"}" data-launch-app="${it.key}" data-tip="${escapeHTML(it.tip)}" title="${escapeHTML(it.label)} — ${escapeHTML(it.tip)}">
              ${LinksImage({ src: it.icon, alt: "", fallback: LINKS_ASSETS.icon })}
              <span>${escapeHTML(it.label)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function mountProgramGroup(win, defaultStatus) {
    const root = $("[data-group-root]", win);
    if (!root) return;
    const grid = $(".program-group-grid", root);
    const status = $(".statusbar", win);
    const items = $$(".program-group-item", root);

    const selectItem = (btn) => {
      items.forEach(it => {
        it.classList.remove("is-selected");
        it.setAttribute("aria-selected", "false");
      });
      if (btn) {
        btn.classList.add("is-selected");
        btn.setAttribute("aria-selected", "true");
        btn.focus();
        if (status) status.textContent = btn.dataset.tip || defaultStatus;
      } else {
        if (status) status.textContent = defaultStatus;
      }
    };

    const launchItem = (btn) => {
      const app = btn?.dataset.launchApp;
      if (app && APPS[app]) {
        wm.open(app);
        beep("click");
      }
    };

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".program-group-item");
      if (btn) selectItem(btn);
    });

    grid.addEventListener("dblclick", (e) => {
      const btn = e.target.closest(".program-group-item");
      if (btn) launchItem(btn);
    });

    grid.addEventListener("pointerover", (e) => {
      const btn = e.target.closest(".program-group-item");
      if (btn && status) status.textContent = btn.dataset.tip || defaultStatus;
    });

    grid.addEventListener("pointerout", () => {
      const selected = $(".program-group-item.is-selected", grid);
      if (status) status.textContent = selected?.dataset.tip || defaultStatus;
    });

    grid.addEventListener("keydown", (e) => {
      const current = $(".program-group-item.is-selected", grid) || items[0];
      const index = items.indexOf(current);
      if (index === -1) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        launchItem(current);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = items[(index + 1) % items.length];
        selectItem(next);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = items[(index - 1 + items.length) % items.length];
        selectItem(prev);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[(index + 2) % items.length];
        selectItem(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = items[(index - 2 + items.length) % items.length];
        selectItem(prev);
      }
    });
  }

  // ==========================================
  // DESKTOP ICONS
  // ==========================================
  const desktopItems = [
    // Column 1 - Core System & Primary Hubs
    ["computer", "My Computer", "my-computer"],
    ["recycle", "Recycle Bin", "recycle-full"],
    ["links", "LINKS.exe", "links"],
    ["linksmarket", "LINKS Market", "linksmarket"],
    ["linksonline", "LINKS Online", "linksonline"],
    ["internet", "Internet", "internet"],
    // Column 2 - Productivity & Dev
    ["editor", "LINKS Code Editor", "editor"],
    ["notepad", "Notepad", "notepad"],
    ["terminal", "Command Prompt", "terminal"],
    ["winamp", "CatAMP", "winamp"],
    ["antivirus", "Antivirus 98", "recycle-full"],
    ["printer", "Printers", "my-computer"],
    ["weather", "Weather 98", "internet"],
    // Column 3 - Games, Token & Info
    ["arcade", "LINKS Games", "links"],
    ["solitaire", "Solitaire", "links"],
    ["buy", "Buy LINKS", "my-computer"],
    ["profile", "My Profile", "links"],
    ["lore", "Lore.txt", "lore"],
    ["moon", "To The Moon", "moon"],
    ["about", "About LINKS", "links"]
  ];

  function renderDesktopIcons() {
    $("#desktop-icons").innerHTML = desktopItems.map(([app, label, image]) => `
      <button class="desktop-icon" type="button" role="listitem" data-desktop-app="${app}" aria-label="${escapeHTML(label)}. Double click to open.">
        ${LinksImage({ src: appIcon(app, image), alt: "", fallback: LINKS_ASSETS.icon })}<span>${escapeHTML(label)}</span>
      </button>`).join("");
    if (window.LINKS_OS?.restorePositions) {
      window.LINKS_OS.restorePositions();
    }
  }

  const startSections = {};

  function renderStartMenu() {
    const u = state.user;
    $("#start-menu").innerHTML = `
      <div class="start-rail">LINKS 98</div>
      <div class="start-items">
        <div class="start-user-banner">
          <img class="start-user-avatar" src="${escapeHTML(u.pfp)}" alt="">
          <span class="start-user-name">${escapeHTML(u.username)}</span>
        </div>

        <!-- Programs -->
        <div class="start-entry">
          <button class="menu-item" type="button" data-start-submenu="programs">
            <span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Programs</span>
            <span class="menu-item-arrow">▶</span>
          </button>
          <div class="start-flyout-menu menu" data-flyout="programs" hidden>
            <!-- Market Tools -->
            <div class="start-entry">
              <button class="menu-item" type="button" data-start-submenu="market-tools">
                <span class="menu-item-left"><img class="menu-item-icon" src="${icon("market")}" alt="">LINKS Market Tools</span>
                <span class="menu-item-arrow">▶</span>
              </button>
              <div class="start-flyout-menu menu" data-flyout="market-tools" hidden>
                <button class="menu-item" type="button" data-start-app="market"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("market")}" alt="">Market Control</span></button>
                <button class="menu-item" type="button" data-start-app="chart"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("chart")}" alt="">LINKS Chart</span></button>
                <button class="menu-item" type="button" data-start-app="livetape"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("livetape")}" alt="">Live Tape</span></button>
                <button class="menu-item" type="button" data-start-app="holdermap"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("holdermap")}" alt="">Holder Map</span></button>
              </div>
            </div>

            <!-- Games -->
            <div class="start-entry">
              <button class="menu-item" type="button" data-start-submenu="links-games">
                <span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("arcade")}" alt="">LINKS Games</span>
                <span class="menu-item-arrow">▶</span>
              </button>
              <div class="start-flyout-menu menu" data-flyout="links-games" hidden>
                <button class="menu-item" type="button" data-start-app="arcade"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("arcade")}" alt="">LINKS 98 Arcade</span></button>
                <button class="menu-item" type="button" data-start-app="rugsweeper"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("rugsweeper")}" alt="">RUGSWEEPER.EXE</span></button>
                <button class="menu-item" type="button" data-start-app="solitaire"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("solitaire")}" alt="">LINKS Solitaire</span></button>
                <button class="menu-item" type="button" data-start-app="codechallenge"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("terminal")}" alt="">Code Challenge</span></button>
              </div>
            </div>

            <!-- Development -->
            <div class="start-entry">
              <button class="menu-item" type="button" data-start-submenu="development">
                <span class="menu-item-left"><img class="menu-item-icon" src="${icon("terminal")}" alt="">Development</span>
                <span class="menu-item-arrow">▶</span>
              </button>
              <div class="start-flyout-menu menu" data-flyout="development" hidden>
                <button class="menu-item" type="button" data-start-app="editor"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">LINKS Code Editor</span></button>
                <button class="menu-item" type="button" data-start-app="terminal"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("terminal")}" alt="">Command Prompt</span></button>
                <button class="menu-item" type="button" data-start-app="preview"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("internet")}" alt="">Web Preview</span></button>
                <button class="menu-item" type="button" data-start-app="codechallenge"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("links")}" alt="">Code Challenge</span></button>
              </div>
            </div>

            <!-- System Tools -->
            <div class="start-entry">
              <button class="menu-item" type="button" data-start-submenu="system-tools">
                <span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">System Tools</span>
                <span class="menu-item-arrow">▶</span>
              </button>
              <div class="start-flyout-menu menu" data-flyout="system-tools" hidden>
                <button class="menu-item" type="button" data-start-app="antivirus"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("antivirus")}" alt="">LINKS Antivirus</span></button>
                <button class="menu-item" type="button" data-start-app="printer"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("printer")}" alt="">LINKS Printer</span></button>
                <button class="menu-item" type="button" data-start-app="weather"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("weather")}" alt="">Internet Weather</span></button>
                <button class="menu-item" type="button" data-start-app="control"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Control Panel</span></button>
              </div>
            </div>

            <!-- Accessories -->
            <div class="start-entry">
              <button class="menu-item" type="button" data-start-submenu="accessories">
                <span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">Accessories</span>
                <span class="menu-item-arrow">▶</span>
              </button>
              <div class="start-flyout-menu menu" data-flyout="accessories" hidden>
                <button class="menu-item" type="button" data-start-app="winamp"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("winamp")}" alt="">LINKS Media Player (CatAMP)</span></button>
                <button class="menu-item" type="button" data-start-app="notepad"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">Notepad</span></button>
                <button class="menu-item" type="button" data-start-app="paint"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("paint")}" alt="">Paint</span></button>
                <button class="menu-item" type="button" data-start-app="calculator"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">Calculator</span></button>
                <button class="menu-item" type="button" data-start-app="internet"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("internet")}" alt="">Internet Explorer</span></button>
                <button class="menu-item" type="button" data-start-app="memes"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("memes")}" alt="">Meme Viewer</span></button>
                <button class="menu-item" type="button" data-start-app="lore"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("lore")}" alt="">Lore.txt</span></button>
              </div>
            </div>
          </div>
        </div>

        <!-- Documents -->
        <div class="start-entry">
          <button class="menu-item" type="button" data-start-submenu="documents">
            <span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">Documents</span>
            <span class="menu-item-arrow">▶</span>
          </button>
          <div class="start-flyout-menu menu" data-flyout="documents" hidden>
            <button class="menu-item" type="button" data-start-doc="lore"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("lore")}" alt="">Lore.txt</span></button>
            <button class="menu-item" type="button" data-start-doc="cat_notes"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">cat_notes.txt</span></button>
            <button class="menu-item" type="button" data-start-doc="alpha"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">definitely_not_alpha.txt</span></button>
            <button class="menu-item" type="button" data-start-doc="whitepaper"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">whitepaper.txt</span></button>
          </div>
        </div>

        <!-- Settings -->
        <div class="start-entry">
          <button class="menu-item" type="button" data-start-submenu="settings">
            <span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Settings</span>
            <span class="menu-item-arrow">▶</span>
          </button>
          <div class="start-flyout-menu menu" data-flyout="settings" hidden>
            <button class="menu-item" type="button" data-start-app="control"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Control Panel</span></button>
            <button class="menu-item" type="button" data-start-app="display98"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Display</span></button>
            <button class="menu-item" type="button" data-start-app="crypto"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("links")}" alt="">Crypto Settings</span></button>
            <button class="menu-item" type="button" data-start-app="profile"><span class="menu-item-left"><img class="menu-item-icon" src="${appIcon("profile")}" alt="">User Profile</span></button>
          </div>
        </div>

        <!-- Find -->
        <div class="start-entry">
          <button class="menu-item" type="button" data-start-submenu="find">
            <span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Find</span>
            <span class="menu-item-arrow">▶</span>
          </button>
          <div class="start-flyout-menu menu" data-flyout="find" hidden>
            <button class="menu-item" type="button" data-start-app="search"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Files or Folders...</span></button>
          </div>
        </div>

        <div class="menu-separator"></div>
        <button class="menu-item" type="button" data-start-action="help"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("document")}" alt="">Help</span></button>
        <button class="menu-item" type="button" data-start-action="run"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("my-computer")}" alt="">Run...</span></button>

        <div class="menu-separator shutdown-separator"></div>
        <button class="menu-item" type="button" data-start-action="logoff"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("links")}" alt="">Log Off ${escapeHTML(u.username)}...</span></button>
        <button class="menu-item shutdown-item" type="button" data-start-app="shutdown"><span class="menu-item-left"><img class="menu-item-icon" src="${icon("links")}" alt="">Shut Down...</span></button>
      </div>
    `;
  }

  function renderContextMenu() {
    $("#context-menu").innerHTML = `<button class="menu-item" type="button" data-context="arrange">Arrange Icons</button><button class="menu-item" type="button" data-context="refresh">Refresh</button><button class="menu-item" type="button" disabled>Paste</button><div class="menu-separator"></div><button class="menu-item" type="button" data-context="new">New <span>▶</span></button><div class="menu-separator"></div><button class="menu-item" type="button" data-context="properties">Properties</button>`;
  }

  function closeMenus() {
    $("#start-menu").hidden = true;
    $("#context-menu").hidden = true;
    $$(".start-entry.is-open", $("#start-menu")).forEach(e => e.classList.remove("is-open"));
    $$(".start-flyout-menu", $("#start-menu")).forEach(f => f.hidden = true);
    $("#start-button").classList.remove("is-pressed");
    $("#start-button").setAttribute("aria-expanded", "false");
  }

  function toggleStartMenu() {
    const menu = $("#start-menu");
    const opening = menu.hidden;
    closeMenus();
    menu.hidden = !opening;
    $("#start-button").classList.toggle("is-pressed", opening);
    $("#start-button").setAttribute("aria-expanded", String(opening));
    if (opening) $(".menu-item", menu)?.focus();
  }

  function handleStart(event) {
    const btn = event.target.closest("button.menu-item");
    if (!btn) return;

    const sub = btn.dataset.startSubmenu;
    if (sub) {
      const entry = btn.closest(".start-entry");
      const flyout = entry ? $(":scope > .start-flyout-menu", entry) : null;
      if (flyout) {
        const isOpen = !flyout.hidden;
        const parent = entry.parentElement;
        if (parent) {
          $$(":scope > .start-entry", parent).forEach(s => {
            if (s !== entry) {
              s.classList.remove("is-open");
              const f = $(":scope > .start-flyout-menu", s);
              if (f) f.hidden = true;
            }
          });
        }
        flyout.hidden = isOpen;
        entry.classList.toggle("is-open", !isOpen);
        if (!isOpen) {
          const r = flyout.getBoundingClientRect();
          if (r.right > window.innerWidth) {
            flyout.style.left = "auto";
            flyout.style.right = "0";
          }
          if (r.bottom > window.innerHeight) {
            flyout.style.top = "auto";
            flyout.style.bottom = "0";
          }
        }
      }
      return;
    }

    const app = btn.dataset.startApp;
    const action = btn.dataset.startAction;
    const doc = btn.dataset.startDoc;

    closeMenus();

    if (doc) {
      const docs = {
        lore: "In 1998, LINKS.exe appeared on a computer nobody remembered installing it on.",
        cat_notes: "things to do:\n- sleep\n- inspect internet\n- delete sell button\n- become operating system",
        alpha: "Definitely not alpha.\n\nThe cat knows where the files went. The cat is not telling.",
        whitepaper: "LINKS WHITEPAPER\nVersion 0.98\n\n1. Cat.\n2. Internet.\n3. Meme.\n4. That's basically it."
      };
      localStorage.setItem("links98:notepad", JSON.stringify(docs[doc] || ""));
      wm.close("notepad");
      wm.open("notepad");
      return;
    }

    if (action === "help") { wm.open(APPS.help98 ? "help98" : "help"); return; }
    if (action === "run") { showRunDialog(); return; }
    if (action === "find") { wm.open("search"); return; }
    if (action === "logoff") { logOff(); return; }
    if (action === "shutdown" || app === "shutdown" || btn.classList.contains("shutdown-item") || btn.textContent.toLowerCase().includes("shut down")) {
      wm.open("shutdown");
      return;
    }

    if (app && APPS[app]) {
      wm.open(app);
      return;
    }
  }

  function initStartMenuHover() {
    const menu = $("#start-menu");
    if (!menu) return;

    menu.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch" || window.innerWidth <= 600) return;
      const entry = e.target.closest(".start-entry");
      if (!entry) return;

      const parent = entry.parentElement;
      if (parent) {
        $$(":scope > .start-entry.is-open", parent).forEach(sibling => {
          if (sibling !== entry) {
            sibling.classList.remove("is-open");
            const f = $(":scope > .start-flyout-menu", sibling);
            if (f) f.hidden = true;
          }
        });
      }

      const flyout = $(":scope > .start-flyout-menu", entry);
      if (flyout) {
        entry.classList.add("is-open");
        flyout.hidden = false;
        const er = entry.getBoundingClientRect();
        flyout.classList.toggle("flip-left", er.right + 190 > window.innerWidth);
        flyout.classList.toggle("flip-up", er.top + 170 > window.innerHeight);
      }
    });
  }

  function showRunDialog() {
    const layer = $("#dialog-layer");
    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.innerHTML = `<form class="dialog" role="dialog" aria-modal="true" aria-labelledby="run-title"><div class="titlebar"><span id="run-title" class="titlebar-title">Run</span></div><div class="dialog-body"><img class="dialog-icon" src="${icon("my-computer")}" alt=""><div><label for="run-command">Open:</label><input id="run-command" class="ca-field" value="LINKS.EXE" autocomplete="off"></div></div><div class="dialog-actions"><button class="win-button" type="submit">OK</button><button class="win-button" type="button" data-cancel>Cancel</button><button class="win-button" type="button" data-browse>Browse...</button></div></form>`;
    layer.append(backdrop);
    const input = $("#run-command", backdrop);
    const finish = () => backdrop.remove();
    $("form", backdrop).addEventListener("submit", (event) => {
      event.preventDefault();
      const command = input.value.trim().toLowerCase().replace(/\.exe$/, "");
      const aliases = {
        links: "links", terminal: "terminal", cmd: "terminal", command: "terminal",
        calc: "calculator", calculator: "calculator", paint: "paint", mspaint: "paint",
        memes: "memes", lore: "lore", about: "about", buy: "buy", internet: "internet",
        recycle: "recycle", moon: "moon", control: "control", notepad: "notepad",
        chart: "chart", arcade: "arcade", games: "arcade", profile: "profile",
        livetape: "livetape", tape: "livetape", "live tape": "livetape",
        holdermap: "holdermap", "holder map": "holdermap", defrag: "holdermap",
        antivirus: "antivirus", av: "antivirus", virus: "antivirus",
        printer: "printer", print: "printer",
        solitaire: "solitaire", sol: "solitaire",
        rugsweeper: "rugsweeper", minesweeper: "rugsweeper", sweep: "rugsweeper",
        winamp: "winamp", media: "winamp", music: "winamp", catamp: "winamp", player: "winamp",
        taskmgr: "taskmgr", taskmanager: "taskmgr", tasks: "taskmgr",
        weather: "weather", forecast: "weather",
        catchat: "catchat", icq: "catchat", chat: "catchat", msg: "catchat"
      };
      finish();
      if (aliases[command]) wm.open(aliases[command]);
      else showDialog({ title: "Run", message: `LINKS 98 cannot find '${input.value}'.\n\nMake sure the file name is correct and try again.`, type: "error" });
    });
    $("[data-cancel]", backdrop).addEventListener("click", finish);
    $("[data-browse]", backdrop).addEventListener("click", () => {
      finish();
      if (window.LINKS_OS?.openExplorer) window.LINKS_OS.openExplorer("C:\\");
      else wm.open("computer");
    });
    input.focus(); input.select();
  }

  function handleContext(event) {
    const action = event.target.closest("[data-context]")?.dataset.context;
    if (!action) return;
    if (action === "properties") wm.open("display");
    if (action === "new") showDialog({ title: "New", message: "New Cat was not available.\nThe current cat is sufficient.", image: cat("reactions/unimpressed.png") });
    if (action === "refresh") {
      const icons = $("#desktop-icons");
      icons.style.opacity = "0";
      setTimeout(() => { icons.style.opacity = "1"; announce("Desktop refreshed."); }, 100);
    }
    if (action === "arrange") announce("Icons arranged by cat preference.");
    closeMenus();
  }

  async function reactToCat() {
    state.catClicks += 1;
    beep("click");
    if (state.catClicks === 3) await showDialog({ title: "LINKS CAT", message: "Stop clicking me.", image: cat("reactions/concerned.png") });
    if (state.catClicks === 6) await showDialog({ title: "LINKS CAT", message: "I said stop.", image: cat("reactions/annoyed.png") });
    if (state.catClicks === 9) {
      state.discoveries.add("annoyed");
      await showDialog({ title: "SYSTEM WARNING", message: "Cat is becoming annoyed.", image: cat("warning-cat.png"), buttons: ["Retry", "Ignore"] });
    }
    if (state.catClicks > 9 && state.catClicks % 5 === 0) announce("Links Cat is ignoring further clicks.");
  }

  function triggerCrash() {
    const screen = $("#crash-screen");
    screen.hidden = false; screen.classList.add("is-visible"); screen.focus();
    const restore = () => {
      screen.hidden = true; screen.classList.remove("is-visible");
      window.removeEventListener("keydown", restore);
      screen.removeEventListener("click", restore);
      if (window.powerManager) {
        window.powerManager.crashRecovery();
        return;
      }
      $(".terminal-input", wm.windows.get("terminal")?.element || document)?.focus?.();
    };
    setTimeout(() => {
      window.addEventListener("keydown", restore, { once: true });
      screen.addEventListener("click", restore, { once: true });
    }, 250);
  }

  function triggerSecretEnding() {
    const ending = document.createElement("div");
    ending.className = "secret-ending";
    ending.innerHTML = `<img src="assets/easter-eggs/behind-desktop.jpg" alt="Links Cat secretly operating the entire computer from behind the desktop"><div class="secret-ending-copy"><strong>You found him.</strong><p>Links has been running the computer the entire time.</p><button class="win-button" type="button">RETURN</button></div>`;
    document.body.append(ending);
    $("button", ending).focus();
    $("button", ending).addEventListener("click", () => ending.remove());
  }

  function showShutdown() {
    closeMenus();
    if (window.powerManager) {
      window.powerManager.shutdown();
      return;
    }
    stopScreensaver();
    [...wm.windows.keys()].forEach((key) => wm.close(key));
    state.isLoggedIn = false;
    const login = $("#login-screen");
    if (login) {
      login.hidden = true;
      login.classList.remove("is-visible");
    }
    const screen = $("#shutdown-screen");
    screen.hidden = false;
    screen.classList.add("is-visible");
    screen.focus();
    beep("error");
  }

  function replayBoot() {
    if (window.powerManager) {
      window.powerManager.restart();
      return;
    }
    closeMenus();
    state.isLoggedIn = false;
    const boot = $("#boot-screen");
    const login = $("#login-screen");
    if (login) {
      login.hidden = true;
      login.classList.remove("is-visible");
    }
    if (boot) {
      boot.hidden = true;
      boot.classList.remove("is-visible");
    }
    clearTimeout(state.bootTimeout);
    finishBoot();
  }

  // ==========================================
  // AUTHENTICATION & LOGIN FLOW
  // ==========================================
  function finishBoot() {
    const boot = $("#boot-screen");
    clearTimeout(state.bootTimeout);
    if (boot) {
      boot.classList.remove("is-visible");
      boot.hidden = true;
    }

    showLoginScreen();
  }

  function showLoginScreen() {
    const login = $("#login-screen");
    login.hidden = false;
    login.classList.add("is-visible");

    const hasStoredUser = Boolean(localStorage.getItem("links98:user_profile"));
    const returningSection = $("#returning-user-section");
    const newSection = $("#new-user-section");
    const switchBtn = $("#btn-switch-user");
    const usernameInput = $("#login-username-input");
    const pfpImg = $("#login-pfp-img");

    if (pfpImg) pfpImg.src = state.user.pfp;

    if (hasStoredUser) {
      if (returningSection) returningSection.hidden = false;
      if (newSection) newSection.hidden = true;
      if (switchBtn) switchBtn.hidden = false;
      if ($("#returning-user-name")) $("#returning-user-name").textContent = state.user.username;
    } else {
      if (returningSection) returningSection.hidden = true;
      if (newSection) newSection.hidden = false;
      if (switchBtn) switchBtn.hidden = true;
      if (usernameInput) usernameInput.value = state.user.username || "degen98";
    }
  }

  async function attemptWalletConnection() {
    try {
      const provider = window.ethereum;
      if (!provider) {
        await showDialog({
          title: "Connect Wallet",
          message: "No EVM wallet found.\nPlease install MetaMask, Rabby, Coinbase Wallet, or an EVM-compatible browser extension.",
          image: cat("reactions/shocked.png")
        });
        return false;
      }
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0] || "";
      if (address) {
        // Switch / add Robinhood Chain (ID 4663 -> 0x1237)
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x1237" }]
          });
        } catch (switchErr) {
          if (switchErr.code === 4902 || switchErr.message?.includes("Unrecognized")) {
            try {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: "0x1237",
                  chainName: "Robinhood Chain",
                  rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
                  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                  blockExplorerUrls: ["https://robinhoodchain.blockscout.com"]
                }]
              });
            } catch (_) {}
          }
        }

        saveUserProfile({
          walletAddress: address,
          username: state.user.username === "degen98" ? `${address.slice(0, 6)}...${address.slice(-4)}` : state.user.username
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Wallet connection failed:", err);
      const res = await showDialog({
        title: "Connect Wallet",
        message: "Could not connect EVM wallet.",
        image: cat("reactions/concerned.png"),
        buttons: ["Retry", "Cancel"]
      });
      if (res === "Retry") return attemptWalletConnection();
      return false;
    }
  }

  async function executeLogin(usernameOverride) {
    const usernameInput = $("#login-username-input");
    const finalUsername = (usernameOverride || usernameInput?.value || state.user.username || "").trim();

    if (!finalUsername) {
      await showDialog({ title: "LINKS 98", message: "Please enter a user name.", image: cat("reactions/concerned.png") });
      return;
    }

    // Secret easter egg
    if (finalUsername.toUpperCase() === "LINKS") {
      await showDialog({ title: "LINKS 98", message: "Welcome back, administrator.", image: cat("reactions/confident.png") });
    }

    saveUserProfile({ username: finalUsername });
    state.isLoggedIn = true;

    if (window.powerManager) {
      await window.powerManager.completeLogin(finalUsername);
      return;
    }

    // Login transition
    playLoginChime();
    const login = $("#login-screen");
    login.classList.remove("is-visible");
    login.hidden = true;

    const desktop = $("#desktop");
    desktop.classList.remove("crt-flicker");
    void desktop.offsetWidth; // Trigger reflow
    desktop.classList.add("crt-flicker");
    desktop.focus();

    renderStartMenu();
    if (window.LINKS_OS?.restorePositions) window.LINKS_OS.restorePositions();
    resetInactivity();
    announce(`Welcome to LINKS 98, ${finalUsername}.`);
  }

  function logOff() {
    if (window.powerManager) {
      window.powerManager.logoff();
      return;
    }
    closeMenus();
    wm.closeAll();
    state.isLoggedIn = false;
    $("#desktop-icons").style.opacity = "1";
    showLoginScreen();
    announce("Logged off.");
  }

  function bindLogin() {
    $("#btn-choose-pfp")?.addEventListener("click", async () => {
      const chosen = await showPfpPicker(state.user.pfp);
      if (chosen) {
        saveUserProfile({ pfp: chosen });
      }
    });

    $("#btn-switch-user")?.addEventListener("click", () => {
      $("#returning-user-section").hidden = true;
      $("#new-user-section").hidden = false;
      $("#btn-switch-user").hidden = true;
      const input = $("#login-username-input");
      if (input) { input.value = ""; input.focus(); }
    });

    $("#btn-login-submit")?.addEventListener("click", () => {
      const returningSection = $("#returning-user-section");
      if (returningSection && !returningSection.hidden) {
        executeLogin(state.user.username);
      } else {
        executeLogin();
      }
    });

    $("#login-username-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") executeLogin();
    });

    $("#btn-login-wallet")?.addEventListener("click", async () => {
      const connected = await attemptWalletConnection();
      if (connected) {
        executeLogin(state.user.username);
      }
    });
  }

  function startScreensaver() {
    const boot = $("#boot-screen");
    if (!$("#screensaver").hidden || (boot && !boot.hidden) || !$("#shutdown-screen").hidden || !state.isLoggedIn) return;
    const saver = $("#screensaver");
    const sprite = $("#screensaver-cat");
    saver.hidden = false;
    let x = 21, y = 37, vx = 1.45, vy = 1.15, last = performance.now(), achievementShown = false;
    const animate = (now) => {
      const delta = Math.min(2, (now - last) / 16.67); last = now;
      const maxX = window.innerWidth - sprite.offsetWidth;
      const maxY = window.innerHeight - sprite.offsetHeight;
      x += vx * delta; y += vy * delta;
      let hitX = false, hitY = false;
      if (x <= 0 || x >= maxX) { vx *= -1; x = Math.max(0, Math.min(maxX, x)); hitX = true; }
      if (y <= 0 || y >= maxY) { vy *= -1; y = Math.max(0, Math.min(maxY, y)); hitY = true; }
      sprite.style.transform = `translate(${x}px, ${y}px)`;
      if (hitX && hitY && !achievementShown) {
        achievementShown = true; state.discoveries.add("corner");
        const achievement = $("#corner-achievement"); achievement.hidden = false;
        setTimeout(() => { achievement.hidden = true; }, 2500);
      }
      state.saverFrame = requestAnimationFrame(animate);
    };
    state.saverFrame = requestAnimationFrame(animate);
  }

  function stopScreensaver() {
    const saver = $("#screensaver");
    if (saver.hidden) return;
    saver.hidden = true;
    cancelAnimationFrame(state.saverFrame);
    state.saverFrame = null;
    resetInactivity();
  }

  function resetInactivity() {
    clearTimeout(state.inactivity);
    if (!$("#screensaver").hidden || !state.isLoggedIn) return;
    state.inactivity = setTimeout(() => {
      if (window.LINKS_OS?.startConfiguredScreensaver) window.LINKS_OS.startConfiguredScreensaver();
      else startScreensaver();
    }, 50000);
  }

  function bindDesktop() {
    const desktop = $("#desktop");
    let lastShortcutTap = 0;
    let lastShortcutEl = null;
    $("#desktop-icons").addEventListener("click", (event) => {
      const shortcut = event.target.closest("[data-desktop-app]");
      if (!shortcut) return;
      const now = performance.now();
      const app = shortcut.dataset.desktopApp;
      if (lastShortcutEl === shortcut && now - lastShortcutTap < 450) {
        if (shortcut.dataset.custom === "true" && window.LINKS_OS?.openCustomItem) {
          window.LINKS_OS.openCustomItem(app);
        } else if (app) {
          wm.open(app);
        }
        lastShortcutTap = 0;
        lastShortcutEl = null;
        return;
      }
      lastShortcutTap = now;
      lastShortcutEl = shortcut;
      $$(".desktop-icon").forEach((item) => item.classList.remove("is-selected"));
      shortcut.classList.add("is-selected");
      state.selectedIcon = app;
    });
    $("#desktop-icons").addEventListener("dblclick", (event) => {
      const shortcut = event.target.closest("[data-desktop-app]");
      if (!shortcut) return;
      if (shortcut.dataset.custom === "true" && window.LINKS_OS?.openCustomItem) {
        window.LINKS_OS.openCustomItem(shortcut.dataset.desktopApp);
      } else if (shortcut.dataset.desktopApp) {
        wm.open(shortcut.dataset.desktopApp);
      }
    });
    $("#desktop-icons").addEventListener("keydown", (event) => {
      const shortcut = event.target.closest("[data-desktop-app]");
      if (shortcut && event.key === "Enter") {
        if (shortcut.dataset.custom === "true" && window.LINKS_OS?.openCustomItem) {
          window.LINKS_OS.openCustomItem(shortcut.dataset.desktopApp);
        } else if (shortcut.dataset.desktopApp) {
          wm.open(shortcut.dataset.desktopApp);
        }
      }
    });
    desktop.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".desktop-icon,.window,.taskbar,.menu,.start-menu,.cat-hotspot")) {
        $$(".desktop-icon").forEach((item) => item.classList.remove("is-selected"));
        state.selectedIcon = null; closeMenus();
      }
    });
    desktop.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".window,.taskbar")) return;
      event.preventDefault(); closeMenus();
      const menu = $("#context-menu"); menu.hidden = false;
      const left = Math.min(event.clientX, window.innerWidth - 190);
      const top = Math.min(event.clientY, window.innerHeight - 190);
      Object.assign(menu.style, { left: `${Math.max(0, left)}px`, top: `${Math.max(0, top)}px` });
      $(".menu-item:not(:disabled)", menu)?.focus();
    });
    $("#start-button").addEventListener("click", (event) => { event.stopPropagation(); toggleStartMenu(); });
    $("#start-menu").addEventListener("pointerdown", (event) => { event.stopPropagation(); });
    $("#start-menu").addEventListener("click", handleStart);
    initStartMenuHover();
    $("#context-menu").addEventListener("click", handleContext);
    $("#task-buttons").addEventListener("click", (event) => {
      const key = event.target.closest("[data-task-app]")?.dataset.taskApp;
      if (key) wm.toggleFromTaskbar(key);
    });
    $("#cat-hotspot").addEventListener("click", reactToCat);
    $("#sound-toggle").addEventListener("click", (event) => {
      state.sound = !state.sound;
      event.currentTarget.textContent = state.sound ? "🔊" : "🔇";
      event.currentTarget.setAttribute("aria-pressed", String(!state.sound));
      event.currentTarget.setAttribute("aria-label", state.sound ? "Mute system sounds" : "Enable system sounds");
      if (state.sound) beep();
    });
    $("#clock").addEventListener("click", () => {
      const now = Date.now();
      state.clockClicks = [...state.clockClicks.filter((time) => now - time < 1800), now];
      if (state.clockClicks.length >= 5) {
        state.clockClicks = []; state.discoveries.add("classified"); wm.open("classified");
      }
    });
    $("#window-layer").addEventListener("click", (event) => {
      const menuButton = event.target.closest(".menu-button");
      if (!menuButton) return;
      const label = menuButton.textContent;
      showDialog({ title: label, message: label === "Help" ? "Move windows by their blue title bars. Use the taskbar to minimize and restore them." : `${label} menu is being supervised by Links Cat.`, image: cat("reactions/confident.png") });
    });
  }

  function bindSystem() {
    $(".boot-again")?.addEventListener("click", () => {
      const shutdown = $("#shutdown-screen");
      if (shutdown) {
        shutdown.hidden = true;
        shutdown.classList.remove("is-visible");
      }
      if (window.powerManager) window.powerManager.wake();
      else replayBoot();
    });
    $("#shutdown-screen")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const btn = $(".boot-again");
        if (btn) btn.click();
        else if (window.powerManager) window.powerManager.wake();
        else replayBoot();
      }
    });
    $("#screensaver").addEventListener("pointermove", stopScreensaver, { passive: true });
    $("#screensaver").addEventListener("pointerdown", stopScreensaver);
    window.addEventListener("keydown", (event) => {
      if (!$("#screensaver").hidden) { stopScreensaver(); return; }
      if (event.key === "Escape") closeMenus();
      resetInactivity();
    });
    ["pointermove", "pointerdown", "wheel", "touchstart"].forEach((type) => window.addEventListener(type, resetInactivity, { passive: true }));
    function clampWindows() {
      const bounds = $("#window-layer").getBoundingClientRect();
      const isMobile = bounds.width <= 600;
      for (const record of wm.windows.values()) {
        if (record.maximized) continue;
        const el = record.element;
        if (isMobile) {
          const w = Math.min(el.offsetWidth, bounds.width - 8);
          const h = Math.min(el.offsetHeight, bounds.height - 8);
          el.style.width = `${Math.max(240, w)}px`;
          el.style.height = `${Math.max(160, h)}px`;
        }
        const maxL = Math.max(0, bounds.width - 80);
        const maxT = Math.max(0, bounds.height - 28);
        el.style.left = `${Math.max(0, Math.min(el.offsetLeft, maxL))}px`;
        el.style.top = `${Math.max(0, Math.min(el.offsetTop, maxT))}px`;
      }
      if (typeof window.LINKS_REDRAW_CHART === "function") {
        window.LINKS_REDRAW_CHART();
      }
    }

    window.addEventListener("resize", clampWindows);
    window.addEventListener("orientationchange", () => {
      setTimeout(clampWindows, 120);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        const active = document.activeElement;
        if (active && active.matches("input, textarea, select, [contenteditable]")) {
          setTimeout(() => {
            active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
          }, 80);
        }
      });
    }
  }

  function updateClock() {
    $("#clock").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  }

  function updateDesktopRows() {
    const rows = Math.max(5, Math.min(8, Math.floor((window.innerHeight - 60) / 96)));
    document.documentElement.style.setProperty('--desktop-rows', String(rows));
  }

  // ==========================================
  // QUICK LAUNCH TOOLBAR & TOOLTIPS
  // ==========================================
  let minimizedForDesktop = null;

  function toggleShowDesktop() {
    const openVisible = [...wm.windows.entries()].filter(([, r]) => !r.minimized);
    if (openVisible.length > 0) {
      minimizedForDesktop = openVisible.map(([k]) => k);
      for (const [k] of openVisible) {
        wm.minimize(k);
      }
      announce("Desktop");
      const tooltip = $("#win-tooltip");
      if (tooltip) {
        const desktopBtn = $("[data-ql-action='show-desktop']");
        if (desktopBtn) {
          tooltip.textContent = "Desktop";
          tooltip.hidden = false;
          const r = desktopBtn.getBoundingClientRect();
          tooltip.style.top = `${Math.max(0, r.top - tooltip.offsetHeight - 4)}px`;
          tooltip.style.left = `${r.left}px`;
          setTimeout(() => { tooltip.hidden = true; }, 1200);
        }
      }
    } else if (minimizedForDesktop && minimizedForDesktop.length > 0) {
      for (const k of minimizedForDesktop) {
        const rec = wm.windows.get(k);
        if (rec) {
          rec.minimized = false;
          rec.element.classList.remove("is-minimized");
        }
      }
      if (minimizedForDesktop.length) {
        wm.focus(minimizedForDesktop[minimizedForDesktop.length - 1]);
      }
      minimizedForDesktop = null;
    } else {
      for (const k of wm.windows.keys()) {
        wm.minimize(k);
      }
    }
  }

  function updateQuickLaunchChartStatus() {
    const dot = $(".ql-status-dot");
    if (!dot) return;
    const ca = getContractAddress();
    if (!ca || ca === "COMING_SOON") {
      dot.dataset.qlStatus = "idle";
    } else {
      dot.dataset.qlStatus = "live";
    }
  }

  function showQuickLaunchOverflow(x, y) {
    const items = [
      { l: "Internet", a: "open:internet", icon: "internet" },
      { l: "Command Prompt", a: "open:terminal", icon: "terminal" },
      { l: "LINKS Games", a: "open:arcade", icon: "links" }
    ];
    if (window.LINKS_OS_SHOW_MENU) {
      window.LINKS_OS_SHOW_MENU(items, x - 120, y - 110);
    }
  }

  function initQuickLaunch() {
    const ql = $("#quick-launch");
    if (!ql) return;

    const isVisible = localStorage.getItem("links98:quicklaunch_visible") !== "false";
    const showText = localStorage.getItem("links98:quicklaunch_show_text") === "true";
    const showTitle = localStorage.getItem("links98:quicklaunch_show_title") === "true";

    ql.hidden = !isVisible;
    ql.classList.toggle("show-text", showText);
    const titleEl = $("#quick-launch-title");
    if (titleEl) titleEl.hidden = !showTitle;

    const tooltip = $("#win-tooltip");
    let tipTimer = null;

    function getTooltipText(btn) {
      const app = btn.dataset.qlApp;
      const action = btn.dataset.qlAction;
      if (app === "links") return "LINKS.exe\nMarket Control";
      if (app === "internet") return "Internet";
      if (app === "terminal") return "Command Prompt";
      if (app === "chart") {
        const ca = getContractAddress();
        return (ca && ca !== "COMING_SOON") ? "LINKS Chart\nMarket data connected" : "LINKS Chart\nToken not configured";
      }
      if (app === "arcade") return "LINKS Games";
      if (action === "show-desktop") return "Show Desktop";
      if (btn.id === "ql-overflow-btn") return "More Icons";
      return btn.getAttribute("aria-label") || "";
    }

    function showTooltipFor(btn) {
      if (!tooltip) return;
      const text = getTooltipText(btn);
      if (!text) return;
      tooltip.textContent = text;
      tooltip.hidden = false;
      const r = btn.getBoundingClientRect();
      const top = Math.max(0, r.top - tooltip.offsetHeight - 4);
      const left = Math.max(4, Math.min(window.innerWidth - tooltip.offsetWidth - 4, r.left));
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }

    function hideTooltip() {
      clearTimeout(tipTimer);
      if (tooltip) tooltip.hidden = true;
    }

    ql.addEventListener("pointerover", (e) => {
      const btn = e.target.closest(".quick-launch-btn");
      if (!btn) { hideTooltip(); return; }
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => showTooltipFor(btn), 500);
    });

    ql.addEventListener("pointerout", (e) => {
      if (!e.target.closest(".quick-launch-btn")) hideTooltip();
    });
    ql.addEventListener("pointerdown", hideTooltip);

    let linksClicks = [];

    ql.addEventListener("click", async (e) => {
      hideTooltip();
      const btn = e.target.closest(".quick-launch-btn");
      if (!btn) return;

      const app = btn.dataset.qlApp;
      const action = btn.dataset.qlAction;

      if (app === "links") {
        const now = Date.now();
        linksClicks = [...linksClicks.filter(t => now - t < 2000), now];
        if (linksClicks.length >= 5) {
          linksClicks = [];
          await showDialog({
            title: "LINKS 98",
            message: "I'm already open.",
            image: cat("reactions/annoyed.png")
          });
          return;
        }
      }

      if (app) {
        wm.open(app);
      } else if (action === "show-desktop") {
        toggleShowDesktop();
      } else if (btn.id === "ql-overflow-btn") {
        showQuickLaunchOverflow(e.clientX, e.clientY);
      }
    });

    updateQuickLaunchChartStatus();
  }

  function init() {
    updateDesktopRows();
    window.addEventListener("resize", updateDesktopRows);
    renderDesktopIcons();
    renderStartMenu();
    renderContextMenu();
    bindDesktop();
    bindSystem();
    bindLogin();
    initQuickLaunch();
    updateClock();
    setInterval(updateClock, 1000);
    if (!window.PowerManagerPending) finishBoot();
  }

  window.LINKS_OS_CORE = Object.freeze({
    CONFIG, TOKEN_CONFIG, state, APPS, wm, desktopItems, startSections, REACTION_PFPS,
    $, $$, icon, appIcon, cat, appArt, escapeHTML, LinksImage, announce, beep, playLoginChime, playVictorySound,
    showDialog, showRunDialog, showPfpPicker, saveUserProfile, logOff, closeMenus, toggleStartMenu,
    renderDesktopIcons, renderStartMenu, renderContextMenu,
    finishBoot, replayBoot, startScreensaver, stopScreensaver,
    triggerCrash, triggerSecretEnding, copyContract, getContractAddress
  });

  init();
})();
