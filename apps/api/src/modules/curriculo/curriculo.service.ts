import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NivelPregunta, normalizarNombreUnidad } from '@rae/shared';
import { z } from 'zod';
import { ITEM_VIGENTE } from '../../common/vigencia';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { restaurarUnidad } from './sembrar-curriculo';

const texto = z.string().trim().min(5, 'Escribe un texto más completo.').max(2000);
const capacidad = z.string().trim().min(3, 'Escribe la afirmación.').max(500);
const codigo = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^C[GE]\d{2}$/, 'Usa el formato CG01 o CE01.');

export const esquemas = {
  unidadCrear: z.object({
    nombre: z.string().trim().min(3).max(150),
    semestre: z.number().int().min(1).max(10),
    ciclo: z.enum(['TECNOLOGICO', 'PROFESIONAL']),
  }),
  unidadEditar: z.object({
    nombre: z.string().trim().min(3).max(150).optional(),
    semestre: z.number().int().min(1).max(10).optional(),
    ciclo: z.enum(['TECNOLOGICO', 'PROFESIONAL']).optional(),
    activo: z.boolean().optional(),
  }),
  competenciaCrear: z.object({
    codigo: codigo.optional(),
    tipo: z.enum(['GENERICA', 'ESPECIFICA']),
    texto,
    tituloCorto: z.string().trim().min(3).max(200),
    capacidad,
  }),
  competenciaEditar: z.object({
    codigo: codigo.nullable().optional(),
    tipo: z.enum(['GENERICA', 'ESPECIFICA']).optional(),
    texto: texto.optional(),
    tituloCorto: z.string().trim().min(3).max(200).optional(),
    activo: z.boolean().optional(),
  }),
  itemCrear: z
    .object({
      tipo: z.enum(['OBJETIVO', 'RA', 'RAE']),
      competenciaUnidadId: z.number().int().optional(),
      texto,
      capacidad,
    })
    .refine((d) => d.tipo !== 'RA' || d.competenciaUnidadId, {
      message: 'Un resultado de aprendizaje necesita su competencia.',
      path: ['competenciaUnidadId'],
    }),
  itemEditar: z.object({
    texto: texto.optional(),
    capacidad: capacidad.optional(),
    activo: z.boolean().optional(),
  }),
  pregunta: z
    .object({
      enunciado: z.string().trim().min(5).max(2000),
      opciones: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
      indiceCorrecta: z.number().int().min(0),
    })
    .refine((p) => p.indiceCorrecta < p.opciones.length, {
      message: 'La respuesta correcta debe ser una de las opciones.',
      path: ['indiceCorrecta'],
    }),
};
type Datos<K extends keyof typeof esquemas> = z.output<(typeof esquemas)[K]>;

/** CG → genérica y CE → específica, siempre; sin código manda lo que elija el administrador. */
const tipoPorCodigo = (c: string | null | undefined, tipo: 'GENERICA' | 'ESPECIFICA') =>
  c?.startsWith('CG') ? 'GENERICA' : c?.startsWith('CE') ? 'ESPECIFICA' : tipo;
