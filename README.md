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

En **Informes** se consultan las estadísticas y se descargan en Word y PDF los formatos 021, 022 y 023 del plan de mejoramiento. Allí se registra una sola vez el responsable y, si se desea, su firma; la firma se guarda de forma privada en la base de datos y solo se incluye al marcarla.

El módulo **Plan Operativo Anual** maneja el POA del programa con el formato institucional F-PIN-001: se importa el Excel o se crea en pantalla, se registra el avance mensual de cada actividad (logro, evidencia y presupuesto ejecutado) y se compara con lo programado. Desde **Informes POA** se descarga el F-PIN-001 diligenciado en Excel, con una hoja de seguimiento, y el informe de desempeño con gráficos en Word o PDF.

Dentro del POA están los informes docentes. Los profesores de planta, ocasionales y provisionales diligencian la **Agenda** (F-DOC-056) y los de hora cátedra el **Informe de docencia** (F-DOC-047); la vinculación de cada docente se define en **Usuarios**. Al marcarlo como entregado, el informe queda bloqueado hasta que el administrador lo apruebe o pida ajustes en **Validación de informes**. Ambos se descargan en Word y PDF con el formato institucional.

Los recordatorios corren una vez al día (7:00 a. m., Colombia). En **Correos** se pueden enviar en cualquier momento.

## Desarrollo local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter api exec prisma migrate deploy
pnpm dev
```
