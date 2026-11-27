import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Periodo } from '@prisma/client';
import {
  datosProgramadorSchema,
  type DatosProgramador,
  SEMANAS_PROGRAMADOR,
  semanaVacia,
} from '@rae/shared';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';

export const FACULTAD_POR_DEFECTO = 'Facultad de Tecnologías de la Información y la Comunicación';

export const tituloProgramador = (d: Pick<DatosProgramador, 'unidad' | 'grupo'>) =>
  `${d.unidad || 'Unidad sin definir'}${d.grupo ? ` · grupo ${d.grupo}` : ''}`.slice(0, 200);

/**
 * Datos iniciales del programador: encabezado desde el curso y el objetivo desde la base de
 * conocimiento. Si el docente ya programó esa unidad en otro periodo, se reutilizan sus semanas.
 */
export async function datosInicialesProgramador(
  prisma: PrismaService,
  docenteId: number,
  periodo: Periodo,
  cursoId?: number,
): Promise<{ datos: DatosProgramador; cursoId: number | null; reutilizado: string | null }> {
  const hoy = new Date().toISOString().slice(0, 10);
  const vacias = Array.from({ length: SEMANAS_PROGRAMADOR }, (_, i) => semanaVacia(i + 1));
  if (!cursoId) {
    return {
      datos: datosProgramadorSchema.parse({
        facultad: FACULTAD_POR_DEFECTO,
        semanas: vacias,
        fecha: hoy,
      }),
      cursoId: null,
      reutilizado: null,
    };
  }
  const curso = await prisma.curso.findFirst({
    where: { id: cursoId, docenteId },
    include: { unidad: true, programa: true },
  });
  if (!curso) throw new BadRequestException('El curso no es tuyo.');
  if (curso.periodoId !== periodo.id) {
    throw new BadRequestException('El curso no pertenece a ese periodo.');
  }
  const previo = await prisma.informeDocente.findFirst({
    where: { docenteId, tipo: 'PROGRAMADOR', cursoId },
  });
  if (previo) {
    throw new ConflictException('Ya tienes el programador de clases de ese curso.');
  }
  const [objetivos, anterior] = await Promise.all([
    prisma.itemEvaluable.findMany({
      where: { unidadId: curso.unidadId, tipo: 'OBJETIVO', activo: true },
      orderBy: { orden: 'asc' },
      select: { texto: true },
    }),
    // El más reciente de la misma unidad, de cualquier periodo o grupo.
    prisma.informeDocente.findFirst({
      where: { docenteId, tipo: 'PROGRAMADOR', curso: { unidadId: curso.unidadId } },
      orderBy: { actualizadoEn: 'desc' },
      include: { periodo: { select: { codigo: true } } },
    }),
  ]);
  const base = anterior ? datosProgramadorSchema.parse(anterior.datos) : null;
  const datos = datosProgramadorSchema.parse({
    facultad: base?.facultad || FACULTAD_POR_DEFECTO,
    programa: curso.programa.nombre,
    unidad: curso.unidad.nombre,
    grupo: curso.grupo,
    creditos: base?.creditos ?? null,
    horasSemana: base?.horasSemana ?? null,
    objetivo: (base?.objetivo || objetivos.map((o) => o.texto).join('\n')).slice(0, 3000),
    semanas: base?.semanas.length ? base.semanas : vacias,
    fecha: hoy,
  });
  return {
    datos,
    cursoId: curso.id,
    reutilizado: anterior ? `${anterior.titulo} (${anterior.periodo.codigo})` : null,
  };
}
