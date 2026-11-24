import type { Prisma } from '@prisma/client';

/** Ítem activo cuya competencia (si tiene) tampoco fue retirada. */
export const ITEM_VIGENTE = {
  activo: true,
  OR: [{ competenciaUnidadId: null }, { competencia: { activo: true } }],
} satisfies Prisma.ItemEvaluableWhereInput;

/** Curso activo de una unidad activa. Lo inactivo se conserva, pero no cuenta. */
export const CURSO_VIGENTE = {
  activo: true,
  unidad: { activo: true },
} satisfies Prisma.CursoWhereInput;
