const cdpPort = process.env.LINKS_CDP_PORT || '9222';
const siteUrl = process.env.LINKS_SITE_URL || 'http://127.0.0.1:4173/';
const viewportWidth = Number(process.env.LINKS_VIEWPORT_WIDTH || 1280);
const viewportHeight = Number(process.env.LINKS_VIEWPORT_HEIGHT || 800);
const screenshotPath = process.env.LINKS_SCREENSHOT_PATH;
const browserIssues = [];

const target = await fetch(
  `http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(siteUrl)}`,
  { method: 'PUT' },
).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    browserIssues.push(`exception: ${message.params.exceptionDetails.text}`);
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    browserIssues.push(`console: ${message.params.entry.text} ${message.params.entry.url || ''}`.trim());
  }
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
    browserIssues.push(`${message.params.response.status}: ${message.params.response.url}`);
  }
  if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
    browserIssues.push(`network: ${message.params.errorText} ${message.params.requestId}`);
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: viewportWidth <= 700,
});
await send('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 1200));

if (screenshotPath) {
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelector('.skip-boot')?.click();
      const shortcut = document.querySelector('[data-desktop-app="links"]');
      shortcut?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      document.querySelector('[data-market-action="hold"]')?.click();
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(screenshotPath, Buffer.from(data, 'base64'));
  await send('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 800));
}

const { result } = await send('Runtime.evaluate', {
  expression: `(async () => {
    const failures = [];
    const scan = (trigger) => {
      for (const image of document.images) {
        if (image.currentSrc && image.complete && image.naturalWidth > 0) continue;
        failures.push({
          trigger,
          alt: image.alt,
          src: image.getAttribute('src'),
          currentSrc: image.currentSrc,
          className: image.className,
        });
      }
    };

    scan('initial page');

    const fallbackProbe = document.createElement('img');
    fallbackProbe.src = 'assets/__missing_image_audit_probe__.png';
    fallbackProbe.alt = 'Fallback probe';
    document.body.append(fallbackProbe);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const fallbackWorked = fallbackProbe.complete && fallbackProbe.naturalWidth > 0 &&
      fallbackProbe.currentSrc.endsWith('/assets/cats/sit.png');
    fallbackProbe.remove();
    const visited = new WeakSet();
    let triggerCount = 0;
    for (let round = 0; round < 8; round += 1) {
      const triggers = [...document.querySelectorAll('button, [role="button"], [onclick], [ondblclick]')]
        .filter((element) => !visited.has(element) && element.tagName !== 'A');
      if (!triggers.length) break;
      for (const trigger of triggers) {
        visited.add(trigger);
        const label = trigger.getAttribute('aria-label') || trigger.textContent.trim() || trigger.className || trigger.tagName;
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        trigger.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 35));
        triggerCount += 1;
        scan(triggerCount + ': ' + label.slice(0, 80));
      }
    }

    for (let index = 0; index < 10; index += 1) document.querySelector('#cat-hotspot')?.click();
    for (let index = 0; index < 5; index += 1) document.querySelector('#clock')?.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    scan('easter egg triggers');

    return JSON.stringify({
      total: document.images.length,
      triggers: triggerCount,
      fallbackWorked,
      broken: failures.filter((failure, index, all) =>
        all.findIndex((candidate) => candidate.src === failure.src && candidate.trigger === failure.trigger) === index),
    });
  })()`,
  awaitPromise: true,
  returnByValue: true,
});

const report = JSON.parse(result.value);
report.viewport = `${viewportWidth}x${viewportHeight}`;
report.browserIssues = [...new Set(browserIssues)].filter((issue) => !issue.includes('__missing_image_audit_probe__'));
console.log(JSON.stringify(report, null, 2));
await fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`);
socket.close();

if (!report.fallbackWorked || report.broken.length || report.browserIssues.length) process.exitCode = 1;
