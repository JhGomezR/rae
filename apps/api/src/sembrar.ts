import { PrismaClient } from '@prisma/client';
import { normalizarClave, parsearNombre } from '@rae/shared';
import * as argon2 from 'argon2';
import { env } from './config/env';
import { huellaSemilla, sembrarCurriculo } from './modules/curriculo/sembrar-curriculo';

/** Supabase publica el esquema public por su API: las tablas solo se usan desde el servidor. */
const BLOQUEAR_API_PUBLICA = `DO $$
DECLARE t record; r text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
    END IF;
  END LOOP;
END $$;`;

/** Datos base idempotentes: currículo, PEP y administrador inicial. */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(BLOQUEAR_API_PUBLICA);
    const huella = huellaSemilla();
    const previa = await prisma.configuracion.findUnique({ where: { clave: 'semilla' } });
    if (previa?.valor !== huella) {
      await sembrarCurriculo(prisma);
      await prisma.configuracion.upsert({
        where: { clave: 'semilla' },
        create: { clave: 'semilla', valor: huella },
        update: { valor: huella },
      });
    }
    if (env.ADMIN_DOCUMENTO && env.ADMIN_CLAVE_INICIAL) {
      const n = parsearNombre(env.ADMIN_NOMBRE);
      await prisma.usuario.upsert({
        where: { documento: env.ADMIN_DOCUMENTO },
        update: {},
        create: {
          documento: env.ADMIN_DOCUMENTO,
          nombreCompleto: env.ADMIN_NOMBRE,
          primerApellido: n.primerApellido.slice(0, 60),
          primerNombre: n.primerNombre.slice(0, 60),
          rol: 'ADMIN',
          // Mientras deba cambiarla, el login compara la clave normalizada.
          passwordHash: await argon2.hash(normalizarClave(env.ADMIN_CLAVE_INICIAL)),
        },
      });
    }
    const [unidades, items, preguntas] = await Promise.all([
      prisma.unidadFormacion.count(),
      prisma.itemEvaluable.count({ where: { activo: true } }),
      prisma.preguntaPractica.count(),
    ]);
    console.log(`Semilla lista: ${unidades} unidades, ${items} ítems, ${preguntas} preguntas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
