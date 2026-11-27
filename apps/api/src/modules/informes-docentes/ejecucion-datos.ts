import { ConflictException } from '@nestjs/common';
import type { Periodo } from '@prisma/client';
import {
  datosAgendaSchema,
  datosEjecucionSchema,
  DatosEjecucion,
  ESCALAFONES,
  FilaEjecucion,
  LABORES_EJECUCION,
  SECCIONES_AGENDA,
  Vinculacion,
  VINCULACIONES,
} from '@rae/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const CLAVES = new Set(LABORES_EJECUCION.flatMap((l) => l.actividades.map((a) => a.clave)));

export const tituloEjecucion = (codigo: string, corte: number) =>
  `Ejecución de la agenda ${codigo} · corte ${corte}`;

/**
 * Datos iniciales del informe de ejecución (F-DOC-004): el corte 2 continúa el corte 1;
 * el corte 1 parte de la agenda del periodo y de los cursos asignados.
 */
export async function datosInicialesEjecucion(
  prisma: PrismaService,
  docenteId: number,
  periodo: Periodo,
  corte: 1 | 2,
  vinculacion: Vinculacion | null,
): Promise<DatosEjecucion> {
  const previos = await prisma.informeDocente.findMany({
    where: { docenteId, periodoId: periodo.id, tipo: 'EJECUCION' },
  });
  const deCorte = (n: number) =>
    previos.find((p) => datosEjecucionSchema.parse(p.datos ?? {}).corte === n);
  if (deCorte(corte)) {
    throw new ConflictException(
      `Ya tienes el informe de ejecución del corte ${corte} del periodo ${periodo.codigo}.`,
    );
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const anterior = corte === 2 ? deCorte(1) : undefined;
  if (anterior) {
    const d = datosEjecucionSchema.parse(anterior.datos);
    return { ...d, corte, fechaElaboracion: hoy };
  }

  const [agendaFila, cursos] = await Promise.all([
    prisma.informeDocente.findFirst({
      where: { docenteId, periodoId: periodo.id, tipo: 'AGENDA' },
    }),
    prisma.curso.findMany({
      where: { docenteId, periodoId: periodo.id, activo: true },
      include: { unidad: true },
      orderBy: { unidad: { nombre: 'asc' } },
    }),
  ]);
  const agenda = agendaFila ? datosAgendaSchema.parse(agendaFila.datos) : null;
  const filas: FilaEjecucion[] = [];
  const base = {
    meta: '',
    indicador: '',
    corte1: null,
    corte2: null,
    meses: [],
    observaciones: '',
  };
  for (const c of cursos) {
    filas.push({
      ...base,
      actividad: 'dir-encuentro',
      tarea: `Unidad de formación: ${c.unidad.nombre} (semestre ${c.semestreOferta}, grupo ${c.grupo})`,
      meta: '100% del syllabus desarrollado',
      indicador: 'Horas orientadas / Total de horas asignadas',
      horas: null,
      evidencias: 'F-DOC-046 Listado de asistencia a clase',
    });
  }
  if (agenda) {
    for (const s of SECCIONES_AGENDA) {
      for (const a of s.actividades) {
        const f = agenda.actividades[a.clave];
        if (!f || !CLAVES.has(a.clave)) continue;
        if (a.clave === 'dir-encuentro' && cursos.length) continue;
        if (!f.descripcion && !f.horas) continue;
        filas.push({
          ...base,
          actividad: a.clave,
          tarea: f.descripcion,
          horas: f.horas,
          evidencias: f.evidencias || a.evidencias,
        });
      }
    }
  }
  const v = vinculacion ? VINCULACIONES[vinculacion].toUpperCase() : '';
  const e = agenda?.escalafon ? ` - ${ESCALAFONES[agenda.escalafon].toUpperCase()}` : '';
  return datosEjecucionSchema.parse({
    corte,
    facultad: agenda?.facultad || 'Facultad de Tecnologías de la Información y la Comunicación',
    escalafon: `DOCENTE ${v}${e}`.trim(),
    fechaElaboracion: hoy,
    filas,
  });
}
