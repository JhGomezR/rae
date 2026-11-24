import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizarNombreUnidad } from '@rae/shared';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const grupo = z.string().trim().min(1).max(5).toUpperCase();
export const esquemas = {
  filtro: z.object({
    periodoId: z.coerce.number().int().optional(),
    q: z.string().trim().max(80).optional(),
    estado: z.enum(['activos', 'inactivos', 'todos']).default('todos'),
    pagina: z.coerce.number().int().min(1).default(1),
    tamano: z.coerce.number().int().min(1).max(100).default(20),
  }),
  crear: z.object({
    periodoId: z.number().int(),
    unidadId: z.number().int(),
    docenteId: z.number().int(),
    sede: z.string().trim().min(2).max(40),
    programa: z.string().trim().min(3).max(120),
    grupo,
    semestreOferta: z.number().int().min(1).max(10),
  }),
  editar: z.object({
    unidadId: z.number().int().optional(),
    docenteId: z.number().int().optional(),
    sede: z.string().trim().min(2).max(40).optional(),
    programa: z.string().trim().min(3).max(120).optional(),
    grupo: grupo.optional(),
    semestreOferta: z.number().int().min(1).max(10).optional(),
    activo: z.boolean().optional(),
  }),
  inscribir: z.object({
    documento: z
      .string()
      .trim()
      .regex(/^\d{5,20}$/, 'Documento no válido.'),
  }),
  inscripcion: z.object({ activa: z.boolean() }),
};
type D<K extends keyof typeof esquemas> = z.output<(typeof esquemas)[K]>;

const DUPLICADO =
  'Ya existe un curso con esa unidad, grupo, sede, programa y docente en el periodo.';

@Injectable()
export class CursosService {
  constructor(private readonly prisma: PrismaService) {}

