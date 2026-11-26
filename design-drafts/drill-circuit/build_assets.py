"""Bake the Higgsfield art into low-res pixel assets for the preview page.

Outputs assets.js (data URIs), so index.html works opened straight from disk:
canvas reads of file:// images are blocked, data URIs are not.

Density is the short side of the game canvas in game pixels (S). The wide
scene is S*16/9 x S, the portrait scene S x S*3/2, and the trainee stands
SPRITE_FRAC * S tall, so both layouts share one pixel size per density.
"""
import base64, io, json
from pathlib import Path
from PIL import Image

ART = Path(__file__).parent / "art"
OUT = Path(__file__).parent / "assets.js"
DENSITIES = [144, 180, 225, 270]
SPRITE_FRAC = 0.34
POSES = ["idle", "kick", "header", "celebrate"]
ALPHA_CUT = 140


def uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def scene(name, w, h):
    im = Image.open(ART / f"scene-{name}.png").convert("RGB")
    im = im.resize((w, h), Image.BOX)
    return im.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")


def poses():
    ims = {p: Image.open(ART / f"trainee-{p}.png").convert("RGBA") for p in POSES}
    # cut the soft glow first so it does not widen the box
    for p, im in ims.items():
        a = im.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0)
        im.putalpha(a)
    boxes = [im.getbbox() for im in ims.values()]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes))
    ground = ims["idle"].getbbox()[3]  # feet of the standing pose
    return {p: im.crop(union) for p, im in ims.items()}, union, ground


def main():
    crops, union, ground = poses()
    idle_h = ground - crops["idle"].getbbox()[1] - union[1]  # standing height in source px
    data = {"densities": DENSITIES, "sets": {}}
    for s in DENSITIES:
        k = (SPRITE_FRAC * s) / idle_h            # source px -> game px
        cw, ch = round(crops["idle"].width * k), round(crops["idle"].height * k)
        sprites = {}
        for p, im in crops.items():
            sm = im.resize((cw, ch), Image.BOX)
            a = sm.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
            rgb = sm.convert("RGB").quantize(colors=24, method=Image.MEDIANCUT,
                                             dither=Image.NONE).convert("RGB")
            rgb.putalpha(a)
            sprites[p] = uri(rgb)
        data["sets"][s] = {
            "wide": uri(scene("wide", round(s * 16 / 9), s)),
            "portrait": uri(scene("portrait", s, round(s * 1.5))),
            "sprites": sprites,
            "spriteW": cw, "spriteH": ch,
            "groundFromTop": round((ground - union[1]) * k),  # feet line inside sprite
        }
    raw = {f"pose_{p}": uri(Image.open(ART / f"trainee-{p}.png").convert("RGBA").resize((256, 256), Image.BOX))
           for p in POSES}
    data["raw"] = raw
    OUT.write_text("window.ART=" + json.dumps(data) + ";\n", encoding="utf-8")
    print("wrote", OUT.name, round(OUT.stat().st_size / 1024), "KB")
    for s in DENSITIES:
        d = data["sets"][s]
        print(s, "sprite", d["spriteW"], "x", d["spriteH"], "ground", d["groundFromTop"])


if __name__ == "__main__":
    main()
