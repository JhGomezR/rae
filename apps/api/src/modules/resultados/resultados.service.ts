import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Momento, nivelDePct, Rol } from '@rae/shared';
import { CURSO_VIGENTE, ITEM_VIGENTE } from '../../common/vigencia';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface Filtros {
  periodoId?: number;
  semestre?: number;
  sedeId?: number;
  programaId?: number;
  docenteId?: number;
}

export type EncuestaCargada = Prisma.EncuestaGetPayload<{
  include: {
    items: {
      select: {
        itemId: true;
        nivel: true;
        evaluados: true;
        alcanzan: true;
        acierto: true;
      };
    };
    curso: { select: { unidadId: true; grupo: true; docenteId: true; sede: true } };
    estrategias: { include: { estrategia: true } };
  };
}>;
type Resp = EncuestaCargada['items'][number];

export const promedio = (v: number[]) =>
  v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
const redondo = (v: number | null, d = 2) => (v === null ? null : Number(v.toFixed(d)));

export function pctAciertos(items: Resp[]): number | null {
  const r = items.filter((i) => i.acierto !== null);
  return r.length ? redondo((r.filter((i) => i.acierto).length / r.length) * 100, 1) : null;
}

export function pctLogro(items: Resp[]): number | null {
  const ev = items.reduce((s, i) => s + (i.evaluados ?? 0), 0);
  return ev ? redondo((items.reduce((s, i) => s + (i.alcanzan ?? 0), 0) / ev) * 100, 1) : null;
}

/** Nivel del ítem: declarado, o calculado con evaluados y alcanzan en alcance docente. */
export function nivelRespuesta(i: Resp): number | null {
  if (i.nivel) return i.nivel;
  if (i.evaluados) return nivelDePct(((i.alcanzan ?? 0) / i.evaluados) * 100).valor;
  return null;
}

const nivelPromedio = (items: Resp[]) =>
  redondo(promedio(items.map(nivelRespuesta).filter((n): n is number => n !== null)));

function resumenRol(encuestas: EncuestaCargada[]) {
  const items = encuestas.flatMap((e) => e.items);
  return {
    respuestas: encuestas.length,
    nivel: nivelPromedio(items),
    aciertos: pctAciertos(items),
    logro: pctLogro(items),
  };
}

@Injectable()
export class ResultadosService {
  constructor(private readonly prisma: PrismaService) {}

  async periodo(periodoId?: number) {
    const p = await this.prisma.periodo.findFirst({
      where: periodoId ? { id: periodoId } : { activo: true },
    });
    if (!p && periodoId) throw new NotFoundException('Periodo no encontrado.');
    return p;
  }

  cargar(periodoId: number, momento?: Momento, f: Filtros = {}): Promise<EncuestaCargada[]> {
    return this.prisma.encuesta.findMany({
      where: {
        periodoId,
        estado: 'ENVIADA',
        ...(momento ? { momento } : {}),
        curso: {
          activo: true,
          unidad: { activo: true, ...(f.semestre ? { semestre: f.semestre } : {}) },
          ...(f.sedeId ? { sedeId: f.sedeId } : {}),
          ...(f.programaId ? { programaId: f.programaId } : {}),
          ...(f.docenteId ? { docenteId: f.docenteId } : {}),
        },
      },
      include: {
        items: {
          select: { itemId: true, nivel: true, evaluados: true, alcanzan: true, acierto: true },
        },
        curso: { select: { unidadId: true, grupo: true, docenteId: true, sede: true } },
        estrategias: { include: { estrategia: true } },
      },
    });
  }

  private unidades(semestre?: number) {
    return this.prisma.unidadFormacion.findMany({
      where: { activo: true, ...(semestre ? { semestre } : {}) },
      select: { id: true, nombre: true, semestre: true },
      orderBy: [{ semestre: 'asc' }, { id: 'asc' }],
    });
  }

  async tabla(momento: Momento, f: Filtros) {
    const p = await this.periodo(f.periodoId);
    if (!p) return { periodo: null, filas: [] };
    const [encuestas, unidades] = await Promise.all([
      this.cargar(p.id, momento, f),
      this.unidades(f.semestre),
    ]);
    const filas = unidades
      .map((u) => {
        const propias = encuestas.filter((e) => e.curso.unidadId === u.id);
        return {
          ...u,
          estudiantes: resumenRol(propias.filter((e) => e.rol === Rol.ESTUDIANTE)),
          docentes: resumenRol(propias.filter((e) => e.rol === Rol.DOCENTE)),
        };
      })
      .filter((x) => x.estudiantes.respuestas + x.docentes.respuestas > 0);
    return { periodo: p.codigo, filas };
  }

