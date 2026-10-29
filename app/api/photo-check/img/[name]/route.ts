import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/** Dev only: a cutout from the photo pipeline's scratch folder, e.g. Q615.0.webp. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (process.env.NODE_ENV !== 'development' || !/^Q\d+\.\d\.webp$/.test(name)) return new NextResponse(null, { status: 404 });
  const bytes = await readFile(`.scratch/photo-all/out/${name}`).catch(() => null);
  return bytes ? new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' } }) : new NextResponse(null, { status: 404 });
}
