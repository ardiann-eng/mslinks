import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = ['index.html', 'styles.css', 'app.js', 'assets.js'];
const references = new Set();

for (const file of files) {
  const source = await readFile(resolve(root, file), 'utf8');
  for (const match of source.matchAll(/assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|gif|webp|bmp|mp4)/gi)) {
    references.add(match[0]);
  }
  for (const match of source.matchAll(/\b(icon|cat|appArt)\("([^"]+)"\)/g)) {
    const [, helper, name] = match;
    const folder = helper === 'icon' ? 'icons' : helper === 'cat' ? 'cats' : 'apps';
    const filename = /\.[a-z0-9]+$/i.test(name) ? name : `${name}.png`;
    references.add(`assets/${folder}/${filename}`);
  }
}

const missing = [];
for (const reference of [...references].sort()) {
  try {
    const entry = await stat(resolve(root, reference));
    if (!entry.isFile()) missing.push(reference);
  } catch {
    missing.push(reference);
  }
}

console.log(JSON.stringify({ references: references.size, missing }, null, 2));
if (missing.length) process.exitCode = 1;
