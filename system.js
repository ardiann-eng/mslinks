(() => {
  "use strict";
  const O = window.LINKS_OS_CORE;
  if (!O) return;
  const { $, $$, APPS, wm, icon, cat, appArt, escapeHTML, showDialog, closeMenus, announce } = O;
  const desktop = $("#desktop"), icons = $("#desktop-icons");
  const get = (k, f) => { try { return JSON.parse(localStorage.getItem(`links98:${k}`)) ?? f; } catch (_) { return f; } };
  const set = (k, v) => { try { localStorage.setItem(`links98:${k}`, JSON.stringify(v)); } catch (_) {} };
  const VFS = {
    "My Computer": ["3½ Floppy (A:)","Local Disk (C:)","Printers","Internet Drive (L:)","Memes (M:)","Moon Drive (X:)"],
    "A:\\": ["README.txt","CATDRIVER.SYS","SETUP.EXE"],
    "C:\\": ["PROGRAMS","LINKS","WINDOWS","MEMES","SYSTEM","TEMP","USERS","DEV","GAMES"],
    "C:\\LINKS": ["LINKS.EXE","CONTRACT.TXT","WHITEPAPER.TXT","README.TXT","lore.txt","cat_notes.txt","HOLD.EXE","DO_NOT_OPEN","EXAMPLES","LINKS98_SETUP.EXE"],
    "C:\\LINKS\\DO_NOT_OPEN": ["classified.txt","market_control.bmp","behind.exe"],
    "C:\\LINKS\\EXAMPLES": ["HELLO.JS","CAT.JS","LOOP.JS","MARKET.JS","HELLO.HTML"],
    "C:\\DEV": ["EXAMPLES","PROJECTS","README.TXT"],
    "C:\\DEV\\EXAMPLES": ["HELLO.JS","CAT.JS","LOOP.JS","MARKET.JS","HELLO.HTML"],
    "C:\\DEV\\PROJECTS": ["index.html","style.css","app.js"],
    "C:\\USERS": ["DEGEN98"],
    "C:\\USERS\\DEGEN98": ["DOCUMENTS","PROJECTS"],
    "C:\\USERS\\DEGEN98\\DOCUMENTS": ["notes.txt"],
    "C:\\USERS\\DEGEN98\\PROJECTS": ["test.js"],
    "C:\\GAMES": ["ARCADE.EXE","SOLITAIRE.EXE"],
    "C:\\WINDOWS": ["CAT.SYS","bullish.sys","win.com","BOOTLOG.TXT","SYSTEM"],
    "C:\\WINDOWS\\SYSTEM": ["CAT"], "C:\\WINDOWS\\SYSTEM\\CAT": ["origin.txt"],
    "C:\\PROGRAMS": ["Calculator","Paint","Notepad","LINKS Pet","LINKS Solitaire","LINKS Antivirus","Live Tape","Holder Map","LINKS Code Editor"],
    "C:\\MEMES": ["6127267243344204762.jpg","6127267243344204763.jpg","6127267243344204764.jpg","6127267243344204765.jpg","6127267243344204766.jpg","6127267243344204767.jpg","6127267243344204768.jpg","6127267243344204769.jpg","6127267243344204770.jpg","6127267243344204771.jpg","6127267243344204811.jpg","6127267243344204812.jpg","6127267243344204813.jpg","6127267243344204814.jpg","6127267243344204815.jpg","6127267243344204816.jpg","6127267243344204817.jpg","6127267243344204819.jpg","6127267243344204820.jpg","6127267243344204821.jpg","6127267243344204822.jpg","6127267243344204912.jpg","6127267243344204914.jpg","6127267243344204915.jpg","6127267243344204916.jpg","internet-cat.jpg","lost-server-room.jpg"],
    "C:\\SYSTEM": ["kernel.cat","internet.dll"], "C:\\TEMP": ["definitely_not_alpha.txt"],
    "Printers": ["LINKS Printer"],
    "Recycle Bin": ["SELL.EXE","PAPERHANDS.DLL","FUD.TXT","PANIC.EXE","BAD_ENTRY.BMP","JEET.EXE"], "X:\\": ["moon.exe","destination.txt","higher.bmp"]
  };
  const notes = {
    "cat_notes.txt": "things to do:\n- sleep\n- inspect internet\n- delete sell button\n- become operating system",
    "definitely_not_alpha.txt": "The password is what a cat says. This is definitely not alpha.",
    "README.txt": "Welcome to LINKS 98. Double-click things. The cat likes that.",
    "README.TXT": "LINKS 98 README\n\nCongratulations. You have installed a cat on your computer. Nobody knows why. Please do not uninstall him.\n\nKnown Issues:\n- SELL.EXE missing\n- Cat has administrator privileges\n- Internet occasionally becomes bullish\n- Recycle Bin contains emotional decisions",
    "CONTRACT.TXT": `LINKS CONTRACT ADDRESS\n\n${O.CONFIG.CONTRACT_ADDRESS || "TOKEN NOT CONFIGURED"}\n\nNETWORK:\nROBINHOOD CHAIN (Chain ID: 4663)\n\nVERIFY BEFORE USING.`,
    "WHITEPAPER.TXT": "LINKS WHITEPAPER\nVersion 0.98\n\n1. Cat.\n2. Internet.\n3. Meme.\n4. That's basically it.\n\nTECHNOLOGY:\nRuns on: Internet\nPowered by: Cats\nConsensus mechanism: Everyone seems to agree the cat is cool.\n\nROADMAP:\nPhase 1: Cat\nPhase 2: Internet\nPhase 3: More Cat\nPhase 4: Unknown\n\nEND OF DOCUMENT",
    "origin.txt": "Nobody installed Links.\n\nOne morning he was simply here.\n\nSystem logs indicate LINKS.EXE existed before LINKS 98 finished installing.\n\nCreated: UNKNOWN\nOwner: UNKNOWN\nLast modified: Tomorrow",
    "lore.txt": "In 1998, LINKS.exe appeared on a computer nobody remembered installing it on."
  };
  const file = name => `<button class="file-item" data-vfs="${escapeHTML(name)}"><img src="${icon(/internet/i.test(name)?"internet":/meme/i.test(name)?"memes":/moon/i.test(name)?"moon":name.includes(".")?"document":"my-computer")}" alt=""><span>${escapeHTML(name)}</span></button>`;
  let path = "My Computer", history = [path], historyAt = 0;
  const mappedApp = name => ({"internet drive (l:)":"internet","memes (m:)":"memes","moon drive (x:)":"moon","links.exe":"links","links98_setup.exe":"setup","setup.exe":"setup","calculator":"calculator","paint":"paint","notepad":"notepad","links printer":"printer","printer":"printer","links solitaire":"solitaire","solitaire":"solitaire","links antivirus":"antivirus","antivirus":"antivirus","live tape":"livetape","holder map":"holdermap","internet weather":"weather"})[name.toLowerCase()];
  const nextPath = name => name.includes("(A:)")?"A:\\":name.includes("(C:)")?"C:\\":path.endsWith("\\")?path+name:`${path}\\${name}`;
  function drawExplorer(win) { const list=VFS[path]||[]; $("[data-address]",win).value=path; $("[data-files]",win).innerHTML=list.map(file).join(""); $("[data-count]",win).textContent=`${list.length} object(s)`; $$('[data-tree]',win).forEach(x=>x.classList.toggle("is-current",x.dataset.tree===path)); }
  function go(to, win, push=true) { if(!VFS[to]) return; path=to; if(push){ history=history.slice(0,historyAt+1); history.push(to); historyAt++; } drawExplorer(win); }
  function openItem(name, win) {
    if(name==="DO_NOT_OPEN") return password(win);
    if(mappedApp(name)) return wm.open(mappedApp(name));
    if(name==="Memes (M:)") return wm.open("memes"); if(name==="Moon Drive (X:)") return wm.open("moon");
    const to=nextPath(name); if(VFS[to]) return go(to,win);
    const ext = name.split(".").pop().toLowerCase();
    if(["js", "json", "css"].includes(ext)) {
      wm.open("editor");
      const eWin = wm.windows.get("editor");
      if(eWin && eWin.element._loadFile) eWin.element._loadFile(to);
      return;
    }
    if(ext === "html") {
      wm.open("preview");
      const pWin = wm.windows.get("preview");
      if(pWin && pWin.element._loadHtml) pWin.element._loadHtml(to);
      return;
    }
    if(notes[name] || ext === "txt"){
      const content = notes[name] || (window.LINKS_VFS ? window.LINKS_VFS.readFile(to) : "");
      set("notepad", content);
      wm.close("notepad");
      return wm.open("notepad");
    }
    if(name==="SELL.EXE") return showDialog({title:"Access Denied",message:"Selling has been disabled by LINKS CAT.",image:cat("warning-cat")});
    showDialog({title:name,message:`Type: File\nLocation: ${path}\nStatus: Still here.`,image:icon("document")});
  }
  APPS.computer={title:"My Computer",icon:icon("my-computer"),width:760,height:520,status:"Explorer",render:()=>`<div class="explorer-toolbar"><button class="win-button" data-nav="back">Back</button><button class="win-button" data-nav="forward">Forward</button><button class="win-button" data-nav="up">Up</button><button class="win-button" data-nav="view">View</button></div><div class="address-row"><span>Address</span><input data-address readonly></div><div class="explorer-shell"><nav class="folder-tree"><button data-tree="My Computer">Desktop<br>└ My Computer</button><button data-tree="C:\\">&nbsp;├ Local Disk (C:)</button><button data-tree="C:\\DEV">&nbsp;│ ├ DEV</button><button data-tree="C:\\LINKS">&nbsp;│ ├ LINKS</button><button data-tree="C:\\PROGRAMS">&nbsp;│ ├ PROGRAMS</button><button data-tree="C:\\USERS">&nbsp;│ ├ USERS</button><button data-tree="C:\\MEMES">&nbsp;│ ├ MEMES</button><button data-tree="C:\\SYSTEM">&nbsp;│ └ SYSTEM</button><button data-tree="Recycle Bin">└ Recycle Bin</button></nav><div class="file-grid" data-files></div></div><div class="statusbar" data-count></div>`,mount:win=>{path="My Computer";history=[path];historyAt=0;drawExplorer(win);win.onclick=e=>{const tree=e.target.closest("[data-tree]");if(tree)go(tree.dataset.tree,win);const n=e.target.closest("[data-nav]")?.dataset.nav;if(n==="back"&&historyAt){path=history[--historyAt];drawExplorer(win)}if(n==="forward"&&historyAt<history.length-1){path=history[++historyAt];drawExplorer(win)}if(n==="up"){const i=path.lastIndexOf("\\");go(i<=2?"My Computer":path.slice(0,i),win)}if(n==="view")$("[data-files]",win).classList.toggle("is-list-view");const vfs=e.target.closest("[data-vfs]");if(vfs&&window.innerWidth<=600)openItem(vfs.dataset.vfs,win)};win.ondblclick=e=>{const x=e.target.closest("[data-vfs]");if(x)openItem(x.dataset.vfs,win)}}};
  function password(win){const b=document.createElement("div");b.className="dialog-backdrop";b.innerHTML=`<form class="dialog"><div class="titlebar"><span class="titlebar-title">Enter Network Password</span></div><div class="dialog-body"><img class="dialog-icon" src="${cat("reactions/concerned")}" alt=""><div><label>Password:</label><input class="ca-field" type="password"></div></div><div class="dialog-actions"><button class="win-button">OK</button><button type="button" class="win-button" data-cancel>Cancel</button></div></form>`;$("#dialog-layer").append(b);$("form",b).onsubmit=e=>{e.preventDefault();if($("input",b).value.toLowerCase()==="meow"){b.remove();set("secret",true);go("C:\\LINKS\\DO_NOT_OPEN",win)}else showDialog({title:"Access Denied",message:"Incorrect password.",type:"error"})};$("[data-cancel]",b).onclick=()=>b.remove();$("input",b).focus()}
  APPS.notepad={
    title:"Untitled - Notepad",
    icon:icon("document"),
    width:680,
    height:500,
    status:"Ln 1, Col 1",
    render:()=>`<div class="notepad-menu"><button data-note="new">File: New</button><button data-note="open">Open</button><button data-note="save">Save As</button><button data-note="search">Search</button><button data-note="help">Help</button></div><textarea class="notepad-area" spellcheck="false"></textarea>`,
    mount:win=>{
      const a=$("textarea",win);
      a.value=get("notepad",notes["cat_notes.txt"]);
      win.onclick=async e=>{
        const x=e.target.closest("[data-note]")?.dataset.note;
        if(x==="new"){
          a.value="";
          a.focus();
        }
        if(x==="open"){
          a.value=notes["README.txt"];
          a.focus();
        }
        if(x==="save"){
          set("notepad",a.value);
          try {
            const blob = new Blob([a.value], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "untitled.txt";
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (_) {}
          announce("Saved as untitled.txt");
          await showDialog({ title:"Notepad", message:"Document saved as untitled.txt.", image:icon("document") });
        }
        if(x==="search"){
          showDialog({title:"Notepad Search",message:"Use Ctrl+F to search this document.",image:icon("document")});
        }
        if(x==="help"){
          showDialog({title:"Notepad Help",message:"Type words. Save them. The cat cannot guarantee confidentiality.",image:cat("reactions/confident")});
        }
      };
    }
  };
  APPS.control={title:"Control Panel",icon:icon("my-computer"),width:690,height:510,status:"7 object(s)",render:()=>`<div class="control-grid">${["Display","Mouse","Sounds","Date/Time","Bullish Settings","Desktop","About LINKS 98"].map(x=>`<button class="file-item" data-control="${x}"><img src="${icon("my-computer")}" alt=""><span>${x}</span></button>`).join("")}</div>`,mount:win=>{const handleCtrl=e=>{const x=e.target.closest("[data-control]")?.dataset.control;if(!x)return;wm.open(x==="Display"||x==="Desktop"?"display98":x==="Date/Time"?"datetime":x==="Sounds"?"sounds":x==="Mouse"?"mouse":x==="Bullish Settings"?"bullish":"about")};win.ondblclick=handleCtrl;win.onclick=e=>{if(window.innerWidth<=600)handleCtrl(e)}}};
  APPS.display98={title:"Display Properties",icon:icon("my-computer"),width:520,height:430,menu:false,render:()=>`<div class="tabs"><button class="tab" aria-selected="true">Background</button><button class="tab">Screen Saver</button></div><div class="panel settings-panel"><div class="monitor-preview">LINKS 98</div><fieldset><legend>Wallpaper</legend><label><input type="radio" name="wall" value="links" checked> LINKS wallpaper</label><label><input type="radio" name="wall" value="teal"> Classic teal</label></fieldset><label>Picture display <select data-wall><option>Stretch</option><option>Center</option><option>Tile</option></select></label><label>Screen saver <select data-saver><option>LINKS Bounce</option><option>Flying Floppy Disks</option><option>3D Text: LINKS</option><option>None</option></select></label><button class="win-button" data-preview>Preview</button></div>`,mount:win=>{win.onchange=e=>{if(e.target.name==="wall")desktop.dataset.wallpaper=e.target.value==="teal"?"teal":`links-${$("[data-wall]",win).value.toLowerCase()}`;if(e.target.matches("[data-wall]"))desktop.dataset.wallpaper=`links-${e.target.value.toLowerCase()}`;if(e.target.matches("[data-saver]"))set("screensaver",e.target.value);set("wallpaper",desktop.dataset.wallpaper)};win.onclick=e=>{if(e.target.closest("[data-preview]"))O.startScreensaver()}}};
  APPS.desktopprops={title:"Desktop Properties",icon:icon("my-computer"),width:570,height:500,menu:false,render:()=>`<div class="tabs desktop-prop-tabs" role="tablist">${["Background","Appearance","LINKS","System"].map((x,i)=>`<button class="tab" data-prop-tab="${x.toLowerCase()}" aria-selected="${i===0}">${x}</button>`).join("")}</div><div class="desktop-prop-page panel" data-prop-page></div><div class="dialog-actions"><button class="win-button" data-prop-ok>OK</button><button class="win-button" data-window-action="close">Cancel</button><button class="win-button" data-prop-apply>Apply</button></div>`,mount:win=>{let tab="background";const render=()=>{const page=$("[data-prop-page]",win);if(tab==="background")page.innerHTML=`<div class="monitor-preview">LINKS 98</div><label>Wallpaper: <select data-bg-choice><option value="links">LINKS Hills</option><option value="teal">Classic Teal</option></select></label><label>Display: <select data-bg-display><option>Center</option><option>Tile</option><option selected>Stretch</option></select></label>`;if(tab==="appearance")page.innerHTML=`<label>Scheme: <select data-scheme><option>Windows Standard</option><option>LINKS Classic</option><option>Terminal Green</option><option>High Contrast</option><option>Bull Market</option></select></label><div class="appearance-preview"><span>Active Window</span><button class="win-button">Button</button></div>`;if(tab==="links")page.innerHTML=`<div class="links-property"><img src="${cat("sit")}" alt="Links Cat"><div><label><input type="checkbox" data-pet-enabled ${$("#desktop-pet")?"checked":""}> LINKS Desktop Pet Enabled</label><label>Pet Behavior: <select><option>Random</option><option>Sleeping</option><option>Walking</option><option>Watching Market</option><option>Maximum Chaos</option></select></label><label><input type="checkbox" checked> Random desktop appearances</label><label><input type="checkbox" checked> React to windows</label><label><input type="checkbox" checked> React to market events</label></div></div>`;if(tab==="system")page.innerHTML=`<h2>LINKS 98</h2><dl class="property-list"><dt>Registered to:</dt><dd>LINKS Holder</dd><dt>Computer:</dt><dd>Pentium Cat Processor<br>64 MB RAM<br>Diamond Paws Accelerator</dd><dt>Crypto subsystem:</dt><dd>ONLINE</dd><dt>Market connection:</dt><dd>CONNECTED</dd></dl>`};render();win.onclick=e=>{const t=e.target.closest("[data-prop-tab]");if(t){tab=t.dataset.propTab;$$('[data-prop-tab]',win).forEach(x=>x.setAttribute("aria-selected",String(x===t)));render()}if(e.target.closest("[data-prop-apply],[data-prop-ok]")){const bg=$("[data-bg-choice]",win),display=$("[data-bg-display]",win),scheme=$("[data-scheme]",win),petToggle=$("[data-pet-enabled]",win);if(bg)desktop.dataset.wallpaper=bg.value==="teal"?"teal":`links-${display.value.toLowerCase()}`;if(scheme)document.body.dataset.scheme=scheme.value.toLowerCase().replaceAll(" ","-");if(petToggle&&petToggle.checked!==Boolean($("#desktop-pet")))togglePet();set("wallpaper",desktop.dataset.wallpaper);if(e.target.closest("[data-prop-ok]"))wm.close("desktopprops")}}}};
  APPS.systemprops={title:"System Properties",icon:icon("my-computer"),width:520,height:410,menu:false,render:()=>`<div class="tabs"><button class="tab" aria-selected="true">General</button></div><div class="panel"><div class="about-layout"><img src="${appArt("computer-hug-cat")}" alt="Links Cat hugging a computer"><dl class="property-list"><dt>System:</dt><dd>LINKS 98</dd><dt>Registered to:</dt><dd>internet_user</dd><dt>Processor:</dt><dd>CAT-98 @ 100 MHz</dd><dt>Memory:</dt><dd>64 MB</dd><dt>Internet:</dt><dd>Yes</dd><dt>Crypto:</dt><dd>Enabled</dd><dt>Status:</dt><dd>Somehow Stable</dd></dl></div></div><div class="dialog-actions"><button class="win-button" data-window-action="close">OK</button></div>`};
  APPS.sounds={title:"Sounds Properties",icon:icon("document"),width:410,height:250,menu:false,render:()=>`<div class="panel settings-panel"><h2>Sound</h2><label><input data-sound type="checkbox" ${O.state.sound?"checked":""}> Enable retro UI sounds</label><p>Scheme: LINKS 98 Default</p></div>`,mount:win=>$("[data-sound]",win).onchange=e=>{O.state.sound=e.target.checked;set("sound",O.state.sound)}};
  APPS.mouse={title:"Mouse Properties",icon:icon("my-computer"),width:430,height:280,menu:false,render:()=>`<div class="panel settings-panel"><h2>Pointers</h2><label><input type="radio" name="cursor" value="default" checked> Windows Standard</label><label><input type="radio" name="cursor" value="crosshair"> Precision Cat</label><label><input type="radio" name="cursor" value="help"> Help Select</label></div>`,mount:win=>win.onchange=e=>{if(e.target.name==="cursor"){desktop.style.cursor=e.target.value;set("cursor",e.target.value)}}};
  APPS.bullish={title:"Bullish Settings",icon:icon("market"),width:430,height:320,menu:false,render:()=>`<div class="panel settings-panel"><h2>LINKS Market Preferences</h2><label>Bullish Mode <input type="checkbox" checked> ON</label><label>Paper Hands <input type="checkbox"> OFF</label><label>Destination <select><option>UNKNOWN</option><option>HIGHER</option></select></label><label>Selling <button class="win-button" disabled>DISABLED</button></label></div>`};
  function calendar(d){const first=new Date(d.getFullYear(),d.getMonth(),1).getDay(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();return `<strong>${d.toLocaleString(undefined,{month:"long"})} ${d.getFullYear()}</strong><div class="calendar-grid">${["S","M","T","W","T","F","S"].map(x=>`<b>${x}</b>`).join("")}${Array(first).fill("<span></span>").join("")}${Array.from({length:days},(_,i)=>`<span class="${i+1===d.getDate()?"today":""}">${i+1}</span>`).join("")}</div>`}
  APPS.datetime={title:"Date/Time Properties",icon:icon("document"),width:520,height:420,menu:false,render:()=>`<div class="datetime"><button class="clock-cat"><img src="${cat("sit")}" alt="Links Cat"></button><div><h2 data-time></h2><p data-date></p><div class="calendar" data-calendar></div></div></div>`,mount:win=>{let clicks=0;const tick=()=>{const d=new Date();$("[data-time]",win).textContent=d.toLocaleTimeString();$("[data-date]",win).textContent=d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});$("[data-calendar]",win).innerHTML=calendar(d)};tick();win._timer=setInterval(tick,1000);$(".clock-cat",win).onclick=()=>{if(++clicks===7){$("[data-time]",win).textContent="19:98";showDialog({title:"Date/Time",message:"SYSTEM TIME CORRECTED.",image:cat("reactions/confident")});clicks=0}}},unmount:win=>clearInterval(win._timer)};
  APPS.help98={title:"LINKS Help",icon:icon("document"),width:650,height:470,status:"Help Topics",render:()=>`<div class="help-shell"><nav>${["Welcome to LINKS 98","Using the Desktop","How to Buy LINKS","About Links Cat","Using Memes","Keyboard Shortcuts","Troubleshooting"].map((x,i)=>`<button data-help="${i}">${x}</button>`).join("")}</nav><article data-help-copy><h2>Welcome to LINKS 98</h2><p>Double-click things. Right-click everything else.</p></article></div>`,mount:win=>win.onclick=e=>{const i=e.target.closest("[data-help]")?.dataset.help;if(i==null)return;const c=["Double-click things. The cat likes that.","Click icons to select. Drag empty space to select several. Drag icons to move them.","Open LINKS.exe or Buy LINKS. Only official configured links are used.","Links Cat has administrator privileges and no comment.","Open Memes and double-click an image.","Alt+Tab switches apps. Alt+F4 closes. Ctrl+Esc opens Start. F1 opens Help. Ctrl+Shift+Esc opens Close Program.","Problem: I cannot sell. Solution: This feature is working as intended.\n\nProblem: Links Cat keeps appearing. Solution: Correct."];$("[data-help-copy]",win).innerHTML=`<h2>${escapeHTML(e.target.textContent)}</h2><p>${escapeHTML(c[i])}</p>`}};
  APPS.help = APPS.help98;
  APPS.search={title:"Find: Files or Folders",icon:icon("my-computer"),width:650,height:470,status:"Ready",render:()=>`<form class="search-form"><label>Named: <input class="ca-field" data-query></label><button class="win-button">Find Now</button></form><div class="file-grid" data-results><p>Enter all or part of a file name.</p></div>`,mount:win=>$("form",win).onsubmit=e=>{e.preventDefault();const q=$("[data-query]",win).value.toLowerCase(),all=[...new Set(Object.values(VFS).flat())],found=all.filter(x=>x.toLowerCase().includes(q)||(q==="links"&&["lore.txt","links_cat.bmp"].includes(x.toLowerCase())));$("[data-results]",win).innerHTML=found.length?found.map(file).join(""):"<p>No files found.</p>";win.querySelector(".statusbar").textContent=`${found.length} object(s)`}};
  APPS.network={title:"THE INTERNET Status",icon:icon("internet"),width:420,height:340,menu:false,render:()=>`<div class="panel"><h2>Connected</h2><dl class="property-list"><dt>Connected to:</dt><dd>THE INTERNET</dd><dt>Speed:</dt><dd>56.0 Kbps</dd><dt>Duration:</dt><dd>00:42:17</dd><dt>Bytes sent:</dt><dd>cats</dd><dt>Bytes received:</dt><dd>memes</dd></dl></div><div class="dialog-actions"><button class="win-button" data-disconnect>Disconnect</button><button class="win-button" data-details>Details</button></div>`,mount:win=>win.onclick=e=>{if(e.target.closest("[data-disconnect]"))showDialog({title:"Network",message:"Connection cannot be closed.\nLinks is using the internet.",image:icon("internet")});if(e.target.closest("[data-details]"))showDialog({title:"Network Details",message:"Protocol: TCP/CAT\nStatus: Somehow still online.",image:icon("internet")})}};
  APPS.setup={title:"LINKS 98 Setup",icon:icon("my-computer"),width:590,height:430,menu:false,render:()=>`<div class="wizard"><div class="wizard-page"><div class="wizard-side"><img src="${appArt("installer-cat")}" alt=""></div><div class="wizard-copy"><h2>Welcome to LINKS 98 Setup</h2><p data-install>This wizard will install LINKS 98 into C:\\LINKS.</p><progress max="100" value="0"></progress></div></div><div class="wizard-footer"><button class="win-button" data-next>Next &gt;</button></div></div>`,mount:win=>$("[data-next]",win).onclick=()=>{const lines=["Copying cat.dll","Installing bullish.sys","Deleting selling.exe","Registering memes.ocx","Starting LINKS.exe","LINKS 98 has been successfully installed."];let i=0,t=setInterval(()=>{$("[data-install]",win).textContent=lines[i];$("progress",win).value=++i/lines.length*100;if(i===lines.length){clearInterval(t);set("installed",true)}},500)}};
  APPS.taskmgr={title:"Close Program",icon:icon("my-computer"),width:460,height:390,menu:false,render:()=>`<div class="task-list" data-tasks></div><div class="dialog-actions"><button class="win-button" data-end>End Task</button><button class="win-button" data-switch>Switch To</button><button class="win-button" data-window-action="close">Cancel</button></div>`,mount:win=>{const refresh=()=>{
    const openTasks = [...wm.windows.keys()].filter(k=>k!=="taskmgr").map((k,i)=>`<label><input type="radio" name="task" value="${k}" ${i?"":"checked"}> ${escapeHTML(APPS[k]?.title || k)}</label>`);
    if (window.LINKS_ACTIVE_RUNNERS && window.LINKS_ACTIVE_RUNNERS.size > 0) {
      openTasks.push(`<label><input type="radio" name="task" value="JSRUNTIME.EXE" ${openTasks.length ? "" : "checked"}> JSRUNTIME.EXE (JavaScript Runtime)</label>`);
    }
    $("[data-tasks]",win).innerHTML=openTasks.join("")||"No programs are running.";
  };
  refresh();
  win.onclick=async e=>{
    const k=$("input[name=task]:checked",win)?.value;
    if(e.target.closest("[data-switch]")&&k&&k!=="JSRUNTIME.EXE")wm.focus(k);
    if(e.target.closest("[data-end]")&&k){
      if(k==="JSRUNTIME.EXE"){
        if (window.LINKS_ACTIVE_RUNNERS) {
          for(const runner of window.LINKS_ACTIVE_RUNNERS) runner.stop();
        }
        refresh();
        return;
      }
      if(k==="links"){
        const r=await showDialog({title:"Warning",message:"LINKS.exe is a critical system process.",image:cat("warning-cat"),buttons:["End Anyway","Cancel"]});
        if(r!=="End Anyway")return;
        desktop.classList.add("system-glitch");
        wm.close(k);
        setTimeout(()=>{desktop.classList.remove("system-glitch");wm.open("links");showDialog({title:"LINKS.exe",message:"Nice try.",image:cat("reactions/unimpressed")})},700);
      } else wm.close(k);
      refresh();
    }
  }}};

  let selected=new Set(), auto=get("autoArrange",false);
  function updateDesktopRows() {
    const isMobile = innerWidth <= 600;
    const cols = innerWidth <= 360 ? 2 : innerWidth <= 540 ? 3 : 4;
    document.documentElement.style.setProperty('--mobile-desktop-cols', String(cols));
    const rows = Math.max(4, Math.min(8, Math.floor((innerHeight - 60) / 96)));
    document.documentElement.style.setProperty('--desktop-rows', String(rows));
    if (isMobile) {
      icons.dataset.freeMode = "false";
      $$('.desktop-icon', icons).forEach(x => {
        x.style.left = "";
        x.style.top = "";
        x.dataset.free = "false";
      });
    }
  }
  updateDesktopRows();
  window.addEventListener("resize", updateDesktopRows);
  window.addEventListener("orientationchange", () => {
    setTimeout(updateDesktopRows, 100);
  });

  function clearSelection(){selected.clear();$$('.desktop-icon',icons).forEach(x=>x.classList.remove("is-selected"))}
  function select(el,on=true){el.classList.toggle("is-selected",on);on?selected.add(el.dataset.desktopApp):selected.delete(el.dataset.desktopApp)}
  function savePositions(){
    if (innerWidth <= 600) return;
    const p={};
    $$('.desktop-icon',icons).forEach(x=>{
      if(x.style.left && x.style.top){
        p[x.dataset.desktopApp]={left:x.style.left,top:x.style.top};
      }
    });
    set("iconPositions_v5",p);
  }
  function restorePositions(){
    const isMobile = innerWidth <= 600;
    const allIcons = $$('.desktop-icon', icons);
    if (isMobile) {
      icons.dataset.freeMode = "false";
      allIcons.forEach(x => {
        x.style.left = "";
        x.style.top = "";
        x.dataset.free = "false";
      });
      return;
    }

    const p=get("iconPositions_v5",null);
    const rows = Math.max(4, Math.min(8, Math.floor((innerHeight - 60) / 96)));
    icons.dataset.freeMode="true";

    if(!p){
      allIcons.forEach((x, i)=>{
        x.dataset.free="true";
        const col = Math.floor(i / rows);
        const row = i % rows;
        x.style.left=`${16+col*98}px`;
        x.style.top=`${16+row*92}px`;
      });
      savePositions();
      return;
    }

    const occupied = new Set();
    const unplaced = [];

    allIcons.forEach(x => {
      const k = x.dataset.desktopApp;
      if (p[k] && p[k].left && p[k].top) {
        const l = parseInt(p[k].left, 10) || 0;
        const t = parseInt(p[k].top, 10) || 0;
        const gridKey = `${Math.round(l / 98)}_${Math.round(t / 92)}`;
        if (!occupied.has(gridKey)) {
          occupied.add(gridKey);
          x.dataset.free="true";
          x.style.left=p[k].left;
          x.style.top=p[k].top;
          return;
        }
      }
      unplaced.push(x);
    });

    // Place any new or overlapping icons in the next available slots
    let slot = 0;
    unplaced.forEach(x => {
      while (true) {
        const col = Math.floor(slot / rows);
        const row = slot % rows;
        const key = `${col}_${row}`;
        slot++;
        if (!occupied.has(key)) {
          occupied.add(key);
          x.dataset.free="true";
          x.style.left=`${16+col*98}px`;
          x.style.top=`${16+row*92}px`;
          break;
        }
      }
    });

    savePositions();
  }
  const iconMeta={computer:{type:"system",size:640},recycle:{type:"system",size:0},lore:{type:"document",size:12},links:{type:"application",size:98},terminal:{type:"application",size:64},market:{type:"application",size:72},memes:{type:"folder",size:4096},internet:{type:"application",size:256},moon:{type:"folder",size:384},community:{type:"shortcut",size:1},buy:{type:"shortcut",size:1},about:{type:"application",size:42},chart:{type:"application",size:84},arcade:{type:"application",size:128},profile:{type:"system",size:16},livetape:{type:"application",size:112},holdermap:{type:"application",size:140},antivirus:{type:"application",size:98},printer:{type:"system",size:64},solitaire:{type:"application",size:128},weather:{type:"application",size:56},linksmarket:{type:"group",size:320},linksonline:{type:"group",size:256},notepad:{type:"application",size:48},editor:{type:"application",size:192}};
  function arrange(mode="type"){
    const isMobile = innerWidth <= 600;
    const list=$$('.desktop-icon',icons).sort((a,b)=>{
      const am=iconMeta[a.dataset.desktopApp]||{type:a.dataset.tempKind||"file",size:0};
      const bm=iconMeta[b.dataset.desktopApp]||{type:b.dataset.tempKind||"file",size:0};
      if(mode==="name")return a.textContent.localeCompare(b.textContent);
      if(mode==="size")return am.size-bm.size||a.textContent.localeCompare(b.textContent);
      return am.type.localeCompare(bm.type)||a.textContent.localeCompare(b.textContent);
    });

    if (isMobile) {
      icons.dataset.freeMode = "false";
      list.forEach(x => {
        x.style.left = "";
        x.style.top = "";
        x.dataset.free = "false";
        icons.append(x);
      });
      return;
    }

    icons.dataset.freeMode="true";
    const rows = Math.max(5, Math.min(8, Math.floor((innerHeight - 60) / 96)));
    list.forEach((x,i)=>{
      x.dataset.free="true";
      const col = Math.floor(i / rows);
      const row = i % rows;
      x.style.left=`${16+col*104}px`;
      x.style.top=`${16+row*96}px`;
    });
    savePositions();
  }
  restorePositions();

  function ensureFreeModeForDrag() {
    if (innerWidth <= 600) return;
    if (icons.dataset.freeMode !== "true") {
      const d = desktop.getBoundingClientRect();
      icons.dataset.freeMode = "true";
      $$('.desktop-icon', icons).forEach(el => {
        const r = el.getBoundingClientRect();
        el.dataset.free = "true";
        el.style.left = `${Math.round(r.left - d.left)}px`;
        el.style.top = `${Math.round(r.top - d.top)}px`;
      });
    }
  }

  let lastIconTapTime = 0;
  let lastIconTapTarget = null;
  icons.addEventListener("click", e => {
    const x = e.target.closest(".desktop-icon");
    if (!x) return;
    const now = performance.now();
    if (lastIconTapTarget === x && now - lastIconTapTime < 400) {
      const app = x.dataset.desktopApp;
      if (app) wm.open(app);
      lastIconTapTime = 0;
      lastIconTapTarget = null;
      return;
    }
    lastIconTapTime = now;
    lastIconTapTarget = x;
  });

  icons.addEventListener("pointerdown",e=>{
    const x=e.target.closest(".desktop-icon");
    if(!x||e.button||innerWidth<=600)return;
    e.stopPropagation();
    const d=desktop.getBoundingClientRect();
    ensureFreeModeForDrag();
    const r=x.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,sl=r.left-d.left,st=r.top-d.top;
    let moved=false;
    try { x.setPointerCapture(e.pointerId); } catch (_) {}
    const move=v=>{
      if(Math.hypot(v.clientX-sx,v.clientY-sy)<4)return;
      moved=true;
      x.style.left=`${Math.max(0,Math.min(d.width-88,sl+v.clientX-sx))}px`;
      x.style.top=`${Math.max(0,Math.min(d.height-120,st+v.clientY-sy))}px`;
    };
    x.addEventListener("pointermove",move);
    x.addEventListener("pointerup",()=>{
      x.removeEventListener("pointermove",move);
      if(moved)savePositions();
    },{once:true});
  },true);
  desktop.addEventListener("pointerdown",e=>{if(e.button||e.target!==desktop)return;clearSelection();closeMenus();const d=desktop.getBoundingClientRect(),sx=e.clientX-d.left,sy=e.clientY-d.top,b=document.createElement("div");b.className="selection-box";desktop.append(b);try{desktop.setPointerCapture(e.pointerId);}catch(_){}const move=v=>{const x=v.clientX-d.left,y=v.clientY-d.top,l=Math.min(sx,x),t=Math.min(sy,y),rr=Math.max(sx,x),bb=Math.max(sy,y);Object.assign(b.style,{left:`${l}px`,top:`${t}px`,width:`${rr-l}px`,height:`${bb-t}px`});$$('.desktop-icon',icons).forEach(el=>{const q=el.getBoundingClientRect();select(el,q.left<d.left+rr&&q.right>d.left+l&&q.top<d.top+bb&&q.bottom>d.top+t)})};desktop.addEventListener("pointermove",move);desktop.addEventListener("pointerup",()=>{b.remove();desktop.removeEventListener("pointermove",move)},{once:true})},true);
  const menuIcon=name=>name?`<img class="context-icon" src="${icon(name)}" alt="">`:'<span class="context-icon"></span>';
  function menu(items,x,y){
    const m=$("#context-menu");
    const rows=list=>list.map(i=>i.sep?'<div class="menu-separator"></div>':`<div class="context-entry"> <button class="menu-item" data-os="${i.a||""}" ${i.disabled?"disabled":""}>${menuIcon(i.icon)}<span class="context-label">${i.l}</span>${i.checked?'<span class="context-check">✓</span>':""}${i.sub?'<span class="context-arrow">▶</span>':""}</button>${i.sub?`<div class="context-submenu menu">${rows(i.sub)}</div>`:""}</div>`).join("");
    m.innerHTML=rows(items);m.hidden=false;
    const rect=m.getBoundingClientRect();
    const left=Math.max(4,Math.min(x,innerWidth-(rect.width||190)-4)),top=Math.max(4,Math.min(y,innerHeight-(rect.height||220)-4));
    Object.assign(m.style,{left:`${left}px`,top:`${top}px`});
    $$(".context-entry", m).forEach(entry => {
      const sub = $(":scope > .context-submenu", entry);
      if (!sub) return;
      const updateFlip = () => {
        const er = entry.getBoundingClientRect();
        sub.classList.toggle("flip-left", er.right + 170 > innerWidth);
        sub.classList.toggle("flip-up", er.top + 150 > innerHeight);
      };
      entry.addEventListener("pointerenter", updateFlip);
      entry.addEventListener("click", e => {
        if (e.target.closest(".menu-item")) {
          entry.classList.toggle("is-open");
          updateFlip();
        }
      });
    });
  }

  // Universal Touch Long-Press -> Right Click
  (function initLongPress() {
    let timer = null, startX = 0, startY = 0, targetEl = null;
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
      if (targetEl) { targetEl.classList.remove("long-pressing"); targetEl = null; }
    };
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { cancel(); return; }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      targetEl = e.target.closest(".desktop-icon, .file-item, .task-button, .start-button, .program-group-item, #quick-launch, .tray-button, #clock, #desktop");
      if (!targetEl) return;
      targetEl.classList.add("long-pressing");
      timer = setTimeout(() => {
        if (targetEl) targetEl.classList.remove("long-pressing");
        const evt = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: startX,
          clientY: startY,
          button: 2
        });
        (targetEl || document.elementFromPoint(startX, startY) || document.body).dispatchEvent(evt);
        try { navigator.vibrate?.(25); } catch (_) {}
        cancel();
      }, 500);
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!timer) return;
      const touch = e.touches[0];
      if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) {
        cancel();
      }
    }, { passive: true });

    document.addEventListener("touchend", cancel, { passive: true });
    document.addEventListener("touchcancel", cancel, { passive: true });
  })();
  let desktopClicks=[];
  desktop.addEventListener("contextmenu",e=>{
    if(e.target.closest(".window"))return;
    e.preventDefault();e.stopImmediatePropagation();closeMenus();
    const qlTarget=e.target.closest("#quick-launch");
    if(qlTarget){
      const qlBtn=e.target.closest(".quick-launch-btn");
      if(qlBtn?.dataset.qlApp==="links"){
        menu([
          {l:"Open LINKS",a:"open:links",icon:"links"},
          {l:"Market Control",a:"open:market",icon:"market"},
          {l:"Copy CA",a:"copy-ca",icon:"links"},
          {sep:true},
          {l:"Properties",a:"open:about",icon:"links"}
        ],e.clientX,e.clientY);
        return;
      }
      const ql=$("#quick-launch");
      const isText=ql?ql.classList.contains("show-text"):false;
      const isTitle=$("#quick-launch-title")?!$("#quick-launch-title").hidden:false;
      const app=qlBtn?.dataset.qlApp;
      menu([
        {l:"Open",a:app?`open:${app}`:"open:links",icon:"links"},
        {l:"Explore",a:"open:computer",icon:"my-computer"},
        {sep:true},
        {l:"Show Text",a:"ql:toggle-text",checked:isText},
        {l:"Show Title",a:"ql:toggle-title",checked:isTitle},
        {sep:true},
        {l:"Small Icons",a:"ql:small",checked:true},
        {sep:true},
        {l:"Close Toolbar",a:"ql:close",icon:"links"}
      ],e.clientX,e.clientY);
      return;
    }
    const x=e.target.closest(".desktop-icon");
    if(x){
      const key=x.dataset.desktopApp;
      if(key==="recycle")menu([{l:"Open",a:"open:recycle",icon:"recycle-full"},{l:"Explore",a:"explore:recycle",icon:"recycle-full"},{sep:true},{l:"Empty Recycle Bin",a:"empty-recycle",icon:"recycle-empty",disabled:false},{sep:true},{l:"Create Shortcut",a:"shortcut",icon:"links"},{l:"Rename",a:`rename:${key}`,icon:"document"},{sep:true},{l:"Properties",a:`props:${key}`,icon:"document"}],e.clientX,e.clientY);
      else if(key==="computer")menu([{l:"Open",a:"open:computer",icon:"my-computer"},{l:"Explore",a:"explore:computer",icon:"my-computer"},{sep:true},{l:"Find...",a:"find",icon:"my-computer"},{sep:true},{l:"Properties",a:"system-properties",icon:"document"}],e.clientX,e.clientY);
      else if(key==="linksmarket")menu([{l:"Open",a:"open:linksmarket",icon:"linksmarket"},{l:"Explore",a:"explore:linksmarket",icon:"linksmarket"},{sep:true},{l:"Create Shortcut",a:"shortcut",icon:"links"},{sep:true},{l:"Properties",a:"props:linksmarket",icon:"linksmarket"}],e.clientX,e.clientY);
      else if(key==="linksonline")menu([{l:"Open",a:"open:linksonline",icon:"linksonline"},{l:"Explore",a:"explore:linksonline",icon:"linksonline"},{sep:true},{l:"Create Shortcut",a:"shortcut",icon:"links"},{sep:true},{l:"Properties",a:"props:linksonline",icon:"linksonline"}],e.clientX,e.clientY);
      else menu([{l:"Open",a:`open:${key}`,icon:x.querySelector("img")?.src.includes("terminal")?"terminal":x.querySelector("img")?.src.includes("editor")?"editor":x.querySelector("img")?.src.includes("notepad")?"notepad":"links"},{l:"Explore",a:`explore:${key}`,icon:"my-computer"},{sep:true},{l:"Create Shortcut",a:"shortcut",icon:"links"},{sep:true},{l:"Properties",a:`props:${key}`,icon:"document"}],e.clientX,e.clientY);
      return;
    }
    if(e.target.closest(".taskbar")){
      const qlVisible=!$("#quick-launch")?.hidden;
      menu([
        {l:"Toolbars",icon:"my-computer",sub:[{l:"Quick Launch",a:"ql:toggle-visible",checked:qlVisible},{l:"LINKS Status",a:"toggle-ticker"},{l:"Desktop",a:"open:computer"}]},
        {sep:true},
        {l:"Cascade Windows",a:"cascade"},
        {l:"Tile Windows Horizontally",a:"tileh"},
        {l:"Tile Windows Vertically",a:"tilev"},
        {sep:true},
        {l:"Minimize All Windows",a:"minall"}
      ],e.clientX,e.clientY);
      return;
    }
    const now=Date.now();desktopClicks=[...desktopClicks.filter(t=>now-t<2200),now];const secret=desktopClicks.length>=5;
    menu([{l:"Arrange Icons",icon:"my-computer",sub:[{l:"By Name",a:"name"},{l:"By Type",a:"type"},{l:"By Size",a:"size"},{l:"Auto Arrange",a:"auto",checked:auto}]},{l:"Refresh",a:"refresh",icon:"my-computer"},{sep:true},{l:"New",icon:"document",sub:[{l:"Folder",a:"new-folder",icon:"my-computer"},{l:"Text Document",a:"new-text",icon:"document"},{l:"LINKS Note",a:"new-links",icon:"links"},{l:"Shortcut",a:"new-shortcut",icon:"links"}]},{sep:true},{l:"Paste",a:"paste",icon:"document",disabled:true},{l:"Paste Shortcut",a:"paste-shortcut",icon:"links",disabled:true},{sep:true},{l:"LINKS Terminal",a:"open:terminal",icon:"terminal"},{l:"Market Control",a:"open:market",icon:"market"},{l:"Contract Address",a:"copy-ca",icon:"links"},...(secret?[{sep:true},{l:"???",icon:"links",sub:[{l:"Wake LINKS",a:"wake-links",icon:"links"}]}]:[]),{sep:true},{l:"Desktop Properties",a:"desktop-properties",icon:"my-computer"}],e.clientX,e.clientY);
  },true);
  wm.cascade=function(){let i=0;for(const r of this.windows.values()){r.minimized=false;r.maximized=false;r.element.classList.remove("is-minimized","is-maximized");Object.assign(r.element.style,{left:`${18+i*28}px`,top:`${18+i++*26}px`,width:"620px",height:"430px"})}};
  wm.tile=function(vertical){const list=[...this.windows.values()].filter(r=>!r.minimized),n=list.length,b=this.layer.getBoundingClientRect();list.forEach((r,i)=>{r.maximized=false;r.element.classList.remove("is-maximized");Object.assign(r.element.style,vertical?{left:`${i*b.width/n}px`,top:"0",width:`${b.width/n}px`,height:`${b.height}px`}:{left:"0",top:`${i*b.height/n}px`,width:`${b.width}px`,height:`${b.height/n}px`})})};
  wm.minimizeAll=function(){[...this.windows.keys()].forEach(k=>this.minimize(k))};
  function createDesktopItem(kind){const id=`temp-${Date.now()}`,defaults={folder:"New Folder",text:"New Text Document.txt",links:"New LINKS Note.lnk",shortcut:"New Shortcut.lnk"},names={folder:"my-computer",text:"document",links:"links",shortcut:"links"};const el=document.createElement("button");el.className="desktop-icon is-selected";el.dataset.desktopApp=id;el.dataset.tempKind=kind;el.dataset.free="true";el.style.left="110px";el.style.top="110px";el.innerHTML=`<img src="${icon(names[kind])}" alt=""><span><input class="desktop-rename" value="${defaults[kind]}"></span>`;icons.append(el);clearSelection();select(el);const input=$("input",el);input.focus();input.select();const finish=()=>{const name=input.value.trim()||defaults[kind];input.parentElement.textContent=name;el.dataset.tempName=name;savePositions()};input.onkeydown=e=>{if(e.key==="Enter")finish();if(e.key==="Escape"){input.value=defaults[kind];finish()}};input.onblur=finish}
  function wakeLinks(){let visitor=$("#context-cat-visitor");if(visitor)visitor.remove();visitor=document.createElement("img");visitor.id="context-cat-visitor";visitor.className="context-cat-visitor";visitor.src=cat("stand");visitor.alt="Links Cat";visitor.style.left=`${Math.max(20,Math.random()*(innerWidth-120))}px`;desktop.append(visitor);setTimeout(()=>visitor.src=cat("walk"),1400);setTimeout(()=>visitor.remove(),4300)}
  $("#context-menu").addEventListener("click",async e=>{
    const button=e.target.closest("[data-os]");
    if(!button||button.disabled)return;
    const a=button.dataset.os;
    if(!a)return;
    e.stopImmediatePropagation();
    closeMenus();
    if(a.startsWith("open:"))wm.open(a.split(":")[1]);
    if(a.startsWith("explore:")){
      const target=a.split(":")[1];
      wm.open(target==="recycle"?"recycle":target==="computer"?"computer":target);
    }
    if(a==="ql:toggle-visible"){
      const ql=$("#quick-launch");
      if(ql){
        ql.hidden=!ql.hidden;
        localStorage.setItem("links98:quicklaunch_visible",String(!ql.hidden));
      }
    }
    if(a==="ql:close"){
      const ql=$("#quick-launch");
      if(ql){
        ql.hidden=true;
        localStorage.setItem("links98:quicklaunch_visible","false");
      }
    }
    if(a==="ql:toggle-text"){
      const ql=$("#quick-launch");
      if(ql){
        ql.classList.toggle("show-text");
        localStorage.setItem("links98:quicklaunch_show_text",String(ql.classList.contains("show-text")));
      }
    }
    if(a==="ql:toggle-title"){
      const t=$("#quick-launch-title");
      if(t){
        t.hidden=!t.hidden;
        localStorage.setItem("links98:quicklaunch_show_title",String(!t.hidden));
      }
    }
    if(a.startsWith("props:")){
      const k=a.split(":")[1],d=O.desktopItems.find(x=>x[0]===k);
      const propsMap = {
        linksmarket: { title: "LINKS Market Properties", message: "Type: LINKS 98 Application Group\nContains: 4 programs\nLocation: C:\\LINKS\\MARKET", icon: "linksmarket" },
        linksonline: { title: "LINKS Online Properties", message: "Type: LINKS 98 Application Group\nContains: Online services\nLocation: C:\\LINKS\\ONLINE", icon: "linksonline" },
        notepad: { title: "Notepad Properties", message: "Type: Application\nLocation: C:\\WINDOWS\\NOTEPAD.EXE", icon: "notepad" },
        editor: { title: "LINKS Code Editor Properties", message: "Type: LINKS Development Tool\nLocation: C:\\LINKS\\DEV\\CODE.EXE", icon: "editor" },
        links: { title: "LINKS.exe Properties", message: "Name: LINKS\nTicker: $LINKS\nType: Internet Cat\nNetwork: Robinhood Chain\nLocation: C:\\INTERNET\\CATS\\LINKS", icon: "links" }
      };
      const prop = propsMap[k];
      if (prop) {
        showDialog({ title: prop.title, message: prop.message, image: O.appIcon ? O.appIcon(prop.icon, prop.icon) : icon(prop.icon) });
      } else {
        showDialog({ title:`${d?.[1]||k} Properties`, message: "Type: Application or Shortcut\nLocation: C:\\LINKS\\\nSize: 98 KB\nCreated: 1998\nStatus: Still Running", image: icon(d?.[2]||"document") });
      }
    }
    if(a==="shortcut")announce("Shortcut created on Desktop.");
    if(a.startsWith("rename:")){
      const el=$(`[data-desktop-app="${a.split(":")[1]}"]`,icons);
      if(el){
        const span=$("span",el),input=document.createElement("input");
        input.className="desktop-rename";
        input.value=span.textContent;
        span.textContent="";
        span.append(input);
        input.focus();
        input.select();
        input.onblur=()=>span.textContent=input.value.trim()||"Shortcut";
        input.onkeydown=v=>{if(v.key==="Enter")input.blur()};
      }
    }
    if(["name","type","size"].includes(a))arrange(a);
    if(a==="auto"){auto=!auto;set("autoArrange",auto);if(auto)arrange()}
    if(a==="refresh"){
      const old=desktop.style.cursor;
      desktop.style.cursor="wait";
      icons.classList.add("refreshing");
      setTimeout(()=>{
        icons.classList.remove("refreshing");
        desktop.style.cursor=old;
        restorePositions();
        announce("Desktop refreshed.");
      },300);
    }
    if(a.startsWith("new-"))createDesktopItem(a.slice(4));
    if(a==="copy-ca"){
      const ca=O.getContractAddress?.()||O.CONFIG.CONTRACT_ADDRESS||"";
      if(!ca||ca==="COMING_SOON"){
        showDialog({title:"LINKS 98",message:"Contract address has not\nbeen configured yet.",image:cat("reactions/concerned")});
      }else{
        await O.copyContract();
        showDialog({title:"LINKS 98",message:"Contract address copied.",image:icon("links")});
      }
    }
    if(a==="desktop-properties")wm.open("desktopprops");
    if(a==="system-properties")wm.open("systemprops");
    if(a==="find")wm.open("search");
    if(a==="empty-recycle")showDialog({title:"Recycle Bin",message:"SELL.EXE cannot be permanently deleted.\nLINKS CAT has restored system morale.",image:cat("reactions/unimpressed")});
    if(a.startsWith("send-"))announce(`Sent to ${a.slice(5).replace("-"," ")}.`);
    if(a==="wake-links")wakeLinks();
    if(a==="pet")togglePet();
    if(a==="catstatus")showDialog({title:"Links Cat Status",message:"Status: ONLINE\nMood: Bullish",image:cat("sit")});
    if(a==="catsleep"&&$("#desktop-pet"))$("#desktop-pet img").src=cat("sleep-curled");
    if(a==="catabout")wm.open("about");
    if(a==="cascade")wm.cascade();
    if(a==="tileh")wm.tile(false);
    if(a==="tilev")wm.tile(true);
    if(a==="minall")wm.minimizeAll();
  },true);
  window.LINKS_OS_SHOW_MENU = menu;
  let altAt=-1;
  function switcher(){const list=[...wm.windows.values()];if(!list.length)return;altAt=(altAt+1)%list.length;let p=$(".alt-switcher");if(!p){p=document.createElement("div");p.className="alt-switcher";document.body.append(p)}p.dataset.key=list[altAt].key;p.innerHTML=`<strong>${escapeHTML(APPS[list[altAt].key].title)}</strong><div>${list.map((r,i)=>`<span class="${i===altAt?"current":""}"><img src="${APPS[r.key].icon}" alt="">${escapeHTML(APPS[r.key].title)}</span>`).join("")}</div>`}
  window.addEventListener("keydown",e=>{if(e.altKey&&e.key==="Tab"){e.preventDefault();switcher()}if(e.altKey&&e.key==="F4"){e.preventDefault();const r=[...wm.windows.values()].find(x=>x.element.classList.contains("is-active"));if(r)wm.close(r.key)}if(e.ctrlKey&&e.key==="Escape"){e.preventDefault();O.toggleStartMenu()}if(e.key==="F1"){e.preventDefault();wm.open("help98")}if(e.key==="F5"){e.preventDefault();icons.classList.add("refreshing");setTimeout(()=>icons.classList.remove("refreshing"),120)}if(e.ctrlKey&&e.shiftKey&&e.key==="Escape"){e.preventDefault();wm.open("taskmgr")}},true);
  window.addEventListener("keyup",e=>{if(e.key==="Alt"){const p=$(".alt-switcher"),k=p?.dataset.key;p?.remove();if(k)wm.focus(k);altAt=-1}});
  const start=$("#start-menu");
  let pet;
  function togglePet(){pet=$("#desktop-pet");const enabled=!pet;if(enabled){pet=document.createElement("button");pet.id="desktop-pet";pet.className="desktop-pet";pet.innerHTML=`<img src="${cat("sit")}" alt="Links Cat desktop pet">`;desktop.append(pet);const p=get("petPosition",{left:innerWidth-170,top:innerHeight-170});Object.assign(pet.style,{left:`${p.left}px`,top:`${p.top}px`});let sx,sy,sl,st,moved;pet.onpointerdown=e=>{sx=e.clientX;sy=e.clientY;sl=pet.offsetLeft;st=pet.offsetTop;moved=false;pet.setPointerCapture(e.pointerId)};pet.onpointermove=e=>{if(!pet.hasPointerCapture(e.pointerId))return;moved=true;pet.style.left=`${Math.max(0,Math.min(innerWidth-80,sl+e.clientX-sx))}px`;pet.style.top=`${Math.max(0,Math.min(innerHeight-110,st+e.clientY-sy))}px`};pet.onpointerup=()=>{set("petPosition",{left:pet.offsetLeft,top:pet.offsetTop});if(!moved){$("img",pet).src=cat("celebrate");setTimeout(()=>{if(pet?.isConnected)$("img",pet).src=cat("sit")},900)}};setTimeout(()=>{if(pet?.isConnected)$("img",pet).src=cat("sleep-curled")},120000)}else pet.remove();set("pet",enabled);$("[data-pet-label]")&&($("[data-pet-label]").textContent=`${enabled?"Disable":"Enable"} LINKS Pet`)}
  const startDocuments={
    "note-cat":"things to do:\n- sleep\n- inspect internet\n- delete sell button\n- become operating system",
    "note-alpha":"Definitely not alpha.\n\nThe cat knows where the files went. The cat is not telling.",
    "note-whitepaper":"LINKS WHITEPAPER\nVersion 0.98\n\n1. Cat.\n2. Internet.\n3. Meme.\n4. That's basically it."
  };
  const tray=$(".tray");tray.insertAdjacentHTML("afterbegin",`<button class="tray-button" data-tray="network" title="Network">🖥</button><button class="tray-button" data-tray="cat" title="Links Cat">🐱</button>`);tray.addEventListener("click",e=>{const t=e.target.closest("[data-tray]")?.dataset.tray;if(t==="network")wm.open("network");if(t==="cat")menu([{l:"Pet Links",a:"pet"},{l:"Status",a:"catstatus"},{l:"Sleep",a:"catsleep"},{l:"About",a:"catabout"}],e.clientX,e.clientY-150);if(e.target.closest("#tray-overflow-btn")){menu([{l:O.state.sound?"Mute Sounds":"Enable Sounds",a:"toggle-sound"},{sep:true},{l:"Network: Connected",a:"open:network",icon:"internet"},{l:"Robinhood Chain (4663)",a:"open:wallet",icon:"links"},{l:"Links Cat",icon:"links",sub:[{l:"Pet Links",a:"pet"},{l:"Status",a:"catstatus"},{l:"Sleep",a:"catsleep"},{l:"About",a:"catabout"}]},{sep:true},{l:"Date / Time",a:"open:datetime",icon:"document"}],Math.min(e.clientX,innerWidth-190),innerHeight-200);}});$("#clock").ondblclick=()=>wm.open("datetime");
  $("#context-menu").addEventListener("click",e=>{const a=e.target.closest("[data-os]")?.dataset.os;if(a==="toggle-sound")$("#sound-toggle")?.click();if(a==="pet")togglePet();if(a==="catstatus")showDialog({title:"Links Cat Status",message:"Status: ONLINE\nMood: Bullish",image:cat("sit")});if(a==="catsleep"&&$("#desktop-pet"))$("#desktop-pet img").src=cat("sleep-curled");if(a==="catabout")wm.open("about")});
  O.state.sound=get("sound",true);desktop.dataset.wallpaper=get("wallpaper","links-stretch");desktop.style.cursor=get("cursor","default");if(get("pet",true))togglePet();
  const welcome=setInterval(()=>{if($("#boot-screen").hidden){clearInterval(welcome);if(!get("welcomed",false)){showDialog({title:"Welcome to LINKS 98",message:"Tip of the Day:\nDouble-click things.\nThe cat likes that.",image:cat("sit")});set("welcomed",true)}}},300);
  window.LINKS_OS={openExplorer(p="My Computer"){path=VFS[p]?p:"My Computer";wm.open("computer")},startConfiguredScreensaver:O.startScreensaver,restorePositions,arrange,VFS};
})();
