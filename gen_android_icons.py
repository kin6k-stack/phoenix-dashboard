"""Generate Android launcher icons from the MASKABLE source PNG.
The maskable icon already includes safe-zone padding, so the adaptive
foreground fills the full canvas (no extra shrink needed).
"""
from PIL import Image, ImageDraw
import os

# Launcher/app icon source — maskable (has built-in safe-zone padding).
SRC = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\public\icon-maskable-512x512.png"
RES = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\android\app\src\main\res"

SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

src = Image.open(SRC).convert("RGBA")

def square(img):
    w, h = img.size
    s = min(w, h)
    return img.crop(((w-s)//2, (h-s)//2, (w-s)//2+s, (h-s)//2+s))

base = square(src)

def make_round(img, size):
    img = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

for folder, sz in SIZES.items():
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    base.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"))
    make_round(base, sz).save(os.path.join(d, "ic_launcher_round.png"))
    # Maskable foreground FILLS the canvas (already padded) at 108dp = 2.25x.
    fsz = int(sz * 2.25)
    base.resize((fsz, fsz), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
    print(f"  {folder}: {sz}px launcher + round + {fsz}px foreground")

print("\nDONE. Launcher icons regenerated from MASKABLE source.")
