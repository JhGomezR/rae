import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoIndicadorPoa } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { calcularDesempeno, mesCorte } from './desempeno';
import { leerPoa } from './lector-poa';
import { ActividadCalculo, Desempeno } from './poa.tipos';

const texto = (max: number) => z.string().trim().max(max);
const requerido = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);
const dinero = z.number().min(0).max(99_999_999_999).nullable();

const actividad = z.object({
  numero: z.number().int().min(1).max(999),
  ejePgr: texto(300).default(''),
  ejePdi: texto(500).default(''),
  programaPdi: texto(300).default(''),
  subprograma: texto(300).default(''),
  proyecto: texto(1000).default(''),
  metaVigencia: z.number().min(0).max(9_999_999_999).nullable().default(null),
  indicadorPdi: texto(500).default(''),
  actividad: requerido(2000, 'Escribe la actividad.'),
  tipoIndicador: z.nativeEnum(TipoIndicadorPoa).nullable().default(null),
  indicadorActividad: texto(1000).default(''),
  interpretacion: texto(1000).nullable().default(null),
  responsableEjecucion: texto(300).default(''),
  meses: z
    .array(z.number().int().min(1).max(12))
    .max(12)
    .transform((m) => [...new Set(m)].sort((a, b) => a - b))
    .default([]),
  presupuesto: dinero.default(null),
  observaciones: texto(2000).nullable().default(null),
});

const encabezado = z.object({
  vigencia: z.number().int().min(2000).max(2100),
  fechaElaboracion: z.coerce.date(),
  dependencia: requerido(300, 'Escribe la dependencia.'),
  areaFacultad: texto(150).default(''),
  responsable: requerido(150, 'Escribe el responsable.'),
  cargo: texto(150).default(''),
});

export const esquemas = {
  crear: encabezado,
  editar: encabezado.omit({ vigencia: true }).partial().extend({ activo: z.boolean().optional() }),
  actividad,
  editarActividad: actividad.partial().extend({ activo: z.boolean().optional() }),
  seguimiento: z.object({
    avance: z.number().int().min(0).max(100),
    logro: requerido(2000, 'Describe lo logrado en el mes.'),
    evidencia: texto(500).nullable().default(null),
    ejecutado: dinero.default(null),
  }),
  corte: z.object({ mes: z.coerce.number().int().min(0).max(12).optional() }),
};
type D<K extends keyof typeof esquemas> = z.output<(typeof esquemas)[K]>;

const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

const conActividades = {
  actividades: {
    where: { activo: true },
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    include: { seguimientos: { orderBy: { mes: 'asc' } } },
  },
} satisfies Prisma.PoaInclude;

export type PoaCompleto = Prisma.PoaGetPayload<{ include: typeof conActividades }>;

export function aCalculo(p: PoaCompleto): ActividadCalculo[] {
  return p.actividades.map((a) => ({
    id: a.id,
    numero: a.numero,
    ejePgr: a.ejePgr,
    actividad: a.actividad,
    tipoIndicador: a.tipoIndicador,
    responsableEjecucion: a.responsableEjecucion,
    meses: a.meses,
    presupuesto: num(a.presupuesto),
    seguimientos: a.seguimientos.map((s) => ({
      mes: s.mes,
      avance: s.avance,
      logro: s.logro,
      ejecutado: num(s.ejecutado),
    })),
  }));
}

