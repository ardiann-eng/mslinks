from PIL import Image, ImageDraw

def create_catchat_icon(size=48):
    # 32x32 canvas
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    pixels = img.load()

    c_black = (0, 0, 0, 255)
    c_white = (255, 255, 255, 255)
    c_icq_green = (0, 220, 0, 255)
    c_icq_green_dark = (0, 150, 0, 255)
    c_icq_green_light = (120, 255, 120, 255)
    c_red = (235, 30, 30, 255)
    c_red_light = (255, 110, 110, 255)
    c_red_dark = (160, 0, 0, 255)

    # 1. 8 green petals arranged around a circle (Radius 9)
    # Petal centers: N, NE, E, SE, S, SW, W, NW
    petals = [
        (16, 7), (22, 9), (25, 16), (22, 23),
        (16, 25), (10, 23), (7, 16), (10, 9)
    ]

    for px, py in petals:
        for y in range(py - 4, py + 5):
            for x in range(px - 4, px + 5):
                dist = (x - px)**2 + (y - py)**2
                if dist <= 14:
                    if 0 <= x < 32 and 0 <= y < 32:
                        pixels[x, y] = c_icq_green

    # Add black border around petals
    outline_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    for y in range(1, 31):
        for x in range(1, 31):
            if pixels[x, y][3] > 0:
                # check neighbors
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
                    if pixels[x + dx, y + dy][3] == 0:
                        outline_img.putpixel((x + dx, y + dy), c_black)

    # Composite outline
    img = Image.alpha_composite(outline_img, img)
    pixels = img.load()

    # Highlights on green petals
    for px, py in petals:
        if 0 <= px - 1 < 32 and 0 <= py - 1 < 32 and pixels[px - 1, py - 1][3] > 0:
            pixels[px - 1, py - 1] = c_icq_green_light

    # 2. Red center petal (Iconic ICQ / CatChat active center)
    cx, cy = 16, 16
    for y in range(cy - 4, cy + 5):
        for x in range(cx - 4, cx + 5):
            dist = (x - cx)**2 + (y - cy)**2
            if dist <= 12:
                pixels[x, y] = c_red

    # Red center outline & highlight
    for y in range(cy - 4, cy + 5):
        for x in range(cx - 4, cx + 5):
            dist = (x - cx)**2 + (y - cy)**2
            if 9 <= dist <= 13:
                pixels[x, y] = c_red_dark

    pixels[15, 14] = c_red_light
    pixels[16, 14] = c_red_light
    pixels[15, 15] = c_white

    return img.resize((size, size), Image.NEAREST)

def create_cat_pet_icon(size=48):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    pixels = img.load()

    c_black = (0, 0, 0, 255)
    c_white = (255, 255, 255, 255)
    c_cat_gold = (255, 204, 0, 255)
    c_cat_dark_gold = (210, 160, 0, 255)
    c_cat_light = (255, 235, 120, 255)
    c_pink = (255, 160, 170, 255)
    c_blue_collar = (0, 130, 230, 255)

    # 1. Cat Head Base Oval (Center 16, 16, rx=11, ry=9)
    for y in range(8, 26):
        for x in range(5, 27):
            dx = (x - 16) / 10.5
            dy = (y - 17) / 8.5
            if dx*dx + dy*dy <= 1.0:
                pixels[x, y] = c_cat_gold

    # 2. Pointy Cat Ears
    # Left ear
    left_ear = [(7, 8), (8, 6), (9, 4), (10, 3), (11, 4), (12, 6), (13, 9)]
    for ex, ey in [(8, 6), (9, 5), (10, 4), (11, 5), (12, 7), (9, 7), (10, 6), (11, 6)]:
        pixels[ex, ey] = c_cat_gold
    for ex, ey in [(9, 6), (10, 5), (10, 7)]:
        pixels[ex, ey] = c_pink

    # Right ear
    for ex, ey in [(23, 6), (22, 5), (21, 4), (20, 5), (19, 7), (22, 7), (21, 6), (20, 6)]:
        pixels[ex, ey] = c_cat_gold
    for ex, ey in [(22, 6), (21, 5), (21, 7)]:
        pixels[ex, ey] = c_pink

    # Black outlines for ears & head
    for x in range(8, 12):
        pixels[x, 3 + (11-x)] = c_black
    pixels[10, 3] = c_black
    pixels[9, 4] = c_black
    pixels[8, 5] = c_black
    pixels[7, 7] = c_black

    for x in range(20, 24):
        pixels[x, 3 + (x-20)] = c_black
    pixels[21, 3] = c_black
    pixels[22, 4] = c_black
    pixels[23, 5] = c_black
    pixels[24, 7] = c_black

    # Top head between ears
    for x in range(12, 20):
        pixels[x, 8] = c_black

    # Head left and right cheeks
    for y in range(8, 25):
        for x in range(5, 27):
            dx = (x - 16) / 10.5
            dy = (y - 17) / 8.5
            dist = dx*dx + dy*dy
            if 0.85 <= dist <= 1.15:
                pixels[x, y] = c_black

    # 3. Eyes (Classic Links Cat black oval dots)
    pixels[12, 14] = c_black
    pixels[12, 15] = c_black
    pixels[19, 14] = c_black
    pixels[19, 15] = c_black

    # 4. Big round black nose in middle
    for y in range(15, 18):
        for x in range(15, 18):
            pixels[x, y] = c_black

    # 5. Whiskers
    # Left whiskers
    pixels[5, 15] = c_black
    pixels[6, 16] = c_black
    pixels[7, 16] = c_black
    pixels[5, 18] = c_black
    pixels[6, 18] = c_black
    pixels[7, 18] = c_black

    # Right whiskers
    pixels[26, 15] = c_black
    pixels[25, 16] = c_black
    pixels[24, 16] = c_black
    pixels[26, 18] = c_black
    pixels[25, 18] = c_black
    pixels[24, 18] = c_black

    # 6. Blue collar at bottom
    for x in range(12, 20):
        pixels[x, 25] = c_blue_collar
        pixels[x, 26] = c_black

    return img.resize((size, size), Image.NEAREST)

if __name__ == "__main__":
    create_catchat_icon(48).save("assets/icons/catchat.png")
    create_catchat_icon(48).save("assets/icons/links98/catchat.png")
    create_catchat_icon(16).save("assets/icons/catchat-16.png")
    create_cat_pet_icon(48).save("assets/icons/cat-pet.png")
    create_cat_pet_icon(48).save("assets/icons/links98/cat-pet.png")
    create_cat_pet_icon(16).save("assets/icons/cat-pet-16.png")
    print("Created CatChat and Cat Pet icons successfully.")
