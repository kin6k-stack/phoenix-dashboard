"""Generate Android launcher icons from a single source PNG.
Produces ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png
at all required mipmap densities, plus a solid background color resource.
"""
from PIL import Image, ImageDraw
import os

SRC = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\public\icon-512x512.png"
RES = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\android\app\src\main\res"

# Android launcher icon sizes per density (px) for the standard 48dp icon.
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
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def make_foreground(img, size):
    # Adaptive-icon foreground: Android crops to ~66% center, so pad the logo
    # into the middle ~60% of a transparent canvas at 108dp-equivalent.
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.60)
    logo = img.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(logo, (off, off), logo)
    return canvas

for folder, sz in SIZES.items():
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    # square launcher
    base.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"))
    # round launcher
    make_round(base, sz).save(os.path.join(d, "ic_launcher_round.png"))
    # adaptive foreground (108dp ≈ 2.25x the 48dp base, so scale up)
    fsz = int(sz * 2.25)
    make_foreground(base, fsz).save(os.path.join(d, "ic_launcher_foreground.png"))
    print(f"  {folder}: {sz}px launcher + round + {fsz}px foreground")

# Adaptive icon background color (a dark Phoenix tone). Write the color + the
# adaptive XML so the foreground sits on a consistent backdrop.
values = os.path.join(RES, "values")
os.makedirs(values, exist_ok=True)
with open(os.path.join(values, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#08090c</color>\n'
            '</resources>\n')

# Adaptive icon definitions (v26) referencing background color + foreground.
anydpi = os.path.join(RES, "mipmap-anydpi-v26")
os.makedirs(anydpi, exist_ok=True)
adaptive = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
            '</adaptive-icon>\n')
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(anydpi, name), "w", encoding="utf-8") as f:
        f.write(adaptive)

print("\nDONE. Icons generated for all densities + adaptive icon config.")