const claveNueva = (prefijo: string) =>
  `${prefijo}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

@Injectable()
export class CurriculoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const unidades = await this.prisma.unidadFormacion.findMany({
      orderBy: [{ semestre: 'asc' }, { id: 'asc' }],
      include: { items: { where: ITEM_VIGENTE, select: { seccion: true } } },
    });
    return unidades.map(({ items, ...u }) => ({
      ...u,
      conteo: {
        objetivos: items.filter((i) => i.seccion === 'OBJETIVO').length,
        genericas: items.filter((i) => i.seccion === 'GENERICA').length,
        especificas: items.filter((i) => i.seccion === 'ESPECIFICA').length,
        rae: items.filter((i) => i.seccion === 'RAE').length,
      },
    }));
  }

  async detalle(id: number) {
    const u = await this.prisma.unidadFormacion.findUnique({
      where: { id },
      include: {
        competencias: { orderBy: { orden: 'asc' } },
        items: { orderBy: { orden: 'asc' }, include: { preguntas: true } },
      },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada.');
    return u;
  }

  private async nombreLibre(nombre: string, excepto?: number) {
    const nombreClave = normalizarNombreUnidad(nombre);
    const otra = await this.prisma.unidadFormacion.findUnique({ where: { nombreClave } });
    if (otra && otra.id !== excepto) {
      throw new ConflictException('Ya existe una unidad con ese nombre.');
    }
    return nombreClave;
  }

  async crearUnidad(d: Datos<'unidadCrear'>) {
    const nombreClave = await this.nombreLibre(d.nombre);
    const ultima = await this.prisma.unidadFormacion.aggregate({ _max: { id: true } });
    return this.prisma.unidadFormacion.create({
      data: {
        ...d,
        id: (ultima._max.id ?? 0) + 1,
        nombreClave,
        archivosSyllabus: [],
        editado: true,
      },
    });
  }

  async editarUnidad(id: number, d: Datos<'unidadEditar'>) {
    await this.unidad(id);
    const nombreClave = d.nombre ? await this.nombreLibre(d.nombre, id) : undefined;
    return this.prisma.unidadFormacion.update({
      where: { id },
      data: { ...d, ...(nombreClave ? { nombreClave } : {}), editado: true },
    });
  }

  async crearCompetencia(unidadId: number, d: Datos<'competenciaCrear'>) {
    await this.unidad(unidadId);
    const tipo = tipoPorCodigo(d.codigo, d.tipo);
    const orden = await this.prisma.competenciaUnidad.aggregate({
      where: { unidadId },
      _max: { orden: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.competenciaUnidad.create({
        data: {
          unidadId,
          clave: claveNueva('c').slice(0, 10),
          codigo: d.codigo ?? null,
          tipo,
          texto: d.texto,
          tituloCorto: d.tituloCorto,
          orden: (orden._max.orden ?? 0) + 1,
        },
      });
      // Sin resultados propios, la competencia se pregunta con su propia afirmación.
      await this.nuevoItem(tx, unidadId, {
        seccion: tipo,
        tipo: 'COMPETENCIA',
        competenciaUnidadId: c.id,
        texto: d.texto,
        capacidad: d.capacidad,
      });
      await tx.unidadFormacion.update({ where: { id: unidadId }, data: { editado: true } });
      return c;
    });
  }

  async editarCompetencia(id: number, d: Datos<'competenciaEditar'>) {
    const actual = await this.prisma.competenciaUnidad.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Competencia no encontrada.');
    const nuevoCodigo = d.codigo === undefined ? actual.codigo : d.codigo;
    const tipo = tipoPorCodigo(nuevoCodigo, d.tipo ?? actual.tipo);
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.competenciaUnidad.update({
        where: { id },
        data: { ...d, codigo: nuevoCodigo, tipo },
      });
      await tx.itemEvaluable.updateMany({
        where: { competenciaUnidadId: id },
        data: { seccion: tipo },
      });
      await tx.unidadFormacion.update({ where: { id: actual.unidadId }, data: { editado: true } });
      return c;
    });
  }

  async crearItem(unidadId: number, d: Datos<'itemCrear'>) {
    await this.unidad(unidadId);
    let seccion: 'OBJETIVO' | 'RAE' | 'GENERICA' | 'ESPECIFICA' =
      d.tipo === 'RAE' ? 'RAE' : 'OBJETIVO';
    if (d.tipo === 'RA') {
      const c = await this.prisma.competenciaUnidad.findFirst({
        where: { id: d.competenciaUnidadId, unidadId },
      });
      if (!c) throw new NotFoundException('Competencia no encontrada en esta unidad.');
      seccion = c.tipo;
    }
    return this.prisma.$transaction(async (tx) => {
      if (d.tipo === 'RA') {
        // Con resultados propios ya no se pregunta la competencia completa.
        await tx.itemEvaluable.updateMany({
          where: { competenciaUnidadId: d.competenciaUnidadId, tipo: 'COMPETENCIA' },
          data: { activo: false },
        });
      }
      const item = await this.nuevoItem(tx, unidadId, {
        seccion,
        tipo: d.tipo,
        competenciaUnidadId: d.tipo === 'RA' ? (d.competenciaUnidadId ?? null) : null,
        texto: d.texto,
        capacidad: d.capacidad,
      });
      await tx.unidadFormacion.update({ where: { id: unidadId }, data: { editado: true } });
      return item;
    });
  }

  private async nuevoItem(
    tx: Prisma.TransactionClient,
    unidadId: number,
    d: Omit<Prisma.ItemEvaluableUncheckedCreateInput, 'unidadId' | 'clave' | 'orden'>,
  ) {
    const orden = await tx.itemEvaluable.aggregate({ where: { unidadId }, _max: { orden: true } });
    return tx.itemEvaluable.create({
      data: { ...d, unidadId, clave: claveNueva('n'), orden: (orden._max.orden ?? 0) + 1 },
    });
  }

  async editarItem(id: number, d: Datos<'itemEditar'>) {
    const actual = await this.prisma.itemEvaluable.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Ítem no encontrado.');
    const [fila] = await this.prisma.$transaction([
      this.prisma.itemEvaluable.update({ where: { id }, data: d }),
      this.prisma.unidadFormacion.update({
        where: { id: actual.unidadId },
        data: { editado: true },
      }),
    ]);
    return fila;
  }

  async editarPregunta(itemId: number, nivel: NivelPregunta, d: Datos<'pregunta'>) {
    const actual = await this.prisma.itemEvaluable.findUnique({ where: { id: itemId } });
    if (!actual) throw new NotFoundException('Ítem no encontrado.');
    const [fila] = await this.prisma.$transaction([
      this.prisma.preguntaPractica.upsert({
        where: { itemId_nivel: { itemId, nivel } },
        create: { itemId, nivel, ...d },
        update: { ...d, activa: true },
      }),
      this.prisma.unidadFormacion.update({
        where: { id: actual.unidadId },
        data: { editado: true },
      }),
    ]);
    return fila;
  }

  async restaurar(id: number): Promise<void> {
    if (!(await restaurarUnidad(this.prisma, id))) {
      throw new NotFoundException(
        'Esta unidad fue creada en la plataforma: no tiene contenido original.',
      );
    }
  }

  private async unidad(id: number) {
    const u = await this.prisma.unidadFormacion.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Unidad no encontrada.');
    return u;
  }
}
