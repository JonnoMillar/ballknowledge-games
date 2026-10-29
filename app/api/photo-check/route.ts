import { readFile, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * Dev only: Jonno's marks on the photo pipeline's cutouts (scripts/photos, docs/photo-pipeline.md).
 * `wrong`: ids marked wrong in the /photo-check grid. `flagged`: ids flagged with the "wrong photo"
 * button on a card while playing. Both live in .scratch/photo-all/marks.json, read by the pipeline.
 */
const FILE = '.scratch/photo-all/marks.json';
interface Marks { wrong: string[]; flagged: string[] }

const read = (): Promise<Marks> => readFile(FILE, 'utf8').then((s) => JSON.parse(s) as Marks).catch(() => ({ wrong: [], flagged: [] }));
const isId = (v: unknown): v is string => typeof v === 'string' && /^Q\d+$/.test(v);
const dev = () => process.env.NODE_ENV === 'development';

export async function GET() {
  if (!dev()) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await read());
}

export async function POST(req: Request) {
  if (!dev()) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { wrong?: unknown; flag?: unknown };
  const marks = await read();
  if (Array.isArray(body.wrong)) marks.wrong = body.wrong.filter(isId);
  if (isId(body.flag) && !marks.flagged.includes(body.flag)) marks.flagged.push(body.flag);
  await writeFile(FILE, JSON.stringify(marks));
  return NextResponse.json(marks);
}
