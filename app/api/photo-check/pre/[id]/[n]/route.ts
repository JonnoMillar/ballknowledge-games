import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/** Dev only: a candidate's preview crop (scripts/photos/preview.py), e.g. /api/photo-check/pre/Q615/3. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  if (process.env.NODE_ENV !== 'development' || !/^Q\d+$/.test(id) || !/^\d+$/.test(n)) return new NextResponse(null, { status: 404 });
  const bytes = await readFile(`.scratch/photo-all/pre/${id}/${n}.jpg`).catch(() => null);
  return bytes ? new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } }) : new NextResponse(null, { status: 404 });
}
