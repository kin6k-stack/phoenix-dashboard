"""Generate Android splash screens from icon-512x512.png:
- centered logo on a dark background for all legacy drawable density/orientation
  folders (overwrites Capacitor's default splash.png set)
- the Android 12+ splash icon (centered, used by the splash theme)
"""
from PIL import Image
import os, glob

SRC = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\public\icon-512x512.png"
RES = r"C:\Users\MVNI\Documents\phoenix-journal-dashboard\android\app\src\main\res"
BG = (8, 9, 12, 255)   # #08090c dark Phoenix background

logo = Image.open(SRC).convert("RGBA")

def square(img):
    w, h = img.size
    s = min(w, h)
    return img.crop(((w-s)//2, (h-s)//2, (w-s)//2+s, (h-s)//2+s))

logo = square(logo)

# Splash canvas sizes (w, h) per density+orientation. The logo occupies ~35%
# of the smaller dimension, centered, on the dark background.
SPLASH = {
    "drawable":              (480, 320),
    "drawable-port-mdpi":    (320, 480),
    "drawable-port-hdpi":    (480, 800),
    "drawable-port-xhdpi":   (720, 1280),
    "drawable-port-xxhdpi":  (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi":    (480, 320),
    "drawable-land-hdpi":    (800, 480),
    "drawable-land-xhdpi":   (1280, 720),
    "drawable-land-xxhdpi":  (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

def make_splash(w, h):
    canvas = Image.new("RGBA", (w, h), BG)
    target = int(min(w, h) * 0.35)
    lg = logo.resize((target, target), Image.LANCZOS)
    canvas.paste(lg, ((w-target)//2, (h-target)//2), lg)
    return canvas

for folder, (w, h) in SPLASH.items():
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    make_splash(w, h).save(os.path.join(d, "splash.png"))
    print(f"  {folder}: {w}x{h}")

# Android 12+ splash icon — a centered icon (the system shows it on the theme
# background). Provide it as drawable/ic_splash.png at a generous size.
icon = logo.resize((432, 432), Image.LANCZOS)
canvas = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
canvas.paste(icon, (0, 0), icon)
canvas.save(os.path.join(RES, "drawable", "ic_splash.png"))
print("  drawable/ic_splash.png (Android 12+ splash icon)")

print("\nDONE. Splash screens generated from icon-512x512.png.")
