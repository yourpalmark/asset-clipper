"""
Generates Asset Clipper icons at 16x16, 48x48, and 128x128.

Design:
  - Filled circle background (medium purple #a78bfa)
  - White Google Material "download" icon (SVG path), centered

Uses cairosvg to rasterize the SVG at each target size.
Run with: uv run --with cairosvg python3 generate_icons.py
"""

import cairosvg

# The Material icon path uses viewBox "0 -960 960 960".
# We embed it in a standard 0 0 960 960 canvas via translate(0, 960).
SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960">
  <circle cx="480" cy="480" r="470" fill="#a78bfa"/>
  <g transform="translate(0,960)" fill="white">
    <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200Z
             M240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120
             q0 33-23.5 56.5T720-160H240Z"/>
  </g>
</svg>"""

for size in [16, 48, 128]:
    out = f'icons/icon{size}.png'
    cairosvg.svg2png(bytestring=SVG_TEMPLATE.encode(), write_to=out,
                     output_width=size, output_height=size)
    print(f'Created {out}')
