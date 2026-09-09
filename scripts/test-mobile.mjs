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

server.listen(8099, '127.0.0.1', async () => {
  console.log('Server running at http://127.0.0.1:8099');

  const viewports = [
    { name: 'iphone-se', width: 320, height: 568 },
    { name: 'android-small', width: 360, height: 800 },
    { name: 'iphone-x', width: 375, height: 812 },
    { name: 'iphone-14', width: 390, height: 844 },
    { name: 'pixel-7', width: 412, height: 915 },
    { name: 'iphone-pro-max', width: 430, height: 932 },
    { name: 'wide-mobile', width: 480, height: 800 },
    { name: 'landscape-mobile', width: 844, height: 390 },
    { name: 'desktop-1024', width: 1024, height: 768 },
    { name: 'desktop-fhd', width: 1920, height: 1080 }
  ];

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const outputDir = path.join(rootDir, '.inspection', 'screenshots');
  fs.mkdirSync(outputDir, { recursive: true });

  for (const vp of viewports) {
    const screenshotPath = path.join(outputDir, `${vp.name}.png`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${vp.width},${vp.height}`,
      `--screenshot=${screenshotPath}`,
      '--hide-scrollbars',
      'http://127.0.0.1:8099/?boot-warning=none'
    ];

    await new Promise((resolve) => {
      const child = spawn(edgePath, args);
      child.on('close', () => {
        console.log(`Captured screenshot for ${vp.name} (${vp.width}x${vp.height})`);
        resolve();
      });
    });
  }

  server.close(() => {
    console.log('Test completed successfully.');
    process.exit(0);
  });
});
