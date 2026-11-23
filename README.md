# Seguimiento Curricular RAE

Mide el **nivel de apreciación** (inicio de semestre) y el **nivel de alcance** (fin de semestre) de los resultados de aprendizaje, por curso, para docentes y estudiantes. El administrador consulta resultados, exporta las matrices y sigue el plan de mejoramiento (características 18–24 del PEP).

## Stack

Monorepo pnpm · Next.js 15 · NestJS 11 como función de Vercel · Prisma 6 · PostgreSQL (Supabase).

## Despliegue en Vercel

1. Importa este repositorio y define **Root Directory** = `apps/web`.
2. Conecta la base de datos de Supabase al proyecto. Las variables `POSTGRES_*` se detectan solas, con o sin prefijo.
3. En **Settings → Environment Variables** agrega:

| Variable                                                        | Valor                                               | Obligatoria |
| --------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| `JWT_ACCESS_SECRET`                                             | Texto aleatorio de al menos 32 caracteres           | Sí          |
| `CRON_SECRET`                                                   | Texto aleatorio de al menos 16 caracteres           | Sí          |
| `ADMIN_DOCUMENTO`                                               | Cédula del administrador                            | Sí          |
| `ADMIN_CLAVE_INICIAL`                                           | Mínimo 8 caracteres; se cambia en el primer ingreso | Sí          |
| `ADMIN_NOMBRE`                                                  | Nombre visible                                      | No          |
| `APP_URL`                                                       | Dominio propio, si lo tienes                        | No          |
| `MAIL_TRANSPORT`                                                | `log` (no envía) o `smtp`                           | No          |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Cuenta de correo                                    | Con `smtp`  |

4. Despliega. El build de producción aplica las migraciones y carga el currículo; las vistas previas no modifican la base de datos.
5. Entra como administrador, importa el consolidado y abre el momento en **Panel**.

Los recordatorios corren una vez al día (7:00 a. m., Colombia). En **Correos** se pueden enviar en cualquier momento.

## Desarrollo local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter api exec prisma migrate deploy
pnpm dev
```
