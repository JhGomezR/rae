import { existsSync } from 'node:fs';
import { z } from 'zod';

if (existsSync('.env')) process.loadEnvFile('.env');

const booleano = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const esquema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(10),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_MINUTOS: z.coerce.number().int().positive().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleano,
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

export const env = esquema.parse(process.env);
