from PIL import Image, ImageDraw

def create_win98_folder_icon(size=48):
    # Base 32x32 canvas scaled up cleanly for crisp retro look
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    pixels = img.load()

    # Color palette
    c_black = (0, 0, 0, 255)
    c_white = (255, 255, 255, 255)
    c_dark_gold = (160, 120, 0, 255)
    c_gold_shadow = (200, 160, 0, 255)
    c_gold = (255, 204, 0, 255)
    c_gold_light = (255, 235, 120, 255)
    c_paper = (255, 255, 255, 255)
    c_paper_line = (180, 200, 220, 255)
    c_back_flap = (210, 165, 0, 255)

    # 1. Back flap & Tab
    # Tab top: (3, 7) to (13, 7)
    for x in range(4, 13):
        pixels[x, 7] = c_black
    pixels[3, 8] = c_black
    pixels[13, 8] = c_black

    # Tab fill
    for y in range(8, 12):
        for x in range(4, 13):
            pixels[x, y] = c_gold_light if y == 8 else c_back_flap

    # Back flap body
    for y in range(9, 24):
        for x in range(3, 29):
            pixels[x, y] = c_back_flap

    # Back flap border top-right
    for x in range(13, 29):
        pixels[x, 9] = c_black
    for y in range(9, 24):
        pixels[28, y] = c_black

    # 2. Paper inside folder
    for y in range(10, 18):
        for x in range(7, 25):
            pixels[x, y] = c_paper
    for x in range(7, 25):
        pixels[x, 10] = c_black
    for y in range(10, 18):
        pixels[6, y] = c_black
        pixels[25, y] = c_black
    # Paper lines
    for x in range(9, 23):
        pixels[x, 13] = c_paper_line
        pixels[x, 15] = c_paper_line

    # 3. Front Flap (Open angled style Windows 98)
    # Top highlight of front flap: from (1, 17) to (29, 17) angled
    for y in range(16, 27):
        # sloped left edge
        left_x = max(1, 4 - (y - 16))
        right_x = min(30, 27 + (y - 16) // 2)
        for x in range(left_x, right_x):
            if y == 16:
                pixels[x, y] = c_gold_light
            elif y == 26:
                pixels[x, y] = c_gold_shadow
            else:
                pixels[x, y] = c_gold

    # Left & bottom & right outline of front flap
    for y in range(16, 27):
        left_x = max(1, 4 - (y - 16))
        pixels[left_x, y] = c_black
        right_x = min(30, 27 + (y - 16) // 2)
        pixels[right_x, y] = c_black

    for x in range(1, 31):
        pixels[x, 26] = c_black

    # Front flap top edge highlight
    for x in range(5, 28):
        pixels[x, 16] = c_gold_light
        pixels[x, 17] = c_gold_light

    # Resize to high quality target
    img_large = img.resize((size, size), Image.NEAREST)
    return img_large

if __name__ == "__main__":
    icon48 = create_win98_folder_icon(48)
    icon32 = create_win98_folder_icon(32)

    icon48.save("assets/icons/folder.png")
    icon48.save("assets/icons/links98/folder.png")
    print("Created folder icon successfully.")
