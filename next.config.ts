import type { NextConfig } from 'next';

/**
 * Aplikasi production berjalan di Node runtime (route handler, cookie sesi,
 * database). Tidak ada lagi mode static export untuk GitHub Pages.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  // File SQL migrasi dibaca saat runtime (bootstrap database) — pastikan ikut
  // ter-trace saat build production/Docker.
  outputFileTracingIncludes: {
    '/*': ['./drizzle/sqlite/*.sql', './drizzle/postgres/*.sql'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
