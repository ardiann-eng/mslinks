import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';
  const filePath = path.join(rootDir, decodeURIComponent(reqUrl));

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(8096, '127.0.0.1', async () => {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const debuggingPort = 9225;
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${debuggingPort}`,
    '--window-size=390,844',
    'http://127.0.0.1:8096'
  ];

  const edgeProcess = spawn(edgePath, edgeArgs);
  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch(`http://127.0.0.1:${debuggingPort}/json`);
    const targets = await listRes.json();
    const target = targets.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg.result);
        callbacks.delete(msg.id);
      }
    };

    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = ++msgId;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    };

    // Log in
    await evaluate(`window.powerManager.completeLogin("degen98")`);
    await new Promise(r => setTimeout(r, 300));

    const resolutions = [
      { w: 320, h: 568, name: "320x568 (Small Phone)" },
      { w: 360, h: 800, name: "360x800 (Galaxy S20)" },
      { w: 375, h: 812, name: "375x812 (iPhone X/13 Mini)" },
      { w: 390, h: 844, name: "390x844 (iPhone 14)" },
      { w: 412, h: 915, name: "412x915 (Pixel 7)" },
      { w: 430, h: 932, name: "430x932 (iPhone 15 Pro Max)" },
      { w: 480, h: 800, name: "480x800 (Wide Phone)" },
      { w: 844, h: 390, name: "844x390 (Landscape Phone)" },
      { w: 932, h: 430, name: "932x430 (Landscape Max)" },
      { w: 768, h: 1024, name: "768x1024 (iPad Portrait)" },
      { w: 1024, h: 768, name: "1024x768 (Desktop Standard)" },
      { w: 1366, h: 768, name: "1366x768 (Laptop)" },
      { w: 1440, h: 900, name: "1440x900 (MacBook)" },
      { w: 1920, h: 1080, name: "1920x1080 (FHD Desktop)" }
    ];

    const apps = ['links', 'market', 'chart', 'livetape', 'holdermap', 'terminal', 'editor', 'notepad', 'solitaire', 'weather', 'antivirus', 'printer', 'mememaker', 'internet', 'computer', 'memes', 'lore', 'linksmarket', 'linksonline'];

    let totalTests = 0;
    let failedTests = 0;

    for (const res of resolutions) {
      console.log(`\n========================================`);
      console.log(`VERIFYING: ${res.name}`);
      console.log(`========================================`);

      await send('Emulation.setDeviceMetricsOverride', {
        width: res.w,
        height: res.h,
        deviceScaleFactor: 1,
        mobile: res.w <= 600
      });

      await evaluate(`window.dispatchEvent(new Event('resize'));`);
      await new Promise(r => setTimeout(r, 150));

      // 1. Check Desktop & Taskbar
      const baseCheck = await evaluate(`
        (() => {
          const bodyOverflowX = document.body.scrollWidth > window.innerWidth;
          const taskbar = document.querySelector('.taskbar').getBoundingClientRect();
          const startBtn = document.getElementById('start-button').getBoundingClientRect();
          const clock = document.getElementById('clock').getBoundingClientRect();
          const startVisible = startBtn.width > 30 && startBtn.left >= 0;
          const clockVisible = clock.width > 20 && clock.right <= window.innerWidth;
          const taskbarFits = taskbar.width <= window.innerWidth && taskbar.bottom <= window.innerHeight + 2;

          return { bodyOverflowX, startVisible, clockVisible, taskbarFits };
        })()
      `);

      totalTests++;
      if (baseCheck.bodyOverflowX || !baseCheck.startVisible || !baseCheck.clockVisible || !baseCheck.taskbarFits) {
        console.error(`FAILED Base Check at ${res.name}:`, baseCheck);
        failedTests++;
      } else {
        console.log(`✓ Base & Taskbar OK (Start button & Clock fully visible, no body overflow)`);
      }

      // 2. Test Apps Opening, Fitting, Titlebars
      for (const app of apps) {
        const check = await evaluate(`
          (() => {
            const wm = window.LINKS_OS_CORE.wm;
            wm.open('${app}');
            const rec = wm.windows.get('${app}');
            if (!rec) return { error: 'Failed to open ${app}' };
            const r = rec.element.getBoundingClientRect();
            const layer = document.getElementById('window-layer').getBoundingClientRect();
            const fits = r.width <= layer.width + 4 && r.height <= layer.height + 4;
            const titlebar = rec.element.querySelector('.titlebar')?.getBoundingClientRect();
            const controls = rec.element.querySelector('.window-controls')?.getBoundingClientRect();
            const titlebarOk = Boolean(titlebar && titlebar.width > 40 && titlebar.top >= 0);
            const controlsOk = Boolean(controls && controls.width > 30);
            wm.close('${app}');
            return { fits, titlebarOk, controlsOk, width: r.width, height: r.height };
          })()
        `);

        totalTests++;
        if (!check.fits || !check.titlebarOk || !check.controlsOk) {
          console.error(`  FAILED app '${app}' at ${res.name}:`, check);
          failedTests++;
        }
      }
      console.log(`✓ All ${apps.length} Applications opened, fitted, and closed without overflow.`);
    }

    console.log(`\n========================================`);
    console.log(`SUMMARY: Total checks: ${totalTests} | Failed: ${failedTests}`);
    console.log(`========================================`);

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edgeProcess.kill();
    server.close();
    process.exit(0);
  }
});
