"""Automatic rejects for a finished cutout crop (440 px RGBA) and for a Commons file's own metadata.

Jonno's sheet of 24 done cutouts was ~1 in 4 wrong, in a few repeating ways: other people or a
stray limb in the mask (Bruno Fernandes, Pogba, Van Dijk, Suarez), a mural (Rashford), a suit,
casual clothes or an event (Romario, Crespo, Villa, Xabi Alonso, Ronaldo at a podium), a ghosted
matte (Shearer). Calibrated on the 193 cutouts done on 2026-10-29: CLIP under 0.7 rejected 18, all
of them wrong (nobody good lost); edge mass over 0.05 caught Khedira, Suarez, Bruno, Hakimi,
Depay, Shearer, Xavi, Rijkaard. Pogba and Van Dijk still get through: the top 500 are checked by hand.
"""
import re
import numpy as np
import cv2

# Commons description/categories words that say the file is not a photo of him in kit. Only words
# that cannot appear in a match report ("visit", "conference" can: Chelsea visit Anfield, Conference League).
NOT_FOOTBALL = re.compile(
    r'\b(mural|graffiti|street art|statue|estatua|wax|painting|pintura|drawing|dibujo|caricature|'
    r'illustration|cartoon|sculpture|escultura|billboard|poster|press conference|rueda de prensa|'
    r'premiere|red carpet|ceremony|interview|entrevista|elkarrizketa\w*|lecture|congress|'
    r'parliament|politician|tuxedo|concert|wedding|runway)\b', re.I)

# For a player now known as a manager (Wikidata occupation), a photo from his managing years in a suit
# or a tracksuit is wanted, so these press and event words are allowed for him.
MANAGER_OK = re.compile(r'press conference|rueda de prensa|interview|entrevista|elkarrizketa\w*|ceremony', re.I)

MIN_KIT = 0.7     # CLIP's probability that the crop is a footballer in a shirt
MAX_EDGE = 0.05   # alpha in the outer columns beside the head: another person or a limb
# Laplacian variance of the subject in the 440 px crop (subject_sharpness). Set 2026-11-17 from the 480
# published cutouts: the five Jonno found too soft (Palmer 22, Figo 25, Park 28, Berbatov 39, Guardiola 47:
# small old photos upscaled) are the five lowest, then a gap to Sancho 60 (soft, acceptable); median 941.
# Of 3,551 unreviewed cutouts, 126 (3.5%) fall under it, and a sample of 40-55 was smeared.
MIN_SUBJECT_SHARP = 55

def subject_sharpness(rgba: np.ndarray) -> float:
    """Laplacian variance of the grey image over the subject (alpha > 200, eroded 2 px so the matte's
    own edge does not count). An upscaled small photo has no fine detail left and scores low."""
    m = cv2.erode((rgba[..., 3] > 200).astype(np.uint8), np.ones((5, 5), np.uint8))
    if m.sum() < 500:
        return 0.0
    lap = cv2.Laplacian(cv2.cvtColor(np.ascontiguousarray(rgba[..., :3]), cv2.COLOR_RGB2GRAY), cv2.CV_64F)
    return float(lap[m > 0].var())

def bad_metadata(text: str, manager: bool = False) -> str | None:
    for m in NOT_FOOTBALL.finditer(text):
        if not (manager and MANAGER_OK.fullmatch(m.group(0))):
            return m.group(0).lower()
    return None

def edge_mass(alpha: np.ndarray) -> float:
    """Alpha in the outer 8% columns of the upper 45% of the frame, as a share of that strip:
    a head-and-shoulders crop has air beside the head, so mass there is someone else or a limb."""
    h, w = alpha.shape
    top = alpha[: int(0.45 * h)] > 128
    k = max(int(0.08 * w), 1)
    return float((top[:, :k].mean() + top[:, -k:].mean()) / 2)

def second_faces(rgba: np.ndarray, detector) -> int:
    """Faces at least a quarter of the main one's height in the cutout (a neighbour left in the mask)."""
    alpha = rgba[..., 3:4] / 255.0
    comp = (rgba[..., :3] * alpha + 128 * (1 - alpha)).astype(np.uint8)[..., ::-1].copy()   # BGR
    h, w = comp.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(comp)
    if faces is None or not len(faces):
        return 1
    main = max(f[3] for f in faces)
    return int(sum(f[3] > 0.25 * main for f in faces))

class Clip:
    """CLIP ViT-B/32 zero-shot: how likely a crop is a footballer in a shirt rather than a suit, a mural, a podium."""
    KIT = ['a footballer in a football shirt', 'a footballer in a team jersey with a badge', 'a soccer player in kit']
    # Smart or casual clothes: a reject for a player, accepted for a manager in his managing years.
    DRESS = ['a man in a suit and tie', 'a man in a jacket and casual clothes', 'a football manager in a coat']
    OTHER = ['a painting or mural of a person', 'a wax figure or statue', 'a person speaking on stage at a podium with a microphone',
             'a man in a t-shirt holding a sign', 'a drawing or cartoon']

    def __init__(self):
        import torch
        from transformers import CLIPModel, CLIPProcessor
        self.torch = torch
        self.model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32').eval()
        self.proc = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
        with torch.no_grad():
            self.text = self._unit(self.model.get_text_features(**self.proc(text=self.KIT + self.DRESS + self.OTHER, return_tensors='pt', padding=True)))

    def _unit(self, out):
        t = out if self.torch.is_tensor(out) else out.pooler_output   # transformers 5 returns an object
        return t / t.norm(dim=-1, keepdim=True)

    def kit(self, rgba_images) -> list[tuple[float, float, str]]:
        """(probability of the kit prompts, of the dress prompts, best prompt) per PIL RGBA image."""
        from PIL import Image
        ims = []
        for im in rgba_images:
            bg = Image.new('RGBA', im.size, (128, 128, 128, 255))
            ims.append(Image.alpha_composite(bg, im.convert('RGBA')).convert('RGB'))
        with self.torch.no_grad():
            v = self._unit(self.model.get_image_features(**self.proc(images=ims, return_tensors='pt')))
            p = (100 * v @ self.text.T).softmax(-1)
        names = self.KIT + self.DRESS + self.OTHER
        k, d = len(self.KIT), len(self.KIT) + len(self.DRESS)
        return [(float(r[:k].sum()), float(r[k:d].sum()), names[int(r.argmax())]) for r in p]

def crop_verdict(rgba_img, detector, clip: 'Clip', manager: bool = False) -> tuple[str | None, dict]:
    """(reason to reject or None, measures) for a PIL RGBA crop. A manager passes in a suit or tracksuit too."""
    rgba = np.array(rgba_img.convert('RGBA'))
    sharp = subject_sharpness(rgba)
    if sharp < MIN_SUBJECT_SHARP:   # cheapest check first: no CLIP for a photo that is mush anyway
        return f'blurry (subject sharpness {sharp:.0f})', {'subj': round(sharp, 1)}
    edge = edge_mass(rgba[..., 3])
    faces = second_faces(rgba, detector)
    kit, dress, top = clip.kit([rgba_img])[0]
    m = {'edge': round(edge, 3), 'faces': faces, 'kit': round(kit, 3), 'subj': round(sharp, 1)}
    if kit + (dress if manager else 0) < MIN_KIT:
        return f'not a footballer in kit ({top})', m
    if edge > MAX_EDGE:
        return 'someone or a limb beside him', m
    if faces > 1:
        return 'a second face in the cutout', m
    return None, m
