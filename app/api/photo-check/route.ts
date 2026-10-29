import { readFile, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * Dev only: Jonno's marks on the photo pipeline's cutouts (scripts/photos, docs/photo-pipeline.md).
 * `wrong`: ids marked wrong in the /photo-check grid. `flagged`: ids flagged with the "wrong photo"
 * button on a card while playing. Both live in .scratch/photo-all/marks.json, read by the pipeline.
 * `choices` (from /photo-pick): {id: alternative number | 'kit'}, in .scratch/photo-all/choices.json,
 * read by publish.py.
 */
const FILE = '.scratch/photo-all/marks.json';
const CHOICES = '.scratch/photo-all/choices.json';
interface Marks { wrong: string[]; flagged: string[] }
type Choices = Record<string, number | 'kit'>;

const read = (): Promise<Marks> => readFile(FILE, 'utf8').then((s) => JSON.parse(s) as Marks).catch(() => ({ wrong: [], flagged: [] }));
const readChoices = (): Promise<Choices> => readFile(CHOICES, 'utf8').then((s) => JSON.parse(s) as Choices).catch(() => ({}));
const isId = (v: unknown): v is string => typeof v === 'string' && /^Q\d+$/.test(v);
const dev = () => process.env.NODE_ENV === 'development';

export async function GET() {
  if (!dev()) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ ...(await read()), choices: await readChoices() });
}

export async function POST(req: Request) {
  if (!dev()) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { wrong?: unknown; flag?: unknown; pick?: { id?: unknown; value?: unknown } };
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
