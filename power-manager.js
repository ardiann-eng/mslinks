(() => {
  "use strict";

  const O = window.LINKS_OS_CORE;
  if (!O) return;
  const { $, $$, wm, APPS, state, cat, icon, escapeHTML, showDialog, announce, beep } = O;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const screens = ["boot-screen", "login-screen", "shutdown-screen", "power-transition-screen", "standby-screen", "monitor-off-screen"];
  const criticalAssets = [
    "assets/wallpaper/links-hill.png", "assets/screens/boot.jpg", "assets/icons/links.png",
    "assets/icons/my-computer.png", "assets/icons/internet.png", "assets/icons/document.png",
    "assets/icons/terminal.png", "assets/icons/market.png", "assets/cats/sit.png",
    "assets/cats/reactions/confident.png", "assets/cats/sleep-curled.png", "assets/cats/walk.png"
  ];
  const STATES = Object.freeze({ POWERED_OFF:"POWERED_OFF", BOOTING:"BOOTING", LOGIN:"LOGIN", DESKTOP:"DESKTOP", LOGGING_OFF:"LOGGING_OFF", SHUTTING_DOWN:"SHUTTING_DOWN", RESTARTING:"RESTARTING", STANDBY:"STANDBY", MONITOR_OFF:"MONITOR_OFF" });
  let token = 0;
  let shiftHeld = false;
  let mobilePowerUserHeld = false;
  let shutdownCount = 0;
  let shutdownJokeShown = false;
  const dirty = new Map();

  const bootEl = document.getElementById("boot-screen");
  if (bootEl) {
    let holdTimer = null;
    const onBootTouchStart = () => {
      holdTimer = setTimeout(() => {
        mobilePowerUserHeld = true;
      }, 250);
    };
    const onBootTouchEnd = () => {
      clearTimeout(holdTimer);
    };
    bootEl.addEventListener("touchstart", onBootTouchStart, { passive: true });
    bootEl.addEventListener("touchend", onBootTouchEnd, { passive: true });
    bootEl.addEventListener("pointerdown", onBootTouchStart, { passive: true });
    bootEl.addEventListener("pointerup", onBootTouchEnd, { passive: true });
  }

  function setState(next) {
    manager.state = next;
    document.body.dataset.powerState = next;
    screens.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || id === "login-screen") return;
      el.hidden = true;
      el.classList.remove("is-visible");
    });
  }

  function showScreen(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    el.hidden = false;
    el.classList.add("is-visible");
    el.focus?.();
    return el;
  }

  function segments(value) {
    const filled = Math.round(value * 16);
    return `<div class="segmented-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value * 100)}">${Array.from({length:16}, (_, i) => `<span class="${i < filled ? "is-filled" : ""}"></span>`).join("")}</div>`;
  }

  function powerSound(kind) {
    if (!state.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .32);
      gain.connect(ctx.destination);
      const notes = kind === "shutdown" ? [330, 220] : [160, 260];
      notes.forEach((frequency, i) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start(ctx.currentTime + i * .11);
        osc.stop(ctx.currentTime + .18 + i * .11);
      });
      setTimeout(() => ctx.close(), 500);
    } catch (_) {}
  }

  function preloadAssets() {
    const loads = criticalAssets.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = src;
    }));
    return Promise.race([Promise.allSettled(loads), sleep(2400)]);
  }

  function writeBootLog() {
    const stamp = () => new Date().toLocaleTimeString([], { hour12:false });
    const log = [`[${stamp()}] CAT.SYS loaded`, `[${stamp()}] Internet controller ready`, `[${stamp()}] Explorer started`, `[${stamp()}] Login screen initialized`].join("\n");
    localStorage.setItem("links98:bootlog", log);
    if (window.LINKS_VFS?.writeFile) {
      const result = window.LINKS_VFS.writeFile("C:\\WINDOWS\\BOOTLOG.TXT", log);
      result?.catch?.(() => {});
    }
  }

  async function boot({ restarting = false } = {}) {
    const run = ++token;
    setState(restarting ? STATES.RESTARTING : STATES.BOOTING);
    state.isLoggedIn = false;
    const login = $("#login-screen");
    login.hidden = true;
    login.classList.remove("is-visible");
    const screen = showScreen("boot-screen");
    screen.innerHTML = `<div class="power-stage power-stage--black"><div class="crt-power-line"></div></div>`;
    powerSound("boot");
    await sleep(420);
    if (run !== token) return;

    const verbose = shiftHeld || mobilePowerUserHeld;
    if (verbose) {
      localStorage.setItem("links98:achievement:power-user", "true");
      screen.innerHTML = `<pre class="power-stage power-stage--post">C:\\&gt; LOAD CAT.SYS\nOK\n\nC:\\&gt; LOAD INTERNET.DRV\nOK\n\nC:\\&gt; CHECK PAPERHANDS.DLL\nNOT FOUND\n\nC:\\&gt; MOUNT C:\\LINKS\nOK\n\nC:\\&gt; START LINKS.EXE\nRUNNING</pre>`;
    } else {
      const rare = ["Checking internet cats... OK", "Restoring memes... OK", "Verifying floppy disks... OK", "Loading optimism... OK", "SELL.EXE... SKIPPED"];
      const extra = Math.random() < .3 ? `\n${rare[Math.floor(Math.random() * rare.length)]}` : "";
      screen.innerHTML = `<pre class="power-stage power-stage--post">LINKS BIOS v0.98\nCopyright 1998–2026\n\nCAT Processor ............ OK\nMemory Test .............. 64 MB\nInternet Controller ...... ONLINE\nRobinhood Chain subsystem  READY\nMeme Subsystem ........... READY\nSELL.EXE ................. NOT FOUND\nCAT.SYS .................. LOADED${extra}\n\nPress DEL to enter Setup</pre>`;
    }
    await Promise.all([sleep(1250), preloadAssets()]);
    if (run !== token) return;

    if (new URLSearchParams(location.search).get("boot-warning") === "sell") {
      screen.innerHTML = `<pre class="power-stage power-stage--post">LINKS 98 Startup Warning\n\nSELL.EXE could not be loaded.\n\nPress any key to continue.</pre>`;
      await new Promise((resolve) => window.addEventListener("keydown", resolve, {once:true}));
    }

    const messages = ["Loading CAT.SYS...", "Loading MEMES.DLL...", "Mounting LINKS drive...", "Loading desktop...", "Starting Explorer...", "Starting LINKS.EXE..."];
    screen.innerHTML = `<div class="power-stage power-stage--splash"><div class="power-loader"><div class="power-status">Starting LINKS...</div>${segments(0)}</div></div>`;
    for (let i = 0; i < messages.length; i++) {
      if (run !== token) return;
      const value = (i + 1) / messages.length;
      $(".power-status", screen).textContent = messages[i];
      $(".segmented-progress", screen).outerHTML = segments(value);
      await sleep([310, 470, 280, 510, 300, 350][i]);
    }
    writeBootLog();
    await enterLogin();
  }

  async function enterLogin() {
    ++token;
    setState(STATES.LOGIN);
    O.finishBoot();
    $("#login-screen")?.focus?.();
    announce("LINKS 98 login ready.");
  }

  async function crashRecovery() {
    await transition(STATES.BOOTING, ["Windows did not shut down properly.", "Checking disk...", "No serious problems found.", "Cat remains installed."]);
    setState(STATES.DESKTOP);
    state.isLoggedIn = true;
    $("#desktop").focus();
    announce("Crash recovery complete.");
  }

  async function completeLogin(username) {
    setState(STATES.DESKTOP);
    const transition = showScreen("power-transition-screen");
    transition.innerHTML = `<div class="power-stage power-stage--black"></div>`;
    await sleep(110);
    transition.hidden = true;
    transition.classList.remove("is-visible");
    const login = $("#login-screen");
    login.hidden = true;
    login.classList.remove("is-visible");
    state.isLoggedIn = true;
    $("#desktop").focus();
    O.renderStartMenu();
    window.LINKS_OS?.restorePositions?.();
    beep();
    announce(`Welcome to LINKS 98, ${username}.`);
  }

  function findDirtyEditors() {
    const editors = $$(".notepad-area, [data-ide-text]");
    return editors.filter((el) => dirty.get(el));
  }

  async function confirmUnsaved() {
    for (const editor of findDirtyEditors()) {
      const isIde = editor.matches("[data-ide-text]");
      const answer = await showDialog({ title:"LINKS 98", message:`${isIde ? "code.js" : "untitled.txt"} has changed.\n\nDo you want to save changes?`, image:icon("document"), buttons:["Yes", "No", "Cancel"] });
      if (answer === "Cancel") return false;
      if (answer === "Yes") {
        if (isIde) editor.closest(".window")?.querySelector('[data-ide-action="save"]')?.click();
        else localStorage.setItem("links98:notepad", JSON.stringify(editor.value));
      }
      dirty.set(editor, false);
    }
    return true;
  }

  async function transition(kind, lines) {
    setState(kind);
    const screen = showScreen("power-transition-screen");
    screen.innerHTML = `<div class="power-dialog"><div class="titlebar"><span class="titlebar-title">LINKS 98</span></div><div class="power-dialog-body"><img src="${cat("sleep-curled")}" alt="Links Cat"><div class="power-copy">${escapeHTML(lines[0])}</div>${segments(0)}</div></div>`;
    for (let i = 0; i < lines.length; i++) {
      $(".power-copy", screen).textContent = lines[i];
      $(".segmented-progress", screen).outerHTML = segments((i + 1) / lines.length);
      await sleep(360);
    }
  }

  async function closePrograms() {
    if (wm.windows.size) {
      const screen = $("#power-transition-screen");
      const copy = $(".power-copy", screen);
      copy.innerHTML = `Waiting for LINKS.EXE to close...<div class="dialog-actions"><button class="win-button" data-force-end>End Task</button><button class="win-button" data-force-cancel>Cancel</button></div>`;
      const result = await Promise.race([
        sleep(700).then(() => "auto"),
        new Promise((resolve) => {
          $("[data-force-end]", screen).onclick = () => resolve("end");
          $("[data-force-cancel]", screen).onclick = () => resolve("cancel");
        })
      ]);
      if (result === "cancel") return false;
      if (result === "end") {
        copy.textContent = "LINKS.EXE is a system process.\nContinuing anyway.";
        await sleep(320);
      }
    }
    [...wm.windows.keys()].forEach((key) => wm.close(key));
    return true;
  }

  async function shutdown() {
    if (manager.state === STATES.SHUTTING_DOWN || manager.state === STATES.POWERED_OFF) return;
    try {
      if (!(await confirmUnsaved())) return;
    } catch (_) {}
    shutdownCount++;
    await transition(STATES.SHUTTING_DOWN, ["LINKS 98 is shutting down...", "Saving desktop settings...", "Closing programs...", "Disconnecting from Internet...", "Putting cat to sleep..."]);
    try {
      if (!(await closePrograms())) { setState(STATES.DESKTOP); state.isLoggedIn = true; return; }
    } catch (_) {
      [...wm.windows.keys()].forEach((key) => wm.close(key));
    }
    if (shutdownCount >= 3 && !shutdownJokeShown) {
      shutdownJokeShown = true;
      try {
        await showDialog({title:"LINKS CAT", message:"Why do you keep turning\nthe computer off?", image:cat("reactions/annoyed"), buttons:["Sorry"]});
      } catch (_) {}
    }
    const walker = document.createElement("img");
    walker.className = "shutdown-cat-walk";
    walker.src = cat("walk");
    walker.alt = "Links Cat walking to bed";
    document.body.append(walker);
    await sleep(520);
    walker.remove();
    powerSound("shutdown");
    state.isLoggedIn = false;
    setState(STATES.POWERED_OFF);
    const off = showScreen("shutdown-screen");
    if (off) {
      off.innerHTML = `<div class="shutdown-content powered-off">
        <div>
          <img src="${cat("sleep-curled")}" alt="Sleeping Links Cat" class="shutdown-cat-img">
          <div class="shutdown-text">It is now safe to turn off<br>your LINKS.</div>
          <small style="color: #c07800; display: block; margin-top: 6px;">The cat is sleeping.</small>
        </div>
        <button class="boot-again win-button" type="button" style="margin-top: 16px;">Boot again</button>
        <span class="power-indicator" aria-hidden="true">●</span>
      </div>`;
      $(".boot-again", off)?.addEventListener("click", (e) => {
        e.stopPropagation();
        wake();
      });
    }
  }

  async function restart() {
    if (manager.state === STATES.RESTARTING || manager.state === STATES.SHUTTING_DOWN) return;
    try {
      if (!(await confirmUnsaved())) return;
    } catch (_) {}
    await transition(STATES.RESTARTING, ["LINKS 98 is restarting...", "Saving settings...", "Restarting CAT.SYS..."]);
    try {
      if (!(await closePrograms())) { setState(STATES.DESKTOP); state.isLoggedIn = true; return; }
    } catch (_) {
      [...wm.windows.keys()].forEach((key) => wm.close(key));
    }
    await sleep(400);
    boot({restarting:true});
  }

  async function logoff() {
    if (manager.state === STATES.LOGGING_OFF || manager.state === STATES.LOGIN) return;
    try {
      if (!(await confirmUnsaved())) return;
    } catch (_) {}
    await transition(STATES.LOGGING_OFF, [`Logging off ${state.user.username}...`, "Closing applications...", "Saving profile..."]);
    try {
      if (!(await closePrograms())) { setState(STATES.DESKTOP); state.isLoggedIn = true; return; }
    } catch (_) {
      [...wm.windows.keys()].forEach((key) => wm.close(key));
    }
    state.isLoggedIn = false;
    $("#desktop-icons").style.opacity = "1";
    enterLogin();
  }

  function standby() {
    if (manager.state === STATES.STANDBY || manager.state === STATES.POWERED_OFF) return;
    setState(STATES.STANDBY);
    const screen = showScreen("standby-screen");
    screen.innerHTML = `<div class="standby-copy"><img src="${cat("sleep-curled")}" alt="Sleeping Links Cat"><strong>LINKS 98 is standing by.</strong><span>Press a key or click to resume.</span></div>`;
  }

  function monitorOff() {
    if (manager.state === STATES.MONITOR_OFF || manager.state === STATES.POWERED_OFF) return;
    setState(STATES.MONITOR_OFF);
    showScreen("monitor-off-screen").innerHTML = `<span class="sr-only">Monitor off. Move the mouse or press a key to wake.</span>`;
  }

  function wake() {
    if (manager.state === STATES.POWERED_OFF) return boot();
    if (manager.state === STATES.BOOTING || manager.state === STATES.SHUTTING_DOWN) return;
    setState(STATES.DESKTOP);
    state.isLoggedIn = true;
    $("#desktop").focus();
    announce("LINKS 98 resumed.");
  }

  const manager = { STATES, state:STATES.POWERED_OFF, boot, completeLogin, shutdown, restart, logoff, standby, monitorOff, wake, enterLogin, crashRecovery };
  window.powerManager = manager;

  document.addEventListener("keydown", (event) => {
    shiftHeld = event.shiftKey;
    if ([STATES.POWERED_OFF, STATES.STANDBY, STATES.MONITOR_OFF].includes(manager.state)) wake();
  }, true);
  document.addEventListener("keyup", (event) => { if (event.key === "Shift") shiftHeld = false; }, true);
  $("#shutdown-screen").addEventListener("click", () => manager.state === STATES.POWERED_OFF && wake());
  $("#standby-screen").addEventListener("click", wake);
  $("#monitor-off-screen").addEventListener("pointermove", wake, {once:false, passive:true});
  document.addEventListener("input", (event) => {
    if (event.target.matches?.(".notepad-area, [data-ide-text]")) dirty.set(event.target, true);
  }, true);
  document.addEventListener("click", (event) => {
    if (event.target.closest?.('[data-note="save"], [data-ide-action="save"]')) {
      const editor = event.target.closest(".window")?.querySelector(".notepad-area, [data-ide-text]");
      if (editor) queueMicrotask(() => dirty.set(editor, false));
    }
  }, true);

  const originalShutdownMount = APPS.shutdown?.mount;
  if (APPS.shutdown) APPS.shutdown.mount = (win) => {
    originalShutdownMount?.(win);
  };

  APPS.powermgmt = {
    title:"Power Management Properties", icon:icon("my-computer"), width:470, height:360, menu:false,
    render:() => `<div class="panel settings-panel"><h2>Power Management</h2><label>Turn off monitor after: <select><option>Never</option></select></label><label>System standby: <select><option>Never</option></select></label><label><input type="checkbox" checked> LINKS Cat sleep mode: Enabled</label><div class="dialog-actions"><button class="win-button" data-monitor-off>Turn Off Monitor</button><button class="win-button" data-standby>Standby</button><button class="win-button" data-window-action="close">Cancel</button></div></div>`,
    mount:(win) => { win.onclick = (event) => { if (event.target.closest("[data-monitor-off]")) { wm.close("powermgmt"); monitorOff(); } if (event.target.closest("[data-standby]")) { wm.close("powermgmt"); standby(); } }; }
  };

  if (APPS.control) {
    const oldRender = APPS.control.render;
    const oldMount = APPS.control.mount;
    APPS.control.render = () => oldRender().replace("</div>", `<button class="file-item" data-control="Power Management"><img src="${icon("my-computer")}" alt=""><span>Power Management</span></button></div>`);
    APPS.control.mount = (win) => { oldMount?.(win); win.addEventListener("dblclick", (event) => { if (event.target.closest('[data-control="Power Management"]')) { event.stopImmediatePropagation(); wm.open("powermgmt"); } }, true); };
  }

  if (APPS.taskmgr) {
    const oldRender = APPS.taskmgr.render;
    const oldMount = APPS.taskmgr.mount;
    APPS.taskmgr.render = () => oldRender().replace('<button class="win-button" data-window-action="close">Cancel</button>', '<button class="win-button" data-power-shutdown>Shut Down...</button><button class="win-button" data-window-action="close">Cancel</button>');
    APPS.taskmgr.mount = (win) => { oldMount?.(win); win.addEventListener("click", (event) => { if (event.target.closest("[data-power-shutdown]")) { event.stopImmediatePropagation(); wm.close("taskmgr"); wm.open("shutdown"); } }, true); };
  }

  window.PowerManagerPending = false;
  boot();
})();
