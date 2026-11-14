"""Zero-shot check that a cutout shows a footballer in a shirt, not a suit, a mural, a podium.

Usage: python clipcheck.py <dir> [id,id,...]
Scores <dir>/out/<id>.<k>.webp that <dir>/clip.json does not have yet; writes
{"<id>.<k>": {"kit": p, "top": label}} where kit is CLIP's probability for the football-shirt prompts.
CLIP ViT-B/32 (free, local, ~0.1 s a crop on CPU), run as its own pass so the cutout processes stay small.
"""
import json, sys
from pathlib import Path
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

D = Path(sys.argv[1])
KIT = ['a footballer in a football shirt', 'a footballer in a team jersey with a badge', 'a soccer player in kit']
OTHER = ['a man in a suit and tie', 'a man in a jacket and casual clothes', 'a painting or mural of a person',
         'a wax figure or statue', 'a person speaking on stage at a podium with a microphone',
         'a man in a t-shirt holding a sign', 'a football manager in a coat', 'a drawing or cartoon']
PROMPTS = KIT + OTHER

def feats(out):
    """transformers 5 returns an output object from get_*_features; older versions a tensor."""
    return out if torch.is_tensor(out) else out.pooler_output

def main():
    model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32').eval()
    proc = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
    store = D / 'clip.json'
    done = json.loads(store.read_text()) if store.exists() else {}
    only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    files = [f for f in sorted((D / 'out').glob('*.webp')) if f.stem not in done and (not only or f.stem.split('.')[0] in only)]
    with torch.no_grad():
        text = proc(text=PROMPTS, return_tensors='pt', padding=True)
        t = feats(model.get_text_features(**text))
        t = t / t.norm(dim=-1, keepdim=True)
        for n in range(0, len(files), 16):
            batch = files[n:n + 16]
            ims = []
            for f in batch:
                im = Image.open(f).convert('RGBA')
                bg = Image.new('RGBA', im.size, (128, 128, 128, 255))
                ims.append(Image.alpha_composite(bg, im).convert('RGB'))
            v = feats(model.get_image_features(**proc(images=ims, return_tensors='pt')))
            v = v / v.norm(dim=-1, keepdim=True)
            p = (100 * v @ t.T).softmax(-1)
            for f, row in zip(batch, p):
                done[f.stem] = {'kit': round(float(row[:len(KIT)].sum()), 3), 'top': PROMPTS[int(row.argmax())]}
            store.write_text(json.dumps(done))
            print(n + len(batch), '/', len(files), flush=True)

if __name__ == '__main__':
    main()
