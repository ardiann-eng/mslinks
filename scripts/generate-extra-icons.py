from PIL import Image, ImageDraw

def create_rugsweeper_icon(size=48):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    pixels = img.load()
    c_black = (0, 0, 0, 255)
    c_white = (255, 255, 255, 255)
    c_grey = (192, 192, 192, 255)
    c_dark_grey = (80, 80, 80, 255)
    c_red = (230, 0, 0, 255)
    c_orange = (255, 140, 0, 255)

    # 1. Classic Minesweeper Mine sphere (Center 16, 17, radius 9)
    for y in range(8, 27):
        for x in range(7, 26):
            dx = x - 16
            dy = y - 17
            dist = dx*dx + dy*dy
            if dist <= 72:
                pixels[x, y] = c_black

    # Highlight on sphere
    for y in range(12, 15):
        for x in range(11, 14):
            pixels[x, y] = c_white

    # Spikes around the mine
    # Top & bottom spikes
    for y in range(4, 8):
        pixels[15, y] = c_black
        pixels[16, y] = c_black
    for y in range(27, 31):
        pixels[15, y] = c_black
        pixels[16, y] = c_black

    # Left & right spikes
    for x in range(3, 7):
        pixels[x, 16] = c_black
        pixels[x, 17] = c_black
    for x in range(26, 30):
        pixels[x, 16] = c_black
        pixels[x, 17] = c_black

    # Diagonal spikes
    for i in range(4):
        pixels[6 + i, 7 + i] = c_black
        pixels[7 + i, 6 + i] = c_black
        pixels[25 - i, 7 + i] = c_black
        pixels[24 - i, 6 + i] = c_black
        pixels[6 + i, 26 - i] = c_black
        pixels[7 + i, 27 - i] = c_black
        pixels[25 - i, 26 - i] = c_black
        pixels[24 - i, 27 - i] = c_black

    # Little red $ spark in center
    pixels[15, 16] = c_red
    pixels[16, 16] = c_orange
    pixels[15, 17] = c_orange
    pixels[16, 17] = c_red

    return img.resize((size, size), Image.NEAREST)

def create_winamp_icon(size=48):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    pixels = img.load()
    c_black = (0, 0, 0, 255)
    c_yellow = (255, 220, 0, 255)
    c_orange = (255, 160, 0, 255)
    c_white = (255, 255, 255, 255)
    c_metal = (180, 180, 190, 255)
    c_dark_metal = (70, 70, 80, 255)

    # Beveled metallic chassis
    for y in range(4, 28):
        for x in range(4, 28):
            pixels[x, y] = c_dark_metal

    # Outer border
    for x in range(4, 28):
        pixels[x, 4] = c_white
        pixels[x, 27] = c_black
    for y in range(4, 28):
        pixels[4, y] = c_white
        pixels[27, y] = c_black

    # Lightning bolt (Classic WinAmp bolt)
    bolt_coords = [
        (18, 6), (19, 6), (16, 13), (22, 13), (12, 25), (15, 16), (10, 16), (17, 7)
    ]
    # Fill bolt
    for y in range(6, 26):
        for x in range(8, 24):
            # Polygon inside check or manual placement
            if (y <= 13 and 15 <= x + (y-6)//2 <= 20) or (y > 13 and 10 <= x - (y-13)//2 <= 17):
                pixels[x, y] = c_yellow

    # Bolt glow outline
    for x in range(16, 20):
        pixels[x, 7] = c_white
    pixels[13, 24] = c_orange

    return img.resize((size, size), Image.NEAREST)

if __name__ == "__main__":
    create_rugsweeper_icon(48).save("assets/icons/rugsweeper.png")
    create_rugsweeper_icon(48).save("assets/icons/links98/rugsweeper.png")
    create_winamp_icon(48).save("assets/icons/winamp.png")
    create_winamp_icon(48).save("assets/icons/links98/winamp.png")
    print("Created extra icons successfully.")
