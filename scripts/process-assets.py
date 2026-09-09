"""Prepare the supplied LINKS 98 artwork without resampling pixel edges.

The source JPGs are kept untouched. Magenta removal is a border-connected
chroma operation so intentional enclosed pink details are preserved.
"""

from collections import deque
from pathlib import Path
import json
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "asset"
OUTPUT = ROOT / "assets"
SAFE_MARGIN = 8


def is_magenta(pixel):
    r, g, b = pixel[:3]
    return r > 150 and b > 135 and g < 155 and (r + b - (2 * g)) > 175


def remove_border_magenta(image):
    rgba = image.convert("RGBA")
    px = rgba.load()
    width, height = rgba.size
    queue = deque()
    seen = bytearray(width * height)

    def enqueue(x, y):
        pos = y * width + x
        if not seen[pos] and is_magenta(px[x, y]):
            seen[pos] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        px[x, y] = (0, 0, 0, 0)
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)
    return rgba


def trim(image, margin=SAFE_MARGIN):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    left = max(0, bbox[0] - margin)
    top = max(0, bbox[1] - margin)
    right = min(image.width, bbox[2] + margin)
    bottom = min(image.height, bbox[3] + margin)
    return image.crop((left, top, right, bottom))


def save_cutout(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    image = trim(remove_border_magenta(Image.open(source)))
    image.save(destination, "PNG", optimize=True)
    return image.size


def split_sheet(source, output_dir, names, columns, rows):
    image = Image.open(source)
    cell_w = image.width // columns
    cell_h = image.height // rows
    results = {}
    for index, name in enumerate(names):
        col, row = index % columns, index // columns
        cell = image.crop((col * cell_w, row * cell_h,
                           (col + 1) * cell_w, (row + 1) * cell_h))
        prepared = trim(remove_border_magenta(cell))
        destination = output_dir / f"{name}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(destination, "PNG", optimize=True)
        results[str(destination.relative_to(ROOT)).replace("\\", "/")] = prepared.size
    return results


def crop_regions(source, output_dir, regions):
    """Crop named transparent regions without resampling or redrawing them."""
    image = Image.open(source).convert("RGBA")
    results = {}
    for name, box in regions.items():
        prepared = trim(image.crop(box))
        destination = output_dir / f"{name}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(destination, "PNG", optimize=True)
        results[str(destination.relative_to(ROOT)).replace("\\", "/")] = prepared.size
    return results


def extract_component_groups(source, output_dir, regions, alpha_threshold=8):
    """Extract overlapping sheet art by assigning alpha components by centroid."""
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A").tobytes()
    seen = bytearray(width * height)
    canvases = {name: Image.new("RGBA", image.size) for name in regions}
    source_pixels = image.load()
    canvas_pixels = {name: canvas.load() for name, canvas in canvases.items()}

    for start, value in enumerate(alpha):
        if value < alpha_threshold or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        sum_x = sum_y = 0
        while queue:
            position = queue.popleft()
            y, x = divmod(position, width)
            component.append((x, y))
            sum_x += x
            sum_y += y
            for next_position in (position - 1, position + 1, position - width, position + width):
                if not 0 <= next_position < width * height or seen[next_position] or alpha[next_position] < alpha_threshold:
                    continue
                next_y, next_x = divmod(next_position, width)
                if abs(next_x - x) + abs(next_y - y) != 1:
                    continue
                seen[next_position] = 1
                queue.append(next_position)
        center_x = sum_x / len(component)
        center_y = sum_y / len(component)
        for name, (left, top, right, bottom) in regions.items():
            if left <= center_x < right and top <= center_y < bottom:
                target = canvas_pixels[name]
                for x, y in component:
                    target[x, y] = source_pixels[x, y]
                break

    results = {}
    for name, canvas in canvases.items():
        prepared = trim(canvas)
        destination = output_dir / f"{name}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(destination, "PNG", optimize=True)
        results[str(destination.relative_to(ROOT)).replace("\\", "/")] = prepared.size
    return results


def main():
    files = sorted(p for p in SOURCE.iterdir() if p.suffix.lower() in {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"
    })
    if len(files) != 22:
        raise RuntimeError(f"Expected 22 supplied images, found {len(files)}")

    for folder in ("cats", "icons", "wallpaper", "apps", "lore", "screens",
                   "easter-eggs", "memes"):
        (OUTPUT / folder).mkdir(parents=True, exist_ok=True)

    manifest = {"source_count": len(files), "processed": {}}

    copies = {
        1: ("screens", "blue-screen.jpg"),
        11: ("lore", "internet-journey.jpg"),
        13: ("lore", "lost-computers.jpg"),
        14: ("screens", "shutdown.jpg"),
        16: ("screens", "boot.jpg"),
        17: ("easter-eggs", "behind-desktop.jpg"),
        18: ("wallpaper", "links-hill.jpg"),
        20: ("easter-eggs", "market-control-room.jpg"),
    }
    for index, (folder, name) in copies.items():
        destination = OUTPUT / folder / name
        shutil.copy2(files[index], destination)
        with Image.open(destination) as image:
            manifest["processed"][str(destination.relative_to(ROOT)).replace("\\", "/")] = image.size

    cutouts = {
        2: ("apps", "calculator-cat.png"),
        3: ("apps", "mouse-cat.png"),
        4: ("apps", "terminal-cat.png"),
        5: ("apps", "paint-cat.png"),
        6: ("apps", "computer-hug-cat.png"),
        7: ("cats", "screensaver-cat.png"),
        8: ("apps", "installer-cat.png"),
        9: ("apps", "about-cat.png"),
        10: ("apps", "market-control-cat.png"),
        12: ("cats", "warning-cat.png"),
        21: ("apps", "recycle-bin-cat.png"),
    }
    for index, (folder, name) in cutouts.items():
        destination = OUTPUT / folder / name
        manifest["processed"][str(destination.relative_to(ROOT)).replace("\\", "/")] = save_cutout(files[index], destination)

    manifest["processed"].update(split_sheet(
        files[0], OUTPUT / "cats",
        ["sit", "stand", "walk", "sleep-side", "sleep-curled", "computer", "point", "celebrate"],
        4, 2,
    ))
    manifest["processed"].update(split_sheet(
        files[19], OUTPUT / "cats" / "reactions",
        ["confident", "concerned", "shocked", "annoyed", "laughing", "unimpressed", "sleepy", "celebrating"],
        4, 2,
    ))
    manifest["processed"].update(split_sheet(
        files[15], OUTPUT / "icons",
        ["links", "my-computer", "lore", "memes", "document", "community", "internet", "moon", "recycle-empty", "recycle-full", "terminal", "market"],
        4, 3,
    ))

    # Seed the meme folder with non-destructive copies of suitable supplied art.
    meme_sources = {
        3: "mouse-rider.jpg",
        10: "market-control.jpg",
        11: "internet-cat.jpg",
        13: "lost-server-room.jpg",
    }
    for index, name in meme_sources.items():
        destination = OUTPUT / "memes" / name
        shutil.copy2(files[index], destination)
        with Image.open(destination) as image:
            manifest["processed"][str(destination.relative_to(ROOT)).replace("\\", "/")] = image.size

    # New approved replacement sheets supplied at the project root. These files
    # already contain transparency, so they are cropped directly and never
    # colour-keyed or resampled.
    new_reactions = ROOT / "ChatGPT Image 9 Sep 2026, 11.43.03.png"
    new_icons = ROOT / "ChatGPT Image 9 Sep 2026, 11.46.54.png"
    new_apps = ROOT / "ChatGPT Image 9 Sep 2026, 11.58.36.png"
    new_wallpaper = ROOT / "image.png"
    if all(path.exists() for path in (new_reactions, new_icons, new_apps, new_wallpaper)):
        manifest["processed"].update(extract_component_groups(new_reactions, OUTPUT / "cats" / "reactions", {
            "confident": (0, 0, 360, 540), "concerned": (360, 0, 720, 540),
            "shocked": (720, 0, 1080, 540), "annoyed": (1080, 0, 1448, 540),
            "laughing": (0, 540, 360, 1086), "unimpressed": (360, 540, 720, 1086),
            "sleepy": (720, 540, 1040, 1086), "celebrating": (1040, 540, 1448, 1086),
        }))
        manifest["processed"].update(extract_component_groups(new_icons, OUTPUT / "icons", {
            "links": (0, 0, 320, 520), "my-computer": (320, 0, 630, 520),
            "lore": (630, 0, 940, 520), "memes": (940, 0, 1254, 520),
            "document": (0, 520, 310, 830), "community": (310, 520, 630, 830),
            "internet": (630, 520, 940, 830), "moon": (940, 520, 1254, 830),
            "recycle-empty": (0, 830, 310, 1254), "recycle-full": (310, 830, 630, 1254),
            "terminal": (630, 830, 940, 1254), "market": (940, 830, 1254, 1254),
        }))
        manifest["processed"].update(extract_component_groups(new_apps, OUTPUT / "apps", {
            "calculator-cat": (0, 0, 530, 420),
            "mouse-cat": (530, 0, 1025, 415),
            "terminal-cat": (1025, 0, 1536, 420),
            "paint-cat": (0, 380, 650, 730),
            "computer-hug-cat": (650, 380, 1120, 770),
            "sleep-cat": (1120, 400, 1536, 700),
            "installer-cat": (0, 680, 920, 1024),
            "about-cat": (920, 680, 1536, 1024),
        }))
        screensaver_destination = OUTPUT / "cats" / "screensaver-cat.png"
        shutil.copy2(OUTPUT / "apps" / "sleep-cat.png", screensaver_destination)
        with Image.open(screensaver_destination) as screensaver:
            manifest["processed"][str(screensaver_destination.relative_to(ROOT)).replace("\\", "/")] = screensaver.size
        wallpaper_destination = OUTPUT / "wallpaper" / "links-hill.png"
        shutil.copy2(new_wallpaper, wallpaper_destination)
        with Image.open(wallpaper_destination) as wallpaper:
            manifest["processed"][str(wallpaper_destination.relative_to(ROOT)).replace("\\", "/")] = wallpaper.size
        manifest["replacement_sources"] = [path.name for path in (new_reactions, new_icons, new_apps, new_wallpaper)]

    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Prepared {len(manifest['processed'])} files from {len(files)} supplied images.")


if __name__ == "__main__":
    main()
