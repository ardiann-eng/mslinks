"""Extract the approved 4x4 LINKS 98 icon sheet without resampling."""

from math import ceil
from pathlib import Path
from collections import deque
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ChatGPT Image 9 Sep 2026, 22.39.58.png"
OUTPUT = ROOT / "assets" / "icons" / "links98"
NAMES = (
    "live-tape", "solitaire", "my-profile", "holder-map",
    "weather-98", "printers", "links-games", "links-exe",
    "buy-links", "links-chart", "antivirus-98", "wallet",
    "downloads", "links-radio", "paint-98", "token-contract",
)


def remove_cell_fragments(cell):
    """Keep the dominant connected artwork and discard spill from adjacent cells."""
    width, height = cell.size
    alpha = cell.getchannel("A")
    pixels = alpha.load()
    seen = bytearray(width * height)
    groups = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or pixels[x, y] < 8:
                continue
            queue, points = deque([(x, y)]), []
            seen[start] = 1
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
                    pos = ny * width + nx
                    if 0 <= nx < width and 0 <= ny < height and not seen[pos] and pixels[nx, ny] >= 8:
                        seen[pos] = 1
                        queue.append((nx, ny))
            groups.append(points)
    keep = set(max(groups, key=len, default=[]))
    result = Image.new("RGBA", cell.size)
    source, target = cell.load(), result.load()
    for x, y in keep:
        target[x, y] = source[x, y]
    return result


def main():
    sheet = Image.open(SOURCE).convert("RGBA")
    x_edges = [round(sheet.width * step / 4) for step in range(5)]
    y_edges = [round(sheet.height * step / 4) for step in range(5)]
    OUTPUT.mkdir(parents=True, exist_ok=True)

    generated = []
    for index, name in enumerate(NAMES):
        column, row = index % 4, index // 4
        cell = sheet.crop((x_edges[column], y_edges[row],
                           x_edges[column + 1], y_edges[row + 1]))
        cell = remove_cell_fragments(cell)
        bounds = cell.getchannel("A").getbbox()
        if not bounds:
            raise ValueError(f"Cell {index + 1} ({name}) has no visible pixels")
        artwork = cell.crop(bounds)
        padding = ceil(max(artwork.size) * 0.12)
        side = max(artwork.size) + padding * 2
        output = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        output.alpha_composite(artwork, ((side - artwork.width) // 2,
                                         (side - artwork.height) // 2))
        final_bounds = output.getchannel("A").getbbox()
        if output.width != output.height or not final_bounds:
            raise ValueError(f"Invalid output geometry for {name}")
        if final_bounds[0] == 0 or final_bounds[1] == 0 or final_bounds[2] == side or final_bounds[3] == side:
            raise ValueError(f"Transparent padding missing for {name}")
        output.save(OUTPUT / f"{name}.png", "PNG", optimize=True)
        generated.append(output)
        print(f"{name}.png\t{output.width}x{output.height}\tart={artwork.width}x{artwork.height}")

    preview = Image.new("RGBA", (1024, 1024), (32, 32, 32, 255))
    for index, output in enumerate(generated):
        thumb = output.copy()
        thumb.thumbnail((220, 220), Image.Resampling.NEAREST)
        x = (index % 4) * 256 + (256 - thumb.width) // 2
        y = (index // 4) * 256 + (256 - thumb.height) // 2
        preview.alpha_composite(thumb, (x, y))
    inspection = ROOT / ".inspection" / "links98-icons-verification.png"
    inspection.parent.mkdir(parents=True, exist_ok=True)
    preview.save(inspection, "PNG")
    print(f"Verified {len(generated)} square RGBA icons with transparent padding.")


if __name__ == "__main__":
    main()
