"""Bake the Higgsfield art into low-res pixel assets for the preview page.

Outputs assets.js (data URIs), so index.html works opened straight from disk:
canvas reads of file:// images are blocked, data URIs are not.

Density is the short side of the game canvas in game pixels (S). Wide scenes
are S*16/9 x S, the portrait scene S x S*3/2, and the trainee stands
SPRITE_FRAC * S tall, so every layout shares one pixel size per density.
"""
import base64, io, json
from pathlib import Path
from PIL import Image, ImageOps

ART = Path(__file__).parent / "art"
OUT = Path(__file__).parent / "assets.js"
DENSITIES = [144, 180, 225, 270]
SPRITE_FRAC = 0.34
COACH_FRAC = 0.37            # coach is a bit taller than the kid
WIDE_SCENES = ["wide", "heading", "crossbar", "final", "end"]
CHARACTERS = {
    "trainee": (["idle", "kick", "header", "celebrate"], SPRITE_FRAC, False),
    # mirror the poses the model drew facing right, so he always faces the kid (checked by eye)
    "coach": (["idle", "whistle", "laugh", "shocked", "impressed"], COACH_FRAC, {"whistle", "shocked", "impressed"}),
}
ALPHA_CUT = 140


def uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def scene(name, w, h):
    im = Image.open(ART / f"scene-{name}.png").convert("RGB")
    im = im.resize((w, h), Image.BOX)
    return im.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")


def crops(prefix, poses, mirror):
    ims = {}
    for p in poses:
        im = Image.open(ART / f"{prefix}-{p}.png").convert("RGBA")
        im.putalpha(im.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0))  # drop soft glow
        ims[p] = ImageOps.mirror(im) if mirror and p in mirror else im
    boxes = [im.getbbox() for im in ims.values()]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes))
    ground = ims["idle"].getbbox()[3]                 # feet of the standing pose
    standing = ground - ims["idle"].getbbox()[1]      # standing height, source px
    return {p: im.crop(union) for p, im in ims.items()}, union, ground, standing


def bake(cr, union, ground, standing, frac, s):
    k = (frac * s) / standing
    cw, ch = round(cr["idle"].width * k), round(cr["idle"].height * k)
    out = {}
    for p, im in cr.items():
        sm = im.resize((cw, ch), Image.BOX)
        a = sm.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
        rgb = sm.convert("RGB").quantize(colors=24, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
        rgb.putalpha(a)
        out[p] = uri(rgb)
    return {"poses": out, "w": cw, "h": ch, "groundFromTop": round((ground - union[1]) * k)}


def main():
    chars = {name: (crops(name, poses, mirror), frac) for name, (poses, frac, mirror) in CHARACTERS.items()}
    data = {"densities": DENSITIES, "sets": {}, "raw": {}}
    for s in DENSITIES:
        sw = round(s * 16 / 9)
        entry = {"scenes": {n: uri(scene(n, sw, s)) for n in WIDE_SCENES}}
        entry["scenes"]["portrait"] = uri(scene("portrait", s, round(s * 1.5)))
        for name, ((cr, union, ground, standing), frac) in chars.items():
            entry[name] = bake(cr, union, ground, standing, frac, s)
        data["sets"][s] = entry
    for name, (poses, _, _) in CHARACTERS.items():
        data["raw"][name] = {p: uri(Image.open(ART / f"{name}-{p}.png").convert("RGBA").resize((256, 256), Image.BOX))
                             for p in poses}
    OUT.write_text("window.ART=" + json.dumps(data) + ";\n", encoding="utf-8")
    print("wrote", OUT.name, round(OUT.stat().st_size / 1024), "KB")
    for s in DENSITIES:
        e = data["sets"][s]
        print(s, "trainee", e["trainee"]["w"], "x", e["trainee"]["h"], "coach", e["coach"]["w"], "x", e["coach"]["h"])


if __name__ == "__main__":
    main()
