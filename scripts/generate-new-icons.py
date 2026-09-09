"""Generate pixel-art PNG icons for LINKS Market, LINKS Online, Notepad, and Code Editor."""

from PIL import Image
import os

OUTPUT_LINKS98 = "assets/icons/links98"
OUTPUT_ICONS = "assets/icons"
os.makedirs(OUTPUT_LINKS98, exist_ok=True)
os.makedirs(OUTPUT_ICONS, exist_ok=True)

SCALE = 10  # 32x32 -> 320x320

def create_market_icon():
    # 32x32 grid
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    p = img.load()
    
    # Palette
    C_BLACK = (0, 0, 0, 255)
    C_WHITE = (255, 255, 255, 255)
    C_BEIGE_LIGHT = (223, 223, 223, 255)
    C_BEIGE_MID = (192, 192, 192, 255)
    C_BEIGE_DARK = (128, 128, 128, 255)
    C_BEIGE_SHADOW = (64, 64, 64, 255)
    C_CRT_BG = (10, 20, 12, 255)
    C_GRID = (20, 50, 25, 255)
    C_GREEN = (0, 255, 64, 255)
    C_GREEN_BRIGHT = (128, 255, 160, 255)
    C_GREEN_DARK = (0, 160, 40, 255)
    C_RED = (255, 48, 48, 255)
    C_YELLOW = (255, 220, 0, 255)
    C_CYAN = (0, 220, 255, 255)

    # Draw Monitor Case (x: 2..29, y: 2..24)
    # Outer black border
    for x in range(3, 29):
        p[x, 2] = C_BLACK
        p[x, 24] = C_BLACK
    for y in range(3, 24):
        p[2, y] = C_BLACK
        p[29, y] = C_BLACK

    # Bevel highlights & body
    for y in range(3, 24):
        for x in range(3, 29):
            p[x, y] = C_BEIGE_MID

    # Top & Left bevel light
    for x in range(3, 28):
        p[x, 3] = C_WHITE
    for y in range(3, 23):
        p[3, y] = C_WHITE

    # Bottom & Right bevel shadow
    for x in range(3, 29):
        p[x, 23] = C_BEIGE_DARK
    for y in range(3, 24):
        p[28, y] = C_BEIGE_DARK

    # CRT Screen Inset (x: 6..25, y: 5..19)
    # Inner border shadow (top/left dark, bottom/right light)
    for x in range(5, 27):
        p[x, 4] = C_BEIGE_DARK
        p[x, 20] = C_WHITE
    for y in range(4, 21):
        p[5, y] = C_BEIGE_DARK
        p[26, y] = C_WHITE

    # Screen Background
    for y in range(5, 20):
        for x in range(6, 26):
            p[x, y] = C_CRT_BG

    # Screen Grid
    for x in range(6, 26, 4):
        for y in range(5, 20):
            p[x, y] = C_GRID
    for y in range(5, 20, 4):
        for x in range(6, 26):
            p[x, y] = C_GRID

    # Bullish Chart Lines and Candlesticks
    # Axis baseline
    for x in range(6, 26):
        p[x, 18] = (30, 70, 35, 255)

    # Bullish Trend Line (glowing green polyline)
    chart_pts = [
        (7, 17), (8, 16), (9, 16), (10, 15), (11, 14), (12, 15),
        (13, 13), (14, 12), (15, 13), (16, 11), (17, 10), (18, 11),
        (19, 9), (20, 8), (21, 8), (22, 7), (23, 6), (24, 6)
    ]
    for x, y in chart_pts:
        p[x, y] = C_GREEN_BRIGHT
        if y + 1 < 19:
            p[x, y + 1] = C_GREEN

    # Candlestick bars
    # Bar 1 (green)
    p[9, 14] = C_GREEN_DARK
    p[9, 15] = C_GREEN
    # Bar 2 (green tall)
    p[14, 11] = C_GREEN
    p[14, 12] = C_GREEN_BRIGHT
    p[14, 13] = C_GREEN
    # Bar 3 (green breakout)
    p[20, 7] = C_GREEN_DARK
    p[20, 8] = C_GREEN_BRIGHT
    p[20, 9] = C_GREEN
    # Arrow peak at top right
    p[24, 6] = C_WHITE
    p[23, 5] = C_GREEN_BRIGHT
    p[24, 5] = C_WHITE
    p[25, 5] = C_GREEN_BRIGHT
    p[24, 7] = C_GREEN_BRIGHT

    # Monitor Bezel Buttons (y: 21..22)
    p[7, 22] = (0, 255, 0, 255)   # Power LED green
    p[8, 22] = (0, 200, 0, 255)
    p[21, 22] = C_BEIGE_DARK     # Button 1
    p[23, 22] = C_BEIGE_DARK     # Button 2
    p[25, 22] = C_BEIGE_DARK     # Button 3

    # Monitor Neck (x: 13..18, y: 25..26)
    for y in range(25, 27):
        p[12, y] = C_BLACK
        for x in range(13, 19):
            p[x, y] = C_BEIGE_DARK
        p[19, y] = C_BLACK

    # Monitor Base (x: 9..22, y: 27..29)
    for x in range(9, 23):
        p[x, 27] = C_WHITE
        p[x, 28] = C_BEIGE_MID
        p[x, 29] = C_BLACK
    p[8, 27] = C_BLACK
    p[8, 28] = C_BLACK
    p[8, 29] = C_BLACK
    p[23, 27] = C_BLACK
    p[23, 28] = C_BLACK
    p[23, 29] = C_BLACK
    for y in range(27, 29):
        p[9, y] = C_WHITE
        p[22, y] = C_BEIGE_DARK

    return img


