"""Check img/fs-icon.svg against the generated original and export its PNGs.

    python design-drafts/brand-concepts/icon_diff.py

Renders the SVG in Chrome (Playwright), places it where the tile sits in
img/round3/fs-think-pick.png (cream margin behind), snaps both images to the
three palette colours and reports the fraction of pixels that differ. Writes
the heatmap to img/round3/fs-icon-diff.png (mismatches in blue on a faint grey
copy of the source) and the PNGs to img/fs-icon/. The source PNG is
gitignored: copy it in first if it is missing.
"""
import base64, io, pathlib
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).parent / 'img'
CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
# Where the 420-unit tile lands in the 508 px source (fitted by the redraw).
OX, OY, SX, SY = 36.125, 61.625, 0.99638, 1.00769
PALETTE = np.array([[245, 175, 62], [252, 245, 232], [25, 33, 42]], float)  # sampled from the source
SIZES = (1024, 512, 180, 64, 32, 16)

RENDER = """async ({svg, w, h}) => {
  const u = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  const im = new Image(); im.src = u; await im.decode();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(im, 0, 0, w, h);
  return c.toDataURL('image/png').split(',')[1];
}"""


def labels(a):
    return ((a[:, :, None, :] - PALETTE) ** 2).sum(-1).argmin(-1)


def main():
    svg = (HERE / 'fs-icon.svg').read_text()
    inner = svg[svg.index('>') + 1:svg.rindex('</svg>')]
    placed = ('<svg xmlns="http://www.w3.org/2000/svg" width="508" height="508" viewBox="0 0 508 508">'
              '<rect width="508" height="508" fill="#FBF6EA"/>'
              f'<g transform="translate({OX} {OY}) scale({SX} {SY})">{inner}</g></svg>')
    with sync_playwright() as pw:
        page = pw.chromium.launch(executable_path=CHROME).new_page()
        render = lambda s, n: Image.open(io.BytesIO(base64.b64decode(page.evaluate(RENDER, dict(svg=s, w=n, h=n)))))
        out = np.asarray(render(placed, 508).convert('RGB')).astype(float)
        (HERE / 'fs-icon').mkdir(exist_ok=True)
        for n in SIZES:
            sized = svg.replace('width="420" height="420"', f'width="{n}" height="{n}"', 1)
            render(sized, n).save(HERE / 'fs-icon' / f'fs-icon-{n}.png')
    src = np.asarray(Image.open(HERE / 'round3' / 'fs-think-pick.png').convert('RGB')).astype(float)
    miss = labels(src) != labels(out)
    print(f'mismatch {miss.mean() * 100:.3f}% ({miss.sum()} of {miss.size} px)')
    heat = np.repeat(255 - (255 - src.mean(-1, keepdims=True)) * 0.25, 3, -1)
    heat[miss] = [31, 95, 208]
    Image.fromarray(heat.astype(np.uint8)).save(HERE / 'round3' / 'fs-icon-diff.png')


if __name__ == '__main__':
    main()
