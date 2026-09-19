/**
 * Warm the pool when the server starts, so no request is the one that reads
 * it. See src/server/board.ts for why that matters to the page's size.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadData } = await import('./src/server/board');
  await loadData();
}
