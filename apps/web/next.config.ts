import path from 'node:path';
import type { NextConfig } from 'next';

const raiz = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: raiz,
  serverExternalPackages: ['@prisma/client', 'argon2', 'exceljs', 'pdfmake'],
  // La API (NestJS) corre como función de Vercel y no se empaqueta con webpack.
  webpack(config, { isServer }) {
    if (isServer) config.externals.push({ api: 'commonjs api' });
    return config;
  },
  outputFileTracingIncludes: {
    '/api/[...ruta]': [
      '../../apps/api/dist/**',
      '../../apps/api/package.json',
      '../../packages/shared/dist/**',
      '../../packages/shared/package.json',
      '../../packages/shared/seed/**',
      '../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**',
      '../../node_modules/.pnpm/@nestjs+*/node_modules/**',
      '../../node_modules/.pnpm/argon2*/node_modules/argon2/**',
      '../../node_modules/.pnpm/pdfmake*/node_modules/pdfmake/build/**',
    ],
  },
};

export default nextConfig;
