import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * Dev only: Jonno's checks on the photo pipeline's cutouts (scripts/photos, docs/photo-pipeline.md).
 * All of it lives in .scratch/photo-all and is read by the pipeline:
 *  - marks.json `tags`: {id: [tag ids]} his confirmed tags per card (an empty list = looked, fine). Tag ids are TAGS in
 *    components/PhotoCheck.tsx. Tags in SOFT_TAGS still ship until something better is picked; every other tag blocks.
 *    `wrong`: ids with a blocking tag (plus the older untagged marks), what publish.py reads. `flagged`: ids flagged with
 *    the "wrong photo" button on a card while playing.
 *  - approved.json: ids whose cutout he has checked and accepted ("Approve the rest" on /photo-check).
 *    Only approved cutouts, and ones he picks on /photo-pick, ship (publish.py).
 *  - choices.json (from /photo-pick): {id: alternative number | 'kit'}.
 *  - Approving a batch also runs redo_marked.py: blocked cards go to the pipeline for a replacement (Bad crop alone: the same
 *    photo cropped three ways; any other blocking tag: the next candidates). Nothing ships until he picks on /photo-pick.
 *  - screen.json (scripts/photos/screen.py): the automatic suspect score and suggested tags; read-only here.
 */
const DIR = '.scratch/photo-all';
const FILE = `${DIR}/marks.json`;
const CHOICES = `${DIR}/choices.json`;
const APPROVED = `${DIR}/approved.json`;
const TAG_IDS = ['training', 'notkit', 'lowq', 'crop', 'unusable', 'better', 'nothim', 'messy', 'old'] as const;
const SOFT_TAGS = new Set<string>(['training', 'better']);
interface Marks { wrong: string[]; flagged: string[]; tags?: Record<string, string[]> }
type Choices = Record<string, number | 'kit'>;

const read = (): Promise<Marks> => readFile(FILE, 'utf8').then((s) => JSON.parse(s) as Marks).catch(() => ({ wrong: [], flagged: [] }));
const readChoices = (): Promise<Choices> => readFile(CHOICES, 'utf8').then((s) => JSON.parse(s) as Choices).catch(() => ({}));
const readApproved = (): Promise<string[]> => readFile(APPROVED, 'utf8').then((s) => JSON.parse(s) as string[]).catch(() => []);
const isId = (v: unknown): v is string => typeof v === 'string' && /^Q\d+$/.test(v);
const cleanTags = (v: unknown): string[] => (Array.isArray(v) ? TAG_IDS.filter((t) => v.includes(t)) : []);
const dev = () => process.env.NODE_ENV === 'development';

// One writer at a time: two quick clicks must not read the same file and drop one of the changes.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = queue.then(fn, fn); queue = r.catch(() => {}); return r; };

/** Set one card's tags and keep `wrong` in step: a blocking tag puts it there, clearing them takes it out. */
function setTags(marks: Marks, id: string, tags: string[]) {
  marks.tags = { ...(marks.tags ?? {}), [id]: tags };
  const blocking = tags.some((t) => !SOFT_TAGS.has(t));
  const was = marks.wrong.includes(id);
  if (blocking && !was) marks.wrong.push(id);
  if (!blocking && was) marks.wrong = marks.wrong.filter((w) => w !== id);
}

export async function GET() {
  if (!dev()) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ ...(await read()), choices: await readChoices(), approved: await readApproved() });
}

export async function POST(req: Request) {
  if (!dev()) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; tags?: unknown; flag?: unknown; approve?: unknown; approveTags?: unknown; pick?: { id?: unknown; value?: unknown } };
  return serial(async () => {
    if (Array.isArray(body.approve)) {
      // "Approve the rest": these ids ship. approveTags carries the soft tags to remember for the ones that have them.
      const approved = new Set(await readApproved());
      for (const id of body.approve.filter(isId)) approved.add(id);
      await writeFile(APPROVED, JSON.stringify([...approved]));
      if (body.approveTags && typeof body.approveTags === 'object') {
        const marks = await read();
        for (const [id, t] of Object.entries(body.approveTags as Record<string, unknown>)) if (isId(id)) setTags(marks, id, cleanTags(t));
        await writeFile(FILE, JSON.stringify(marks));
      }
      // The batch is final: queue what he blocked for its automatic fix (a re-crop of the same photo, or the next candidates).
      spawn('python', ['-X', 'utf8', 'scripts/photos/redo_marked.py', DIR], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
      return NextResponse.json({ approved: approved.size });
    }
    if (body.pick && isId(body.pick.id)) {
      const choices = await readChoices();
      const v = body.pick.value;
      if (v === 'kit' || (typeof v === 'number' && v >= 0 && v < 4)) choices[body.pick.id] = v;
      else delete choices[body.pick.id];
      await writeFile(CHOICES, JSON.stringify(choices));
      return NextResponse.json({ choices });
    }
    const marks = await read();
    if (isId(body.id) && Array.isArray(body.tags)) setTags(marks, body.id, cleanTags(body.tags));
    if (isId(body.flag) && !marks.flagged.includes(body.flag)) marks.flagged.push(body.flag);
    await writeFile(FILE, JSON.stringify(marks));
    return NextResponse.json(marks);
  });
}
