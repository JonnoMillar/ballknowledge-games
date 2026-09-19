/**
 * Warm the pool when the server starts, so no request is the one that reads
 * it. See src/server/board.ts for why that matters to the page's size.
 *
 * This file is compiled for the edge runtime as well, where node:fs does
 * not exist. `NEXT_RUNTIME` is a build-time constant, and Next drops the
 * branch that does not apply only when it is written as a plain `if`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { loadData } = await import('./src/server/board');
    await loadData();
  }
}
