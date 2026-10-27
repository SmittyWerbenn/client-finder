import type { NextConfig } from 'next';

// Dua mode build:
// - normal  : Node server (API routes, cookie sesi, JSON store) — `npm run build`
// - statis  : GitHub Pages — `NEXT_STATIC_EXPORT=1 NEXT_PUBLIC_DEMO=1`
//             (folder app/api + proxy.ts dibuang lebih dulu oleh workflow)
const isStaticExport = process.env.NEXT_STATIC_EXPORT === '1';
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/+$/, '') || '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStaticExport
    ? {
        output: 'export' as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
