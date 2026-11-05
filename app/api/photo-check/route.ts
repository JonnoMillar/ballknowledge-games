import { readFile, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * Dev only: Jonno's checks on the photo pipeline's cutouts (scripts/photos, docs/photo-pipeline.md).
 * All of it lives in .scratch/photo-all and is read by the pipeline:
 *  - marks.json `wrong`: ids marked wrong in the /photo-check grid. `flagged`: ids flagged with the
 *    "wrong photo" button on a card while playing.
 *  - approved.json: ids whose cutout he has checked and accepted ("Approve the rest" on /photo-check).
 *    Only approved cutouts, and ones he picks on /photo-pick, ship (publish.py).
 *  - choices.json (from /photo-pick): {id: alternative number | 'kit'}.
 */
const DIR = '.scratch/photo-all';
const FILE = `${DIR}/marks.json`;
const CHOICES = `${DIR}/choices.json`;
const APPROVED = `${DIR}/approved.json`;
interface Marks { wrong: string[]; flagged: string[] }
type Choices = Record<string, number | 'kit'>;

const read = (): Promise<Marks> => readFile(FILE, 'utf8').then((s) => JSON.parse(s) as Marks).catch(() => ({ wrong: [], flagged: [] }));
const readChoices = (): Promise<Choices> => readFile(CHOICES, 'utf8').then((s) => JSON.parse(s) as Choices).catch(() => ({}));
const readApproved = (): Promise<string[]> => readFile(APPROVED, 'utf8').then((s) => JSON.parse(s) as string[]).catch(() => []);
const isId = (v: unknown): v is string => typeof v === 'string' && /^Q\d+$/.test(v);
const dev = () => process.env.NODE_ENV === 'development';

export async function GET() {
  if (!dev()) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ ...(await read()), choices: await readChoices(), approved: await readApproved() });
}

export async function POST(req: Request) {
  if (!dev()) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { wrong?: unknown; flag?: unknown; approve?: unknown; pick?: { id?: unknown; value?: unknown } };
  if (Array.isArray(body.approve)) {
    const approved = new Set(await readApproved());
    for (const id of body.approve.filter(isId)) approved.add(id);
    await writeFile(APPROVED, JSON.stringify([...approved]));
    return NextResponse.json({ approved: approved.size });
  }
  if (body.pick && isId(body.pick.id)) {
    const choices = await readChoices();
    const v = body.pick.value;
    if (v === 'kit' || (typeof v === 'number' && v >= 0 && v < 3)) choices[body.pick.id] = v;
    else delete choices[body.pick.id];
    await writeFile(CHOICES, JSON.stringify(choices));
    return NextResponse.json({ choices });
  }
  const marks = await read();
  if (Array.isArray(body.wrong)) marks.wrong = body.wrong.filter(isId);
  if (isId(body.flag) && !marks.flagged.includes(body.flag)) marks.flagged.push(body.flag);
  await writeFile(FILE, JSON.stringify(marks));
  return NextResponse.json(marks);
}
