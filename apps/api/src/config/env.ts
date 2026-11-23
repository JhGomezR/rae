import { existsSync } from 'node:fs';
import { z } from 'zod';

if (existsSync('.env')) process.loadEnvFile('.env');

/** Supabase en Vercel puede crear las variables con un prefijo personalizado. */
function buscarUrl(sufijo: string): string | undefined {
  const clave = Object.keys(process.env).find((k) => k === sufijo || k.endsWith(`_${sufijo}`));
  return clave ? process.env[clave] : undefined;
}

process.env.DATABASE_URL ||= conPgbouncer(buscarUrl('PRISMA_URL'));
process.env.DIRECT_URL ||= buscarUrl('URL_NON_POOLING') ?? process.env.DATABASE_URL;

/** El pooler de Supabase (puerto 6543) exige este parámetro en Prisma. */
function conPgbouncer(url: string | undefined): string | undefined {
  if (!url || !url.includes(':6543') || url.includes('pgbouncer=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`;
}

const dominioVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const urlPorDefecto = dominioVercel ? `https://${dominioVercel}` : 'http://localhost:3000';

const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

const esquema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_URL: z.string().url().default(urlPorDefecto),
  DATABASE_URL: z.string().min(10),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_MINUTOS: z.coerce.number().int().positive().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleano.default(process.env.VERCEL ? 'true' : 'false'),
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_DOCUMENTO: z
    .string()
    .regex(/^\d{5,20}$/)
    .optional(),
  ADMIN_CLAVE_INICIAL: z.string().min(8).optional(),
  ADMIN_NOMBRE: z.string().default('Administrador'),
  MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Seguimiento RAE <no-responder@localhost>'),
});

// Una variable vacía en el panel equivale a no definirla.
const definidas = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));

export const env = esquema.parse(definidas);