  async opciones() {
    const [periodos, sedes, programas, unidades, docentes] = await Promise.all([
      this.prisma.periodo.findMany({ orderBy: [{ anio: 'desc' }, { numero: 'desc' }] }),
      this.prisma.sede.findMany({ orderBy: { codigo: 'asc' } }),
      this.prisma.programa.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.unidadFormacion.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, semestre: true },
        orderBy: [{ semestre: 'asc' }, { nombre: 'asc' }],
      }),
      this.prisma.usuario.findMany({
        where: { rol: 'DOCENTE', activo: true },
        select: { id: true, nombreCompleto: true, documento: true },
        orderBy: { nombreCompleto: 'asc' },
      }),
    ]);
    return { periodos, sedes, programas, unidades, docentes };
  }

  async listar(f: D<'filtro'>) {
    const where: Prisma.CursoWhereInput = {
      ...(f.periodoId ? { periodoId: f.periodoId } : { periodo: { activo: true } }),
      ...(f.estado === 'activos'
        ? { activo: true }
        : f.estado === 'inactivos'
          ? { activo: false }
          : {}),
      ...(f.q
        ? {
            OR: [
              { unidad: { nombre: { contains: f.q, mode: 'insensitive' } } },
              { docente: { nombreCompleto: { contains: f.q, mode: 'insensitive' } } },
              { grupo: { equals: f.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [datos, total] = await Promise.all([
      this.prisma.curso.findMany({
        where,
        include: {
          unidad: { select: { id: true, nombre: true, activo: true } },
          sede: { select: { codigo: true } },
          programa: { select: { nombre: true } },
          docente: { select: { id: true, nombreCompleto: true } },
          periodo: { select: { codigo: true } },
          _count: { select: { inscripciones: { where: { activa: true } }, encuestas: true } },
        },
        orderBy: [{ unidad: { semestre: 'asc' } }, { unidadId: 'asc' }, { grupo: 'asc' }],
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.curso.count({ where }),
    ]);
    return { datos, total, pagina: f.pagina, tamano: f.tamano };
  }

  private async referencias(d: {
    sede?: string;
    programa?: string;
    docenteId?: number;
    unidadId?: number;
  }) {
    if (d.docenteId !== undefined) {
      const doc = await this.prisma.usuario.findFirst({
        where: { id: d.docenteId, rol: 'DOCENTE' },
      });
      if (!doc) throw new NotFoundException('El docente no existe.');
    }
    if (
      d.unidadId !== undefined &&
      !(await this.prisma.unidadFormacion.findUnique({ where: { id: d.unidadId } }))
    ) {
      throw new NotFoundException('La unidad no existe.');
    }
    const sede = d.sede
      ? await this.prisma.sede.upsert({
          where: { codigo: d.sede.toUpperCase() },
          update: {},
          create: { codigo: d.sede.toUpperCase() },
        })
      : undefined;
    const programa = d.programa
      ? await this.prisma.programa.upsert({
          where: { nombre: d.programa.toUpperCase() },
          update: {},
          create: {
            nombre: d.programa.toUpperCase(),
            ciclo: /TECNOLOG/.test(normalizarNombreUnidad(d.programa))
              ? 'TECNOLOGICO'
              : 'PROFESIONAL',
          },
        })
      : undefined;
    return { sedeId: sede?.id, programaId: programa?.id };
  }

  private async guardar<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(DUPLICADO);
      }
      throw e;
    }
  }

  async crear(d: D<'crear'>) {
    if (!(await this.prisma.periodo.findUnique({ where: { id: d.periodoId } }))) {
      throw new NotFoundException('El periodo no existe.');
    }
    const { sedeId, programaId } = await this.referencias(d);
    return this.guardar(() =>
      this.prisma.curso.create({
        data: {
          periodoId: d.periodoId,
          unidadId: d.unidadId,
          docenteId: d.docenteId,
          grupo: d.grupo,
          semestreOferta: d.semestreOferta,
          sedeId: sedeId as number,
          programaId: programaId as number,
        },
      }),
    );
  }

  async editar(id: number, d: D<'editar'>) {
    const curso = await this.prisma.curso.findUnique({
      where: { id },
      include: { _count: { select: { encuestas: true } } },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado.');
    if (d.unidadId !== undefined && d.unidadId !== curso.unidadId && curso._count.encuestas > 0) {
      throw new ConflictException(
        'El curso ya tiene encuestas: no se puede cambiar su unidad. Desactívalo y crea uno nuevo.',
      );
    }
    const { sede, programa, ...resto } = d;
    const ref = await this.referencias({
      sede,
      programa,
      docenteId: d.docenteId,
      unidadId: d.unidadId,
    });
    return this.guardar(() =>
      this.prisma.curso.update({
        where: { id },
        data: {
          ...resto,
          ...(ref.sedeId ? { sedeId: ref.sedeId } : {}),
          ...(ref.programaId ? { programaId: ref.programaId } : {}),
        },
      }),
    );
  }

  async inscripciones(cursoId: number) {
    await this.curso(cursoId);
    return this.prisma.inscripcion.findMany({
      where: { cursoId },
      include: { estudiante: { select: { documento: true, nombreCompleto: true } } },
      orderBy: { estudiante: { nombreCompleto: 'asc' } },
    });
  }

  async inscribir(cursoId: number, documento: string) {
    const curso = await this.curso(cursoId);
    const est = await this.prisma.usuario.findUnique({ where: { documento } });
    if (!est || est.rol !== 'ESTUDIANTE') {
      throw new NotFoundException(
        'No hay un estudiante con ese documento. Créalo primero en Usuarios.',
      );
    }
    return this.prisma.inscripcion.upsert({
      where: { cursoId_estudianteId: { cursoId, estudianteId: est.id } },
      create: { cursoId, estudianteId: est.id, semestreEstudiante: curso.semestreOferta },
      update: { activa: true },
    });
  }

  async cambiarInscripcion(cursoId: number, id: number, activa: boolean) {
    const i = await this.prisma.inscripcion.findFirst({ where: { id, cursoId } });
    if (!i) throw new NotFoundException('Inscripción no encontrada.');
    return this.prisma.inscripcion.update({ where: { id }, data: { activa } });
  }

  private async curso(id: number) {
    const c = await this.prisma.curso.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Curso no encontrado.');
    return c;
  }
}