  async detalleUnidad(momento: Momento, unidadId: number, periodoId?: number) {
    const p = await this.periodo(periodoId);
    const unidad = await this.prisma.unidadFormacion.findUnique({
      where: { id: unidadId },
      include: {
        items: {
          where: ITEM_VIGENTE,
          orderBy: { orden: 'asc' },
          include: { competencia: { select: { codigo: true } } },
        },
      },
    });
    if (!unidad) throw new NotFoundException('Unidad no encontrada.');
    const encuestas = p
      ? (await this.cargar(p.id, momento)).filter((e) => e.curso.unidadId === unidadId)
      : [];
    const deRol = (rol: Rol, itemId: number) =>
      encuestas
        .filter((e) => e.rol === rol)
        .flatMap((e) => e.items.filter((i) => i.itemId === itemId));
    return {
      unidad: { id: unidad.id, nombre: unidad.nombre, semestre: unidad.semestre },
      items: unidad.items.map((it) => {
        const est = deRol(Rol.ESTUDIANTE, it.id);
        const doc = deRol(Rol.DOCENTE, it.id);
        return {
          id: it.id,
          seccion: it.seccion,
          codigo: it.competencia?.codigo ?? null,
          texto: it.capacidad || it.texto,
          estudiantes: { n: est.length, nivel: nivelPromedio(est), aciertos: pctAciertos(est) },
          docentes: {
            n: doc.length,
            nivel: nivelPromedio(doc),
            aciertos: pctAciertos(doc),
            logro: pctLogro(doc),
          },
        };
      }),
    };
  }

  async comparativo(f: Filtros) {
    const p = await this.periodo(f.periodoId);
    if (!p) return { periodo: null, filas: [] };
    const [encuestas, unidades] = await Promise.all([
      this.cargar(p.id, undefined, f),
      this.unidades(f.semestre),
    ]);
    const nivel = (uid: number, rol: Rol, m: Momento) =>
      nivelPromedio(
        encuestas
          .filter((e) => e.curso.unidadId === uid && e.rol === rol && e.momento === m)
          .flatMap((e) => e.items),
      );
    const brecha = (a: number | null, b: number | null) =>
      a === null || b === null ? null : redondo(b - a);
    const filas = unidades
      .map((u) => {
        const ea = nivel(u.id, Rol.ESTUDIANTE, Momento.APRECIACION);
        const eb = nivel(u.id, Rol.ESTUDIANTE, Momento.ALCANCE);
        const da = nivel(u.id, Rol.DOCENTE, Momento.APRECIACION);
        const db = nivel(u.id, Rol.DOCENTE, Momento.ALCANCE);
        return {
          ...u,
          estudiantes: { apreciacion: ea, alcance: eb, brecha: brecha(ea, eb) },
          docentes: { apreciacion: da, alcance: db, brecha: brecha(da, db) },
        };
      })
      .filter((x) =>
        [
          x.estudiantes.apreciacion,
          x.estudiantes.alcance,
          x.docentes.apreciacion,
          x.docentes.alcance,
        ].some((v) => v !== null),
      );
    return { periodo: p.codigo, filas };
  }

  async panel(periodoId?: number) {
    const p = await this.periodo(periodoId);
    if (!p) return { periodo: null };
    const [encuestas, cursos, inscripciones, unidades] = await Promise.all([
      this.cargar(p.id),
      this.prisma.curso.count({ where: { periodoId: p.id, ...CURSO_VIGENTE } }),
      this.prisma.inscripcion.count({
        where: { activa: true, curso: { periodoId: p.id, ...CURSO_VIGENTE } },
      }),
      this.unidades(),
    ]);
    const esperadas = inscripciones + cursos;
    const participacion = (m: Momento) => {
      const n = encuestas.filter((e) => e.momento === m).length;
      return { enviadas: n, esperadas, pct: esperadas ? redondo((n / esperadas) * 100, 1) : 0 };
    };
    const semestres = [...new Set(unidades.map((u) => u.semestre))].map((semestre) => {
      const ids = new Set(unidades.filter((u) => u.semestre === semestre).map((u) => u.id));
      const de = (m: Momento) =>
        nivelPromedio(
          encuestas
            .filter((e) => e.momento === m && ids.has(e.curso.unidadId))
            .flatMap((e) => e.items),
        );
      return { semestre, apreciacion: de(Momento.APRECIACION), alcance: de(Momento.ALCANCE) };
    });
    const { filas } = await this.comparativo({ periodoId: p.id });
    const brechas = filas
      .filter((f) => f.estudiantes.brecha !== null)
      .sort((a, b) => (a.estudiantes.brecha as number) - (b.estudiantes.brecha as number))
      .slice(0, 5)
      .map((f) => ({ id: f.id, nombre: f.nombre, brecha: f.estudiantes.brecha }));
    return {
      periodo: p,
      cursos,
      inscripciones,
      apreciacion: participacion(Momento.APRECIACION),
      alcance: participacion(Momento.ALCANCE),
      semestres,
      brechas,
    };
  }
}
