"""
Generates Asset Clipper icons at 16x16, 48x48, and 128x128.

Design (matches standard image-download icon convention):
  - Large photo frame filling most of the canvas
    - Circle (sun) in upper-left
    - Two mountain peaks across the bottom
  - Filled circle badge in bottom-right corner with a downward arrow
"""

from PIL import Image, ImageDraw


def create_icon(size):
    # Render at 4x then downsample for clean anti-aliased edges
    scale = 4
    S = size * scale
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    C = (196, 181, 253, 255)   # #c4b5fd — light purple
    lw = max(2, int(S * 0.06)) # stroke width

    # ------------------------------------------------------------------ #
    # Photo frame — occupies most of the canvas, leaves room for badge    #
    # ------------------------------------------------------------------ #
    badge_r  = int(S * 0.22)          # badge circle radius
    badge_cx = S - badge_r - int(S * 0.01)
    badge_cy = S - badge_r - int(S * 0.01)

    # Frame bounds — shrink slightly in bottom-right to let badge sit over corner
    pad  = int(S * 0.04)
    fr   = int(S * 0.08)              # frame corner radius
    fr_r = S - badge_r - int(S * 0.04)  # frame right edge

    draw.rounded_rectangle(
        [pad, pad, fr_r, S - int(S * 0.18)],
        radius=fr, outline=C, width=lw
    )

    # Fill inside the frame (solid) so mountains/sun are cut-outs
    draw.rounded_rectangle(
        [pad + lw, pad + lw, fr_r - lw, S - int(S * 0.18) - lw],
        radius=max(1, fr - lw), fill=C
    )

    # ------------------------------------------------------------------ #
    # Sun (circle) — upper-left inside frame, cut out as transparent      #
    # ------------------------------------------------------------------ #
    sun_r  = int(S * 0.1)
    sun_cx = pad + lw + int(S * 0.14)
    sun_cy = pad + lw + int(S * 0.14)
    draw.ellipse(
        [sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
        fill=(0, 0, 0, 0)
    )

    # ------------------------------------------------------------------ #
    # Mountain peaks — lower inside frame, cut out as transparent         #
    # ------------------------------------------------------------------ #
    il = pad + lw + int(S * 0.02)
    ir = fr_r - lw - int(S * 0.02)
    ib = S - int(S * 0.18) - lw - int(S * 0.02)
    it = pad + lw + int(S * 0.3)   # peaks start here
    mid = il + (ir - il) * 2 // 5

    # Left (shorter) peak
    draw.polygon([
        (il, ib),
        (mid, it + int((ib - it) * 0.35)),
        (il + (ir - il) * 3 // 5, ib),
    ], fill=(0, 0, 0, 0))

    # Right (taller) peak
    draw.polygon([
        (il + (ir - il) // 3, ib),
        (il + (ir - il) * 2 // 3, it),
        (ir, ib),
    ], fill=(0, 0, 0, 0))

    # ------------------------------------------------------------------ #
    # Download badge — filled circle in bottom-right with arrow cut-out   #
    # ------------------------------------------------------------------ #
    draw.ellipse(
        [badge_cx - badge_r, badge_cy - badge_r,
         badge_cx + badge_r, badge_cy + badge_r],
        fill=C
    )

    # Arrow: stem + head, cut out transparent inside the badge
    stem_w   = max(2, int(badge_r * 0.32))
    stem_top = badge_cy - int(badge_r * 0.55)
    stem_bot = badge_cy + int(badge_r * 0.05)
    head_hw  = int(badge_r * 0.6)
    head_bot = badge_cy + int(badge_r * 0.58)

    draw.rectangle(
        [badge_cx - stem_w // 2, stem_top,
         badge_cx + stem_w // 2, stem_bot],
        fill=(0, 0, 0, 0)
    )
    draw.polygon([
        (badge_cx - head_hw, stem_bot),
        (badge_cx + head_hw, stem_bot),
        (badge_cx,           head_bot),
    ], fill=(0, 0, 0, 0))

    return img.resize((size, size), Image.LANCZOS)


for size in [16, 48, 128]:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png')
    print(f'Created icons/icon{size}.png')