@Injectable()
export class PoaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const poas = await this.prisma.poa.findMany({
      orderBy: { vigencia: 'desc' },
      include: conActividades,
    });
    return poas.map((poa) => {
      const d = calcularDesempeno(aCalculo(poa), mesCorte(poa.vigencia));
      const { actividades: _a, ...p } = poa;
      void _a;
      return {
        ...p,
        actividades: d.actividades,
        avance: d.avance,
        indice: d.indice,
        semaforo: d.semaforo,
      };
    });
  }

  async completo(id: number): Promise<PoaCompleto> {
    const p = await this.prisma.poa.findUnique({ where: { id }, include: conActividades });
    if (!p) throw new NotFoundException('El POA no existe.');
    return p;
  }

  async desempeno(id: number, mes?: number): Promise<{ poa: PoaCompleto; desempeno: Desempeno }> {
    const poa = await this.completo(id);
    return { poa, desempeno: calcularDesempeno(aCalculo(poa), mes ?? mesCorte(poa.vigencia)) };
  }

  async detalle(id: number, mes?: number) {
    const { poa, desempeno } = await this.desempeno(id, mes);
    const inactivas = await this.prisma.poaActividad.findMany({
      where: { poaId: id, activo: false },
      orderBy: { orden: 'asc' },
      select: { id: true, numero: true, actividad: true },
    });
    return {
      ...poa,
      actividades: poa.actividades.map((a) => ({
        ...a,
        metaVigencia: num(a.metaVigencia),
        presupuesto: num(a.presupuesto),
        seguimientos: a.seguimientos.map((s) => ({ ...s, ejecutado: num(s.ejecutado) })),
      })),
      inactivas,
      desempeno,
    };
  }

  async crear(d: D<'crear'>) {
    try {
      return await this.prisma.poa.create({ data: d });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe el POA de la vigencia ${d.vigencia}.`);
      }
      throw e;
    }
  }

  async editar(id: number, d: D<'editar'>) {
    await this.completo(id);
    return this.prisma.poa.update({ where: { id }, data: d });
  }

  async crearActividad(poaId: number, d: D<'actividad'>) {
    await this.completo(poaId);
    const ultima = await this.prisma.poaActividad.aggregate({
      where: { poaId },
      _max: { orden: true },
    });
    return this.prisma.poaActividad.create({
      data: { ...d, poaId, orden: (ultima._max.orden ?? 0) + 1 },
    });
  }

  async editarActividad(id: number, d: D<'editarActividad'>) {
    await this.actividad(id);
    return this.prisma.poaActividad.update({ where: { id }, data: d });
  }

  async registrarSeguimiento(id: number, mes: number, d: D<'seguimiento'>, usuarioId: number) {
    const a = await this.actividad(id);
    if (!a.activo) throw new ConflictException('La actividad está inactiva.');
    return this.prisma.poaSeguimiento.upsert({
      where: { actividadId_mes: { actividadId: id, mes } },
      create: { ...d, actividadId: id, mes, usuarioId },
      update: { ...d, usuarioId },
    });
  }

  async quitarSeguimiento(id: number, mes: number) {
    await this.actividad(id);
    await this.prisma.poaSeguimiento.deleteMany({ where: { actividadId: id, mes } });
    return { ok: true };
  }

  /** Importa un Excel F-PIN-001. No reemplaza un POA que ya tenga seguimiento registrado. */
  async importar(archivo: Buffer) {
    const { encabezado: e, actividades } = await leerPoa(archivo);
    const previo = await this.prisma.poa.findUnique({ where: { vigencia: e.vigencia } });
    if (previo) {
      const conSeguimiento = await this.prisma.poaSeguimiento.count({
        where: { actividad: { poaId: previo.id } },
      });
      if (conSeguimiento) {
        throw new ConflictException(
          `El POA ${e.vigencia} ya tiene seguimiento registrado; edítalo en pantalla para no perderlo.`,
        );
      }
    }
    const poa = await this.prisma.$transaction(async (tx) => {
      const p = await tx.poa.upsert({
        where: { vigencia: e.vigencia },
        create: e,
        update: { ...e, activo: true },
      });
      await tx.poaActividad.deleteMany({ where: { poaId: p.id } });
      await tx.poaActividad.createMany({
        data: actividades.map((a, i) => ({ ...a, poaId: p.id, orden: i + 1 })),
      });
      return p;
    });
    return {
      id: poa.id,
      vigencia: poa.vigencia,
      actividades: actividades.length,
      reemplazado: !!previo,
    };
  }

  private async actividad(id: number) {
    const a = await this.prisma.poaActividad.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('La actividad no existe.');
    return a;
  }
}