def create_online_icon():
    # 32x32 grid: CRT Computer with tiny Links Cat ears + Globe connected
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    p = img.load()

    C_BLACK = (0, 0, 0, 255)
    C_WHITE = (255, 255, 255, 255)
    C_BEIGE_LIGHT = (223, 223, 223, 255)
    C_BEIGE_MID = (192, 192, 192, 255)
    C_BEIGE_DARK = (128, 128, 128, 255)
    
    # Cat Colors
    C_CAT_ORANGE = (255, 140, 0, 255)
    C_CAT_LIGHT = (255, 180, 50, 255)
    C_CAT_PINK = (255, 160, 160, 255)
    
    # Globe Colors
    C_OCEAN_DARK = (0, 40, 130, 255)
    C_OCEAN_MID = (0, 80, 200, 255)
    C_OCEAN_LIGHT = (40, 140, 255, 255)
    C_LAND_GREEN = (0, 180, 50, 255)
    C_LAND_LIGHT = (80, 220, 90, 255)
    C_GRID_CYAN = (0, 255, 255, 255)

    # 1. Tiny Links Cat Ears on CRT (x: 4..13, y: 1..4)
    # Left Ear
    p[4, 4] = C_BLACK
    p[4, 3] = C_BLACK
    p[5, 2] = C_BLACK
    p[6, 3] = C_CAT_PINK
    p[5, 3] = C_CAT_ORANGE
    p[5, 4] = C_CAT_ORANGE
    p[6, 4] = C_CAT_LIGHT
    p[7, 4] = C_CAT_ORANGE
    # Right Ear
    p[11, 4] = C_CAT_ORANGE
    p[12, 4] = C_CAT_LIGHT
    p[12, 3] = C_CAT_ORANGE
    p[13, 3] = C_CAT_PINK
    p[14, 2] = C_BLACK
    p[15, 3] = C_BLACK
    p[15, 4] = C_BLACK
    # Top head
    for x in range(7, 12):
        p[x, 4] = C_CAT_ORANGE

    # 2. CRT Computer (x: 2..17, y: 5..21)
    for x in range(3, 17):
        p[x, 5] = C_BLACK
        p[x, 21] = C_BLACK
    for y in range(6, 21):
        p[2, y] = C_BLACK
        p[17, y] = C_BLACK

    for y in range(6, 21):
        for x in range(3, 17):
            p[x, y] = C_BEIGE_MID

    for x in range(3, 16):
        p[x, 6] = C_WHITE
    for y in range(6, 20):
        p[3, y] = C_WHITE
    for x in range(3, 17):
        p[x, 20] = C_BEIGE_DARK
    for y in range(6, 21):
        p[16, y] = C_BEIGE_DARK

    # Screen (x: 5..14, y: 8..17)
    for x in range(4, 16):
        p[x, 7] = C_BEIGE_DARK
        p[x, 18] = C_WHITE
    for y in range(7, 19):
        p[4, y] = C_BEIGE_DARK
        p[15, y] = C_WHITE

    for y in range(8, 18):
        for x in range(5, 15):
            p[x, y] = (0, 0, 128, 255) # Classic Windows blue screen

    # Screen Content: "WWW / LINKS" text or web icon
    p[6, 10] = C_WHITE; p[8, 10] = C_WHITE; p[10, 10] = C_WHITE
    p[6, 11] = C_WHITE; p[7, 11] = C_WHITE; p[8, 11] = C_WHITE; p[9, 11] = C_WHITE; p[10, 11] = C_WHITE
    p[7, 12] = C_WHITE; p[9, 12] = C_WHITE
    # Green prompt
    p[6, 15] = (0, 255, 64, 255)
    p[7, 15] = (0, 255, 64, 255)
    p[8, 15] = (0, 255, 64, 255)

    # Monitor Base
    for x in range(6, 14):
        p[x, 22] = C_WHITE
        p[x, 23] = C_BEIGE_MID
        p[x, 24] = C_BLACK
    p[5, 22] = C_BLACK; p[5, 23] = C_BLACK; p[5, 24] = C_BLACK
    p[14, 22] = C_BLACK; p[14, 23] = C_BLACK; p[14, 24] = C_BLACK

    # 3. Globe (Center x: 23, y: 19, Radius: 7)
    globe_pixels = [
        # y: 12
        (21, 12), (22, 12), (23, 12), (24, 12), (25, 12),
        # y: 13
        (19, 13), (20, 13), (21, 13), (22, 13), (23, 13), (24, 13), (25, 13), (26, 13), (27, 13),
        # y: 14
        (18, 14), (19, 14), (20, 14), (21, 14), (22, 14), (23, 14), (24, 14), (25, 14), (26, 14), (27, 14), (28, 14),
        # y: 15
        (17, 15), (18, 15), (19, 15), (20, 15), (21, 15), (22, 15), (23, 15), (24, 15), (25, 15), (26, 15), (27, 15), (28, 15), (29, 15),
        # y: 16
        (17, 16), (18, 16), (19, 16), (20, 16), (21, 16), (22, 16), (23, 16), (24, 16), (25, 16), (26, 16), (27, 16), (28, 16), (29, 16),
        # y: 17
        (16, 17), (17, 17), (18, 17), (19, 17), (20, 17), (21, 17), (22, 17), (23, 17), (24, 17), (25, 17), (26, 17), (27, 17), (28, 17), (29, 17), (30, 17),
        # y: 18
        (16, 18), (17, 18), (18, 18), (19, 18), (20, 18), (21, 18), (22, 18), (23, 18), (24, 18), (25, 18), (26, 18), (27, 18), (28, 18), (29, 18), (30, 18),
        # y: 19
        (16, 19), (17, 19), (18, 19), (19, 19), (20, 19), (21, 19), (22, 19), (23, 19), (24, 19), (25, 19), (26, 19), (27, 19), (28, 19), (29, 19), (30, 19),
        # y: 20
        (16, 20), (17, 20), (18, 20), (19, 20), (20, 20), (21, 20), (22, 20), (23, 20), (24, 20), (25, 20), (26, 20), (27, 20), (28, 20), (29, 20), (30, 20),
        # y: 21
        (17, 21), (18, 21), (19, 21), (20, 21), (21, 21), (22, 21), (23, 21), (24, 21), (25, 21), (26, 21), (27, 21), (28, 21), (29, 21),
        # y: 22
        (17, 22), (18, 22), (19, 22), (20, 22), (21, 22), (22, 22), (23, 22), (24, 22), (25, 22), (26, 22), (27, 22), (28, 22), (29, 22),
        # y: 23
        (18, 23), (19, 23), (20, 23), (21, 23), (22, 23), (23, 23), (24, 23), (25, 23), (26, 23), (27, 23), (28, 23),
        # y: 24
        (19, 24), (20, 24), (21, 24), (22, 24), (23, 24), (24, 24), (25, 24), (26, 24), (27, 24),
        # y: 25
        (21, 25), (22, 25), (23, 25), (24, 25), (25, 25)
    ]

    # Fill base ocean
    for x, y in globe_pixels:
        p[x, y] = C_OCEAN_MID

    # Black outline of globe
    for x, y in globe_pixels:
        for dx, dy in ((-1,0), (1,0), (0,-1), (0,1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in globe_pixels and 0 <= nx < 32 and 0 <= ny < 32:
                p[nx, ny] = C_BLACK

    # Continents (Green)
    land = [
        (22, 13), (23, 13), (24, 13),
        (21, 14), (22, 14), (23, 14), (24, 14), (25, 14),
        (20, 15), (21, 15), (22, 15), (23, 15), (26, 15), (27, 15),
        (21, 16), (22, 16), (23, 16), (27, 16), (28, 16),
        (22, 17), (23, 17), (24, 17), (28, 17),
        (23, 18), (24, 18), (25, 18),
        (24, 19), (25, 19), (26, 19), (20, 19), (21, 19),
        (25, 20), (26, 20), (20, 20), (21, 20), (22, 20),
        (25, 21), (26, 21), (21, 21), (22, 21),
        (26, 22), (22, 22), (23, 22),
        (23, 23), (24, 23)
    ]
    for x, y in land:
        if (x, y) in globe_pixels:
            p[x, y] = C_LAND_GREEN

    # Latitude / Equator ring (Cyan glowing orbit)
    for x in range(16, 31):
        if (x, 19) in globe_pixels:
            p[x, 19] = C_GRID_CYAN

    # 4. Connection Cable from CRT to Globe (x: 10..18, y: 24..29)
    p[10, 25] = C_BLACK; p[10, 26] = C_BEIGE_DARK
    p[11, 26] = C_BLACK; p[11, 27] = C_BEIGE_MID; p[11, 28] = C_BLACK
    p[12, 28] = (0, 255, 255, 255); p[12, 29] = C_BLACK # Cyan data packet
    p[13, 28] = (0, 255, 255, 255); p[13, 29] = C_BLACK
    p[14, 27] = C_BEIGE_MID; p[14, 28] = C_BLACK
    p[15, 26] = C_BEIGE_MID; p[15, 27] = C_BLACK
    p[16, 25] = C_BLACK; p[17, 25] = C_BLACK; p[18, 25] = C_BLACK

    return img


def create_notepad_icon():
    # 32x32 grid: Authentic Windows 98 Notepad
    # White/cream paper pad with blue lines, blue spine fold, and yellow pencil
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    p = img.load()

    C_BLACK = (0, 0, 0, 255)
    C_WHITE = (255, 255, 255, 255)
    C_PAPER = (250, 250, 250, 255)
    C_PAPER_SHADOW = (210, 210, 210, 255)
    C_SPINE_BLUE = (0, 0, 160, 255)
    C_SPINE_LIGHT = (64, 128, 255, 255)
    C_RULE_BLUE = (120, 160, 240, 255)
    C_MARGIN_RED = (255, 128, 128, 255)
    
    # Pencil Colors
    C_PENCIL_YELLOW = (255, 200, 0, 255)
    C_PENCIL_DARK = (210, 150, 0, 255)
    C_PENCIL_LIGHT = (255, 230, 100, 255)
    C_FERRULE = (192, 192, 192, 255)
    C_ERASER = (255, 120, 140, 255)
    C_WOOD = (225, 190, 150, 255)
    C_LEAD = (40, 40, 40, 255)

    # 1. Notepad Body (x: 4..25, y: 3..29)
    # Outline
    for x in range(5, 25):
        p[x, 3] = C_BLACK
        p[x, 29] = C_BLACK
    for y in range(4, 29):
        p[4, y] = C_BLACK
        p[25, y] = C_BLACK

    # Paper background
    for y in range(4, 29):
        for x in range(5, 25):
            p[x, y] = C_PAPER

    # Left & Top white highlight
    for y in range(4, 29):
        p[5, y] = C_WHITE
    for x in range(5, 25):
        p[x, 4] = C_WHITE

    # Right & Bottom paper shadow
    for y in range(4, 29):
        p[24, y] = C_PAPER_SHADOW
    for x in range(5, 25):
        p[x, 28] = C_PAPER_SHADOW

    # Blue top binding header (y: 4..7)
    for y in range(4, 8):
        for x in range(5, 25):
            p[x, y] = C_SPINE_BLUE
    for x in range(5, 25):
        p[x, 4] = C_SPINE_LIGHT
        p[x, 7] = (0, 0, 100, 255)

    # Red margin line (x: 8)
    for y in range(8, 28):
        p[8, y] = C_MARGIN_RED

    # Blue horizontal rule lines (y: 10, 13, 16, 19, 22, 25)
    for y in (10, 13, 16, 19, 22, 25):
        for x in range(9, 24):
            p[x, y] = C_RULE_BLUE

    # Text squiggles on lines
    text_pixels = [
        (10, 9), (11, 9), (13, 9), (14, 9), (15, 9), (17, 9), (18, 9), (20, 9),
        (10, 12), (12, 12), (13, 12), (15, 12), (16, 12), (18, 12), (19, 12), (21, 12),
        (10, 15), (11, 15), (12, 15), (14, 15), (16, 15), (17, 15),
        (10, 18), (11, 18), (13, 18), (15, 18), (16, 18), (18, 18),
        (10, 21), (12, 21), (13, 21), (14, 21)
    ]
    for x, y in text_pixels:
        p[x, y] = (60, 80, 140, 255)

    # 2. Pencil laid diagonally (from top-right x:28, y:6 to bottom-left x:16, y:28)
    pencil_coords = [
        # Eraser (top right)
        (27, 4, C_ERASER), (28, 4, C_ERASER), (28, 5, C_ERASER), (29, 5, C_ERASER), (29, 6, C_ERASER),
        # Ferrule (silver collar)
        (26, 6, C_FERRULE), (27, 6, C_FERRULE), (27, 7, C_FERRULE), (28, 7, C_FERRULE), (28, 8, C_FERRULE),
        # Yellow body (main shaft)
        (25, 8, C_PENCIL_LIGHT), (26, 8, C_PENCIL_YELLOW), (26, 9, C_PENCIL_DARK),
        (24, 10, C_PENCIL_LIGHT), (25, 10, C_PENCIL_YELLOW), (25, 11, C_PENCIL_DARK),
        (23, 12, C_PENCIL_LIGHT), (24, 12, C_PENCIL_YELLOW), (24, 13, C_PENCIL_DARK),
        (22, 14, C_PENCIL_LIGHT), (23, 14, C_PENCIL_YELLOW), (23, 15, C_PENCIL_DARK),
        (21, 16, C_PENCIL_LIGHT), (22, 16, C_PENCIL_YELLOW), (22, 17, C_PENCIL_DARK),
        (20, 18, C_PENCIL_LIGHT), (21, 18, C_PENCIL_YELLOW), (21, 19, C_PENCIL_DARK),
        (19, 20, C_PENCIL_LIGHT), (20, 20, C_PENCIL_YELLOW), (20, 21, C_PENCIL_DARK),
        (18, 22, C_PENCIL_LIGHT), (19, 22, C_PENCIL_YELLOW), (19, 23, C_PENCIL_DARK),
        # Wood cone
        (17, 24, C_WOOD), (18, 24, C_WOOD), (18, 25, C_WOOD),
        (16, 26, C_WOOD), (17, 26, C_WOOD),
        # Graphite tip
        (15, 27, C_LEAD), (16, 27, C_LEAD), (15, 28, C_LEAD)
    ]

    for x, y, col in pencil_coords:
        p[x, y] = col

    # Outline around pencil
    for x, y, _ in pencil_coords:
        for dx, dy in ((-1,0), (1,0), (0,-1), (0,1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 32 and 0 <= ny < 32 and (nx, ny) not in [(c[0], c[1]) for c in pencil_coords]:
                if nx > 25 or ny > 28 or nx < 5 or ny < 3 or (nx > 24 and ny < 8):
                    p[nx, ny] = C_BLACK

    return img


def create_editor_icon():
    # 32x32 grid: Beige CRT Monitor with </> and C:\>_ code and subtle Links Cat ears
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    p = img.load()

    C_BLACK = (0, 0, 0, 255)
    C_WHITE = (255, 255, 255, 255)
    C_BEIGE_LIGHT = (223, 223, 223, 255)
    C_BEIGE_MID = (192, 192, 192, 255)
    C_BEIGE_DARK = (128, 128, 128, 255)
    C_CRT_BG = (12, 16, 14, 255)
    C_GREEN = (0, 255, 64, 255)
    C_GREEN_BRIGHT = (128, 255, 160, 255)
    C_CYAN = (0, 255, 255, 255)
    C_YELLOW = (255, 220, 0, 255)
    
    # Cat Ear Colors
    C_CAT_ORANGE = (255, 140, 0, 255)
    C_CAT_LIGHT = (255, 180, 50, 255)
    C_CAT_PINK = (255, 160, 160, 255)

    # 1. Subtle Links Cat Ears on Monitor (x: 5..10 and x: 21..26, y: 1..4)
    # Left Ear
    p[5, 4] = C_BLACK; p[5, 3] = C_BLACK; p[6, 2] = C_BLACK
    p[6, 3] = C_CAT_ORANGE; p[7, 3] = C_CAT_PINK
    p[6, 4] = C_CAT_ORANGE; p[7, 4] = C_CAT_LIGHT; p[8, 4] = C_CAT_ORANGE
    p[9, 4] = C_BLACK
    # Right Ear
    p[22, 4] = C_BLACK; p[23, 4] = C_CAT_ORANGE; p[24, 4] = C_CAT_LIGHT; p[25, 4] = C_CAT_ORANGE
    p[24, 3] = C_CAT_PINK; p[25, 3] = C_CAT_ORANGE; p[25, 2] = C_BLACK; p[26, 3] = C_BLACK; p[26, 4] = C_BLACK

    # 2. Monitor Case (x: 2..29, y: 4..24)
    for x in range(3, 29):
        p[x, 4] = C_BLACK
        p[x, 24] = C_BLACK
    for y in range(5, 24):
        p[2, y] = C_BLACK
        p[29, y] = C_BLACK

    for y in range(5, 24):
        for x in range(3, 29):
            p[x, y] = C_BEIGE_MID

    for x in range(3, 28):
        p[x, 5] = C_WHITE
    for y in range(5, 23):
        p[3, y] = C_WHITE

    for x in range(3, 29):
        p[x, 23] = C_BEIGE_DARK
    for y in range(5, 24):
        p[28, y] = C_BEIGE_DARK

    # Screen Bevel Inset (x: 6..25, y: 6..20)
    for x in range(5, 27):
        p[x, 6] = C_BEIGE_DARK
        p[x, 21] = C_WHITE
    for y in range(6, 22):
        p[5, y] = C_BEIGE_DARK
        p[26, y] = C_WHITE

    # Screen CRT black/dark green
    for y in range(7, 21):
        for x in range(6, 26):
            p[x, y] = C_CRT_BG

    # 3. Code on Screen:
    # Line 1: `</>` in cyan / yellow
    # '<' (x: 8..10, y: 9..13)
    p[10, 9] = C_CYAN
    p[9, 10] = C_CYAN
    p[8, 11] = C_CYAN
    p[9, 12] = C_CYAN
    p[10, 13] = C_CYAN

    # '/' (x: 13..15, y: 9..13)
    p[15, 9] = C_YELLOW
    p[14, 10] = C_YELLOW
    p[14, 11] = C_YELLOW
    p[13, 12] = C_YELLOW
    p[13, 13] = C_YELLOW

    # '>' (x: 18..20, y: 9..13)
    p[18, 9] = C_CYAN
    p[19, 10] = C_CYAN
    p[20, 11] = C_CYAN
    p[19, 12] = C_CYAN
    p[18, 13] = C_CYAN

    # Line 2: `C:\>_` prompt in bright green
    # 'C'
    p[7, 16] = C_GREEN; p[8, 16] = C_GREEN
    p[7, 17] = C_GREEN
    p[7, 18] = C_GREEN; p[8, 18] = C_GREEN
    # ':'
    p[10, 16] = C_GREEN
    p[10, 18] = C_GREEN
    # '\'
    p[12, 16] = C_GREEN; p[13, 17] = C_GREEN; p[14, 18] = C_GREEN
    # '>'
    p[16, 16] = C_GREEN_BRIGHT
    p[17, 17] = C_GREEN_BRIGHT
    p[16, 18] = C_GREEN_BRIGHT
    # Blinking block cursor '_'
    p[19, 16] = C_GREEN_BRIGHT; p[20, 16] = C_GREEN_BRIGHT
    p[19, 17] = C_GREEN_BRIGHT; p[20, 17] = C_GREEN_BRIGHT
    p[19, 18] = C_GREEN_BRIGHT; p[20, 18] = C_GREEN_BRIGHT

    # Monitor Bezel power light & buttons
    p[7, 23] = (0, 255, 64, 255) # Green LED
    p[22, 23] = C_BEIGE_DARK
    p[24, 23] = C_BEIGE_DARK

    # Monitor Neck (x: 13..18, y: 25..26)
    for y in range(25, 27):
        p[12, y] = C_BLACK
        for x in range(13, 19):
            p[x, y] = C_BEIGE_DARK
        p[19, y] = C_BLACK

    # Monitor Base (x: 9..22, y: 27..29)
    for x in range(9, 23):
        p[x, 27] = C_WHITE
        p[x, 28] = C_BEIGE_MID
        p[x, 29] = C_BLACK
    p[8, 27] = C_BLACK; p[8, 28] = C_BLACK; p[8, 29] = C_BLACK
    p[23, 27] = C_BLACK; p[23, 28] = C_BLACK; p[23, 29] = C_BLACK
    for y in range(27, 29):
        p[9, y] = C_WHITE
        p[22, y] = C_BEIGE_DARK

    return img


def save_icon(img, name):
    # Scale up with nearest neighbor
    high_res = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
    
    p1 = os.path.join(OUTPUT_LINKS98, f"{name}.png")
    p2 = os.path.join(OUTPUT_ICONS, f"{name}.png")
    high_res.save(p1, "PNG")
    high_res.save(p2, "PNG")
    print(f"Saved {p1} and {p2}")


if __name__ == "__main__":
    market = create_market_icon()
    save_icon(market, "links-market")
    save_icon(market, "linksmarket")

    online = create_online_icon()
    save_icon(online, "links-online")
    save_icon(online, "linksonline")

    notepad = create_notepad_icon()
    save_icon(notepad, "notepad")

    editor = create_editor_icon()
    save_icon(editor, "code-editor")
    save_icon(editor, "editor")
    print("All 4 retro pixel-art icons generated successfully!")
