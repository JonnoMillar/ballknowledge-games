"""Builds the effect images for the brand-concepts preview.

Reads approved cutouts from the photo-pipeline worktree's scratch folder and
writes treated PNGs plus face boxes to img/ (gitignored: Commons photos, credit
before any public use). Run: python -X utf8 design-drafts/brand-concepts/build.py
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', '.claude', 'worktrees',
                                    'photo-pipeline-1d882c', '.scratch', 'photo-all'))
OUT = os.path.join(HERE, 'img')
YUNET = os.path.join(SRC, '..', 'models', 'yunet.onnx')

PLAYERS = {
    'yamal': 'Q113704154', 'mbappe': 'Q21621995', 'bellingham': 'Q66241169',
    'haaland': 'Q28967995', 'saka': 'Q59306386', 'salah': 'Q1354960',
    'vinicius': 'Q28973866', 'musiala': 'Q96072055', 'nico': 'Q104414736',
    'olise': 'Q62050484', 'son': 'Q439722', 'neymar': 'Q142794', 'wirtz': 'Q94699949',
}

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def face_box(im):
    bgr = cv2.cvtColor(np.array(im.convert('RGB')), cv2.COLOR_RGB2BGR)
    det = cv2.FaceDetectorYN.create(YUNET, '', (bgr.shape[1], bgr.shape[0]), 0.6)
    _, faces = det.detect(bgr)
    if faces is None: return None
    x, y, w, h = faces[0][:4]
    W, H = im.size
    return [round(float(v), 4) for v in (x / W, y / H, w / W, h / H)]

def lum(im):
    return np.asarray(im.convert('L'), dtype=np.float32) / 255.0

def lum_norm(im):
    """Luminance stretched over the figure only, then local contrast (CLAHE).

    Without this, dark skin goes to solid dots and light skin to blank paper.
    """
    g = np.asarray(im.convert('L'))
    A = np.asarray(im.split()[-1]) > 128
    lo, hi = np.percentile(g[A], (3, 97))
    g = np.clip((g.astype(np.float32) - lo) / max(1, hi - lo), 0, 1)
    g = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(6, 6)).apply((g * 255).astype('uint8'))
    return g.astype(np.float32) / 255.0

def halftone(im, ink, cell=7, scale=3, light=False):
    """Real halftone: one dot per cell, area tracks darkness, clipped to the cutout."""
    W, H = im.size
    L = lum_norm(im); A = np.asarray(im.split()[-1], dtype=np.float32) / 255.0
    big = Image.new('RGBA', (W * scale, H * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    for cy in range(0, H, cell):
        for cx in range(0, W, cell):
            a = A[cy:cy + cell, cx:cx + cell].mean()
            if a < 0.3: continue
            dark = L[cy:cy + cell, cx:cx + cell].mean() if light else 1 - L[cy:cy + cell, cx:cx + cell].mean()
            r = (cell / 2) * 1.35 * np.sqrt(dark) * scale
            if r < 0.6 * scale: continue
            px, py = (cx + cell / 2) * scale, (cy + cell / 2) * scale
            d.ellipse((px - r, py - r, px + r, py + r), fill=hexrgb(ink) + (255,))
    out = big.resize((W, H), Image.LANCZOS)
    alpha = Image.fromarray((np.asarray(out.split()[-1], dtype=np.float32) * A).astype('uint8'))
    out.putalpha(alpha)
    return out

def duotone(im, dark, light, gamma=1.0):
    L = lum(im) ** gamma
    d, l = np.array(hexrgb(dark), np.float32), np.array(hexrgb(light), np.float32)
    rgb = d + (l - d) * L[..., None]
    out = Image.fromarray(rgb.astype('uint8'), 'RGB').convert('RGBA')
    out.putalpha(im.split()[-1]); return out

def photocopy(im, ink='#111111'):
    """High-contrast photocopy: hard threshold with grain, ink on transparent."""
    L = lum_norm(im)
    L = cv2.GaussianBlur(L, (0, 0), 0.8)
    rng = np.random.default_rng(7)
    ink_mask = (L + rng.normal(0, 0.06, L.shape)) < 0.45
    A = np.asarray(im.split()[-1]) > 128
    out = np.zeros(L.shape + (4,), np.uint8)
    out[..., :3] = hexrgb(ink)
    out[..., 3] = (ink_mask & A) * 255
    return Image.fromarray(out, 'RGBA')

def glow(im):
    """Luminous ghost: the figure as light, with bloom."""
    A = im.split()[-1]
    core = Image.new('RGBA', im.size, (255, 255, 255, 0)); core.putalpha(A)
    pad = 60
    canvas = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (255, 255, 255, 0))
    canvas.alpha_composite(core, (pad, pad))
    bloom = canvas.filter(ImageFilter.GaussianBlur(26))
    bloom2 = canvas.filter(ImageFilter.GaussianBlur(8))
    out = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    for layer in (bloom, bloom, bloom2, canvas):
        out.alpha_composite(layer)
    return out

def pixelate_face(im, box, blocks=7):
    if not box: return im
    W, H = im.size
    x, y, w, h = box
    pad = 0.18
    x0, y0 = int((x - w * pad) * W), int((y - h * pad) * H)
    x1, y1 = int((x + w * (1 + pad)) * W), int((y + h * (1 + pad)) * H)
    region = im.crop((x0, y0, x1, y1))
    small = region.resize((blocks, max(1, round(blocks * (y1 - y0) / (x1 - x0)))), Image.BILINEAR)
    region = small.resize(region.size, Image.NEAREST)
    out = im.copy(); out.paste(region, (x0, y0)); return out

def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for key, qid in PLAYERS.items():
        im = Image.open(os.path.join(SRC, 'out', qid + '.0.webp')).convert('RGBA')
        box = face_box(im)
        meta[key] = {'face': box}
        im.save(os.path.join(OUT, f'{key}.png'))
        halftone(im, '#14213D', cell=5).save(os.path.join(OUT, f'{key}-ht-navy.png'))
        halftone(im, '#141210', cell=6).save(os.path.join(OUT, f'{key}-ht-ink.png'))
        halftone(im, '#FFFFFF', cell=6, light=True).save(os.path.join(OUT, f'{key}-ht-white.png'))
        duotone(im, '#2A1B12', '#F3E6CC', 0.9).save(os.path.join(OUT, f'{key}-duo-sepia.png'))
        duotone(im, '#0B1E5B', '#FFC93C', 1.1).save(os.path.join(OUT, f'{key}-duo-blueyellow.png'))
        duotone(im, '#1B1035', '#B9A4FF', 1.0).save(os.path.join(OUT, f'{key}-duo-night.png'))
        photocopy(im).save(os.path.join(OUT, f'{key}-copy.png'))
        glow(im).save(os.path.join(OUT, f'{key}-glow.png'))
        pixelate_face(im, box).save(os.path.join(OUT, f'{key}-pixel.png'))
        print(key, box)
    with open(os.path.join(OUT, 'meta.json'), 'w') as f: json.dump(meta, f, indent=1)

if __name__ == '__main__':
    main()
