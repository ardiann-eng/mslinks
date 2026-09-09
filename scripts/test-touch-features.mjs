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

server.listen(8097, '127.0.0.1', async () => {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const debuggingPort = 9224;
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${debuggingPort}`,
    '--window-size=375,812',
    'http://127.0.0.1:8097'
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

    // Fast-forward boot to login and desktop
    await evaluate(`window.powerManager.completeLogin("degen98")`);
    await new Promise(r => setTimeout(r, 300));

    // Test 1: Long Press Context Menu
    const longPressRes = await evaluate(`
      (async () => {
        const desktop = document.getElementById('desktop');
        const touchStart = new Touch({
          identifier: 1,
          target: desktop,
          clientX: 100,
          clientY: 100
        });
        const touchEvent = new TouchEvent('touchstart', {
          touches: [touchStart],
          targetTouches: [touchStart],
          changedTouches: [touchStart],
          bubbles: true,
          cancelable: true
        });
        desktop.dispatchEvent(touchEvent);

        // Wait 550ms for long press trigger
        await new Promise(r => setTimeout(r, 550));

        const menu = document.getElementById('context-menu');
        const isVisible = !menu.hidden;
        const rect = menu.getBoundingClientRect();
        return { isVisible, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
      })()
    `);
    console.log('Test 1 (Long Press Context Menu):', longPressRes);

    // Test 2: Double tap titlebar to maximize & restore
    const doubleTapRes = await evaluate(`
      (async () => {
        const wm = window.LINKS_OS_CORE.wm;
        wm.open('notepad');
        const rec = wm.windows.get('notepad');
        const bar = rec.element.querySelector('.titlebar');

        const tapEvent = (clientX, clientY) => new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          button: 0,
          pointerId: 1
        });

        // First tap
        bar.dispatchEvent(tapEvent(50, 10));
        await new Promise(r => setTimeout(r, 100));
        // Second tap
        bar.dispatchEvent(tapEvent(50, 10));
        await new Promise(r => setTimeout(r, 100));

        const isMaximizedAfterDoubleTap = rec.maximized && rec.element.classList.contains('is-maximized');

        // Double tap again to restore
        bar.dispatchEvent(tapEvent(50, 10));
        await new Promise(r => setTimeout(r, 100));
        bar.dispatchEvent(tapEvent(50, 10));
        await new Promise(r => setTimeout(r, 100));

        const isRestored = !rec.maximized && !rec.element.classList.contains('is-maximized');

        wm.close('notepad');
        return { isMaximizedAfterDoubleTap, isRestored };
      })()
    `);
    console.log('Test 2 (Double Tap Maximize/Restore):', doubleTapRes);

    // Test 3: Secret mobile boot press-and-hold check
    const bootSecretRes = await evaluate(`
      (async () => {
        // Test boot holding
        const bootScreen = document.getElementById('boot-screen');
        const touch = new Touch({ identifier: 2, target: bootScreen, clientX: 100, clientY: 100 });
        bootScreen.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        }));
        await new Promise(r => setTimeout(r, 300));
        bootScreen.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        }));
        return { hasBootHold: true };
      })()
    `);
    console.log('Test 3 (Mobile Boot Hold Handlers):', bootSecretRes);

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edgeProcess.kill();
    server.close();
    process.exit(0);
  }
});
