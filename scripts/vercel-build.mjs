/* Build de Vercel: compila todo y, solo en producción, migra y siembra la base de datos. */
import { execSync } from 'node:child_process';

const buscar = (sufijo) => {
  const clave = Object.keys(process.env).find((k) => k === sufijo || k.endsWith(`_${sufijo}`));
  return clave ? process.env[clave] : undefined;
};
const correr = (comando, env = process.env) => execSync(comando, { stdio: 'inherit', env });

/** El pooler de Supabase (puerto 6543) exige este parámetro en Prisma. */
function conPgbouncer(url) {
  if (!url || !url.includes(':6543') || url.includes('pgbouncer=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`;
}

const pooled = process.env.DATABASE_URL || conPgbouncer(buscar('PRISMA_URL'));
const directa = process.env.DIRECT_URL || buscar('URL_NON_POOLING') || pooled;
// Solo nombres, nunca valores: permite diagnosticar el build desde el log.
const nombresBd = Object.keys(process.env).filter((k) => /_(PRISMA_URL|URL_NON_POOLING)$/.test(k));
console.log(
  `Entorno: ${process.env.VERCEL_ENV ?? 'local'} · Variables de BD: ${nombresBd.join(', ') || 'ninguna'}`,
);
if (!pooled) {
  throw new Error(
    `Falta la base de datos en el entorno "${process.env.VERCEL_ENV ?? 'local'}": conecta Supabase a ese entorno en Vercel.`,
  );
}
const conBd = { ...process.env, DATABASE_URL: pooled, DIRECT_URL: directa };

if (process.env.VERCEL_ENV === 'production') {
  const faltan = [
    'JWT_ACCESS_SECRET',
    'ADMIN_DOCUMENTO',
    'ADMIN_CLAVE_INICIAL',
    'CRON_SECRET',
  ].filter((k) => !process.env[k]);
  if (faltan.length) throw new Error(`Faltan variables en Vercel: ${faltan.join(', ')}`);
  if (!/^\d{5,20}$/.test(process.env.ADMIN_DOCUMENTO)) {
    throw new Error('ADMIN_DOCUMENTO debe ser tu cédula, solo números.');
  }
}

correr('pnpm --filter api exec prisma generate', conBd);
correr('pnpm --filter @rae/shared build');
correr('pnpm --filter api build');

// Las vistas previas comparten la base de datos: nunca la modifican.
if (process.env.VERCEL_ENV === 'production') {
  correr('pnpm --filter api exec prisma migrate deploy', conBd);
  execSync('node dist/sembrar.js', {
    stdio: 'inherit',
    cwd: 'apps/api',
    env: { ...conBd, DATABASE_URL: directa },
  });
}

correr('pnpm --filter web build', conBd);
