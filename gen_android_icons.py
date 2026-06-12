"""Restore the ORIGINAL launcher icons: source = icon-512x512.png, with the
adaptive foreground padded to ~60% center (the version peers preferred).
"""
from PIL import Image, ImageDraw
import os

SRC = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\public\icon-512x512.png"
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

def make_foreground(img, size):
    # Original look: logo at ~60% center of a transparent canvas.
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.60)
    logo = img.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(logo, (off, off), logo)
    return canvas

for folder, sz in SIZES.items():
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    base.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"))
    make_round(base, sz).save(os.path.join(d, "ic_launcher_round.png"))
    fsz = int(sz * 2.25)
    make_foreground(base, fsz).save(os.path.join(d, "ic_launcher_foreground.png"))
    print(f"  {folder}: {sz}px launcher + round + {fsz}px padded foreground")

print("\nDONE. Original launcher icons restored from icon-512x512.png.")
