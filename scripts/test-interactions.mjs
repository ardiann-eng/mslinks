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

server.listen(8098, '127.0.0.1', async () => {
  console.log('Server running at http://127.0.0.1:8098');

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const debuggingPort = 9223;
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${debuggingPort}`,
    '--window-size=375,812',
    'http://127.0.0.1:8098'
  ];

  const edgeProcess = spawn(edgePath, edgeArgs);

  // Wait for Edge CDP to be ready
  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch(`http://127.0.0.1:${debuggingPort}/json`);
    const targets = await listRes.json();
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

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

    console.log('CDP connected.');

    // Helper evaluation
    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    };

    // Fast-forward boot to login and desktop
    console.log('Logging in...');
    await evaluate(`
      (async () => {
        if (window.powerManager) {
          window.powerManager.completeLogin("degen98");
        }
      })()
    `);

    await new Promise(r => setTimeout(r, 500));

    // Test window manager across viewports
    const testViewports = [
      { w: 320, h: 568, name: "320px Phone" },
      { w: 375, h: 812, name: "375px Phone" },
      { w: 412, h: 915, name: "412px Phone" },
      { w: 844, h: 390, name: "844x390 Landscape" },
      { w: 1280, h: 800, name: "1280px Desktop" }
    ];

    for (const vp of testViewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.w}x${vp.h})`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.w <= 600
      });

      await evaluate(`window.dispatchEvent(new Event('resize'));`);
      await new Promise(r => setTimeout(r, 200));

      const desktopCheck = await evaluate(`
        (() => {
          const bodyOverflow = document.body.scrollWidth > window.innerWidth;
          const desktopOverflow = document.getElementById('desktop').scrollWidth > window.innerWidth;
          const icons = [...document.querySelectorAll('.desktop-icon')];
          const iconBounds = icons.map(i => {
            const r = i.getBoundingClientRect();
            return {
              app: i.dataset.desktopApp,
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              outOfScreen: r.right > window.innerWidth + 2 || r.left < -2
            };
          });
          const anyIconOut = iconBounds.some(i => i.outOfScreen);
          return { bodyOverflow, desktopOverflow, anyIconOut, iconCount: icons.length };
        })()
      `);

      console.log('Desktop Check:', desktopCheck);

      // Open several core applications and check window bounds
      const appsToTest = ['links', 'chart', 'livetape', 'holdermap', 'terminal', 'editor', 'solitaire', 'internet', 'linksmarket'];
      for (const app of appsToTest) {
        const winCheck = await evaluate(`
          (() => {
            const wm = window.LINKS_OS_CORE.wm;
            wm.open('${app}');
            const rec = wm.windows.get('${app}');
            if (!rec) return { error: 'Failed to open' };
            const r = rec.element.getBoundingClientRect();
            const taskbar = document.querySelector('.taskbar').getBoundingClientRect();
            const bounds = document.getElementById('window-layer').getBoundingClientRect();
            const fitsWidth = r.width <= bounds.width && r.right <= bounds.width + 4;
            const fitsHeight = r.height <= bounds.height && r.bottom <= bounds.height + 4;
            const titlebar = rec.element.querySelector('.titlebar').getBoundingClientRect();
            const controls = rec.element.querySelector('.window-controls').getBoundingClientRect();
            wm.close('${app}');
            return {
              app: '${app}',
              fitsWidth,
              fitsHeight,
              width: r.width,
              height: r.height,
              boundsWidth: bounds.width,
              boundsHeight: bounds.height,
              titlebarVisible: titlebar.width > 50,
              controlsVisible: controls.width > 40
            };
          })()
        `);
        console.log(`  App '${app}':`, winCheck);
      }

      // Test Start Menu
      const startCheck = await evaluate(`
        (() => {
          const startBtn = document.getElementById('start-button');
          startBtn.click();
          const menu = document.getElementById('start-menu');
          const r = menu.getBoundingClientRect();
          const fitsScreen = r.right <= window.innerWidth && r.left >= 0 && r.top >= 0;
          startBtn.click(); // close
          return { startMenuFits: fitsScreen, menuWidth: r.width, menuHeight: r.height };
        })()
      `);
      console.log('Start Menu Check:', startCheck);
    }

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edgeProcess.kill();
    server.close();
    process.exit(0);
  }
});
