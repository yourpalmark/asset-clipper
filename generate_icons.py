"""
Generates Asset Clipper icons at 16x16, 48x48, and 128x128.

Design: purple rounded-square background, a photo/image frame in the
upper portion, and a downward download arrow in the lower portion.
"""

from PIL import Image, ImageDraw


def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
    if fill:
        draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
        draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
        draw.ellipse([x0, y0, x0 + 2*r, y0 + 2*r], fill=fill)
        draw.ellipse([x1 - 2*r, y0, x1, y0 + 2*r], fill=fill)
        draw.ellipse([x0, y1 - 2*r, x0 + 2*r, y1], fill=fill)
        draw.ellipse([x1 - 2*r, y1 - 2*r, x1, y1], fill=fill)
    if outline:
        draw.rounded_rectangle(bbox, radius=r, outline=outline, width=width)


def create_icon(size):
    # Work at 4x and downsample for clean edges
    scale = 4
    S = size * scale
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    PURPLE = (196, 181, 253, 255)   # #c4b5fd — light purple, visible on dark and light backgrounds
    PEAK   = (196, 181, 253, 180)  # translucent purple for peaks
    WHITE  = PURPLE                 # reuse purple everywhere white was used
    lw     = max(2, int(S * 0.055))

    # --- Photo frame (upper ~45% of canvas) ---
    fm  = int(S * 0.18)             # horizontal margin
    ft  = int(S * 0.13)             # frame top
    fb  = int(S * 0.52)             # frame bottom
    fr  = int(S * 0.06)             # frame corner radius
    draw.rounded_rectangle([fm, ft, S - fm, fb], radius=fr,
                           outline=PURPLE, width=lw)

    # Landscape peaks inside the frame
    il = fm + lw + int(S * 0.02)
    ir = S - fm - lw - int(S * 0.02)
    it = ft + lw + int(S * 0.02)
    ib = fb - lw - int(S * 0.01)
    w  = ir - il
    h  = ib - it

    # Left peak
    draw.polygon([
        (il,              ib),
        (il + w * 2//5,   it + h * 2//5),
        (il + w * 4//7,   ib),
    ], fill=PEAK)

    # Right peak (taller, partially behind left)
    draw.polygon([
        (il + w * 3//7,   ib),
        (il + w * 6//8,   it + h * 1//5),
        (ir,              ib),
    ], fill=PEAK)

    # Sun (circle, top-right inside frame)
    sr = int(S * 0.055)
    sx = ir - sr - int(S * 0.04)
    sy = it + sr + int(S * 0.02)
    draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr],
                 fill=(196, 181, 253, 220))

    # --- Download arrow (lower ~45% of canvas) ---
    ax   = S // 2
    stem_w    = max(2, int(S * 0.09))
    stem_top  = int(S * 0.565)
    stem_bot  = int(S * 0.72)
    head_half = int(S * 0.195)
    head_bot  = int(S * 0.845)
    tray_y    = int(S * 0.875)
    tray_half = int(S * 0.23)
    tray_h    = max(2, int(S * 0.06))

    # Stem
    draw.rectangle([ax - stem_w//2, stem_top, ax + stem_w//2, stem_bot],
                   fill=WHITE)
    # Head
    draw.polygon([
        (ax - head_half, stem_bot),
        (ax + head_half, stem_bot),
        (ax,             head_bot),
    ], fill=WHITE)
    # Tray (download shelf)
    draw.rectangle([ax - tray_half, tray_y,
                    ax + tray_half, tray_y + tray_h], fill=WHITE)

    # Downsample to target size with antialiasing
    return img.resize((size, size), Image.LANCZOS)


for size in [16, 48, 128]:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png')
    print(f'Created icons/icon{size}.png')
