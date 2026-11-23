import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // En producción el proxy envía /api a la API; en desarrollo lo hace Next.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [{ source: '/api/:ruta*', destination: 'http://localhost:4000/api/:ruta*' }];
  },
};

export default nextConfig;
