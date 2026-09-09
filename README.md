# LINKS 98

A dependency-free interactive memecoin desktop website built with HTML, CSS, and JavaScript. The operating system is the site: video login, desktop, taskbar, Start menu, reusable draggable windows, apps, dialogs, screensaver, and easter eggs all run in-browser.

## Run

Serve the folder with any static server, for example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Configure official links

Edit only `config.js`:

```js
TOKEN_NAME: "$LINKS"
CONTRACT_ADDRESS: "COMING_SOON"
BUY_URL: ""
X_URL: ""
```

Blank external URLs intentionally show a “coming soon” dialog. No contract address or community link is fabricated.

## Asset workflow

The original images remain untouched in `asset/`. Processed, web-ready files live in `assets/`. To rebuild them:

```powershell
python .\scripts\process-assets.py
```

The script uses Pillow, removes only border-connected magenta chroma, preserves hard edges, adds safe margins, splits the supplied icon/reaction/pose sheets, and writes `assets/manifest.json`.

## Discoveries

Most features are visible from the desktop or Start menu. A few interactions are intentionally undocumented. The terminal, desktop cat, and taskbar clock are worth investigating.
