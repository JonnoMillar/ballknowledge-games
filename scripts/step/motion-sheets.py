"""Contact sheets of /step/preview: each grade and the miss, live frames through the reveal and Next.

Usage: python scripts/step/motion-sheets.py <out dir> [Basic Decent Solid Sharp Elite Miss]
Needs a dev server; URL from STEP_PREVIEW (default http://localhost:3000/step/preview).
Python playwright + Pillow. Read the PNGs it writes: one per pick and width.
"""
import io, os, sys, time
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

URL = os.environ.get('STEP_PREVIEW', 'http://localhost:3000/step/preview')
OUT = sys.argv[1]
SIZES = [(390, 844), (1280, 800)]
PICKS = ['Basic', 'Decent', 'Solid', 'Sharp', 'Elite', 'Miss']
only = sys.argv[2:] or PICKS


def shot(page, clip, t0, frames, label=''):
    png = page.screenshot(clip=clip, animations='allow')
    frames.append((f'{label}{int((time.perf_counter() - t0) * 1000)}ms', Image.open(io.BytesIO(png)).convert('RGB')))


def sheet(frames, path, cols=8, most=32):
    if len(frames) > most:
        keep = sorted({round(i * (len(frames) - 1) / (most - 1)) for i in range(most)} | {i for i, f in enumerate(frames) if f[0].startswith('rest')})
        frames = [frames[i] for i in keep]
    w, h = frames[0][1].size
    scale = 0.36 if w > 500 else 0.5
    tw, th = int(w * scale), int(h * scale)
    rows = (len(frames) + cols - 1) // cols
    out = Image.new('RGB', (cols * tw, rows * (th + 18)), 'white')
    d = ImageDraw.Draw(out)
    for i, (lab, im) in enumerate(frames):
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        out.paste(im.resize((tw, th)), (x, y + 18))
        d.text((x + 4, y + 3), lab, fill='black')
    out.save(path)


if __name__ == "__main__":
  with sync_playwright() as p:
        b = p.chromium.launch()
        for (vw, vh) in SIZES:
            page = b.new_page(viewport={'width': vw, 'height': vh}, device_scale_factor=1)
            page.goto(URL, wait_until='networkidle')
            page.wait_for_selector('.mprev__game')
            stage = page.locator('.mprev__stage').bounding_box()
            clip = {'x': 0, 'y': stage['y'] - 10 if vw > 500 else stage['y'] - 10, 'width': vw, 'height': min(vh - stage['y'] + 10, 640)}
            if vw > 500:
                clip = {'x': stage['x'], 'y': 0, 'width': stage['width'], 'height': vh}
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
            for pick in only:
                page.get_by_role('button', name=pick, exact=True).click()
                t0 = time.perf_counter()
                frames = []
                while time.perf_counter() - t0 < 5.0:
                    shot(page, clip, t0, frames)
                    if page.locator('.step-slam:not(.is-done)').count() == 0 and time.perf_counter() - t0 > 0.5:
                        break
                shot(page, clip, t0, frames, 'rest ')
                nxt = page.get_by_role('button', name='Next', exact=True)
                nxt.click()
                t1 = time.perf_counter()
                while time.perf_counter() - t1 < 0.9:
                    shot(page, clip, t1, frames, 'next ')
                sheet(frames, f'{OUT}/{pick.lower()}-{vw}.png')
                print(vw, pick, len(frames), 'frames')
            print('errors', errors)
            page.close()
        b.close()
