import type { NextConfig } from 'next';

const config: NextConfig = {
  // data/pool.json is ~3 MB and read by the page. Fine for a prototype;
  // revisit before shipping (trim fields, or serve it as a static asset).
  experimental: { largePageDataBytes: 8 * 1024 * 1024 },
};

export default config;
