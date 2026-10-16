import type { NextConfig } from 'next';

const config: NextConfig = {
  // A production build into the directory `next dev` is serving from replaces
  // the dev output and kills the running server. Set NEXT_DIST_DIR to check a
  // production build without taking the dev server down with it.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // tsconfig includes .next/types, so a side-by-side build type-checks against
  // the dev server's stale generated types and fails on them. `npm run
  // typecheck` covers the same ground and is the check that matters.
  typescript: { ignoreBuildErrors: Boolean(process.env.NEXT_DIST_DIR) },
  // data/pool.json is ~3 MB and read by the page. Fine for a prototype;
  // revisit before shipping (trim fields, or serve it as a static asset).
  experimental: { largePageDataBytes: 8 * 1024 * 1024 },
  // The server reads its data with readFile at runtime, which file tracing
  // cannot see. Without this a serverless deploy builds cleanly and then
  // fails every request with ENOENT.
  outputFileTracingIncludes: {
    '/**': [
      './data/pool.json',
      './data/clubs.json',
      './data/images.json',
      './data/portraits.json',
      './data/credits.json',
      './content/chains/*.json',
      './content/puzzles/*.json',
      './games/pin/data/packs/*.json',
      './games/itk/data/days.json',
      './games/step/data/days.json',
      './games/season-line/data/*.json',
    ],
  },
};

export default config;
