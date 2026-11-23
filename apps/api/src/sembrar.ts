import { PrismaClient } from '@prisma/client';
import { normalizarClave, parsearNombre } from '@rae/shared';
import * as argon2 from 'argon2';
import { env } from './config/env';
import { sembrarCurriculo } from './modules/curriculo/sembrar-curriculo';

/** Datos base idempotentes: currículo, PEP y administrador inicial. */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await sembrarCurriculo(prisma);
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
