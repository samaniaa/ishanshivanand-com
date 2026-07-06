#!/usr/bin/env python3
"""
Build the day-engine mountain masks from a photograph.

Input:  a wide mountain panorama with sky above a clear horizon line
        (current source: "Snowy Annapurna Range - panorama.jpg",
        Wikimedia Commons, CC0).
Output: public/assets/img/range-alpha.png  (mountain cutout, alpha)
        public/assets/img/range-snow.png   (snow-only alpha, feathered,
                                            carrying the photo's texture)

The site fills these masks with day-engine palette variables, so the
photo's real ridgeline and snowfields carry the changing light.

Usage: python3 tools/make-range.py <source.jpg>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else 'annapurna.jpg'
OUT_W = 2200

im = Image.open(SRC).convert('RGB')
w, h = im.size
px = np.asarray(im).astype(np.float32) / 255.0
lum = 0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]

# ---- horizon detection: first sustained high-texture row per column ----
gy, gx = np.gradient(lum)
grad = np.hypot(gx, gy)
# smooth the gradient map a little to ignore film grain / faint clouds
grad_img = Image.fromarray((np.clip(grad * 8, 0, 1) * 255).astype(np.uint8))
grad_s = np.asarray(grad_img.filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0

TEXTURE_T = 0.10   # what counts as "mountain texture"
SUSTAIN = 14       # rows of sustained texture required (clouds fail this)

horizon = np.full(w, h - 1, dtype=int)
for x in range(w):
    col = grad_s[:, x]
    run = 0
    for y in range(int(h * 0.05), h):
        if col[y] > TEXTURE_T:
            run += 1
            if run >= SUSTAIN:
                horizon[x] = y - SUSTAIN
                break
        else:
            run = 0

# smooth the horizon and forbid wild jumps (cloud hits): a narrow
# median for fidelity, clamped against a wide median so isolated cloud
# spikes (tall, thin) cannot pull the horizon into the sky.
def running_median(arr, K):
    out = np.copy(arr)
    for x in range(w):
        a = max(0, x - K)
        b = min(w, x + K)
        out[x] = np.median(arr[a:b])
    return out

narrow = running_median(horizon, 31)
wide = running_median(horizon, 141)
horizon = np.maximum(narrow, wide - 30)

# ---- masks --------------------------------------------------------------
yy = np.arange(h)[:, None]
mountain = (yy >= horizon[None, :]).astype(np.float32)

# feather the cutline slightly so the edge is not aliased
alpha_img = Image.fromarray((mountain * 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(1.2)
)

# snow: bright, low-saturation pixels inside the mountain area.
mx = px.max(axis=2)
mn = px.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1e-4)
snow_strength = np.clip((lum - 0.55) / 0.35, 0, 1) * np.clip((0.28 - sat) / 0.28, 0, 1)
snow = snow_strength * mountain
snow_img = Image.fromarray((np.clip(snow, 0, 1) * 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(1.0)
)

# ---- crop to the band the site uses and export --------------------------
top = max(int(horizon.min()) - int(h * 0.04), 0)
band = (0, top, w, h)
alpha_img = alpha_img.crop(band)
snow_img = snow_img.crop(band)

scale = OUT_W / alpha_img.width
size = (OUT_W, int(alpha_img.height * scale))
alpha_img = alpha_img.resize(size, Image.LANCZOS)
snow_img = snow_img.resize(size, Image.LANCZOS)

# store as alpha-only images (white with alpha channel); WebP keeps the
# textured snow mask small.
def as_alpha(img):
    a = img.convert('L')
    out = Image.new('RGBA', a.size, (255, 255, 255, 0))
    out.putalpha(a)
    return out

as_alpha(alpha_img).save('public/assets/img/range-alpha.webp', quality=85)
as_alpha(snow_img).save('public/assets/img/range-snow.webp', quality=82)
print('wrote range-alpha.webp + range-snow.webp', size)
