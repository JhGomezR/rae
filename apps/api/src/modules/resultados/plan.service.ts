import { Injectable } from '@nestjs/common';
import { Momento, Rol, TipoEstrategia } from '@rae/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  EncuestaCargada,
  nivelRespuesta,
  pctAciertos,
  pctLogro,
  promedio,
  ResultadosService,
} from './resultados.service';

export type EstadoPlan = 'CUMPLE' | 'EN_PROGRESO' | 'NO_CUMPLE' | 'SIN_DATOS' | 'INFORMATIVO';

interface Contexto {
  anio: number;
  encuestas: EncuestaCargada[];
  totalUnidades: number;
  seguimientos: string[];
  competencias: { itemId: number; codigo: string; unidadId: number }[];
}

interface Indicador {
  estado: EstadoPlan;
  indicadores: Record<string, unknown>;
}

const r1 = (v: number | null) => (v === null ? null : Number(v.toFixed(1)));
const likert = (lista: EncuestaCargada[], campo: string) =>
  r1(
    promedio(
      lista
        .map((e) => (e.general as Record<string, unknown>)[campo])
        .filter((v): v is number => typeof v === 'number'),
    ),
  );
const pctDe = (parte: number, total: number) => (total ? r1((parte / total) * 100) : null);

/** Características 18–20: evaluación diagnóstica y posterior del currículo. */
function curriculo({ encuestas }: Contexto): Indicador {
  const de = (m: Momento) => encuestas.filter((e) => e.momento === m);
  const aspectos = ['integralidad', 'flexibilidad', 'interdisciplinariedad'].map((campo) => ({
    aspecto: campo,
    diagnostico: likert(de(Momento.APRECIACION), campo),
    posterior: likert(de(Momento.ALCANCE), campo),
  }));
  const aplicadas = [Momento.APRECIACION, Momento.ALCANCE].filter((m) => de(m).length > 0).length;
  const estado: EstadoPlan =
    aplicadas === 2 ? 'CUMPLE' : aplicadas === 1 ? 'EN_PROGRESO' : 'SIN_DATOS';
  return { estado, indicadores: { aspectos, evaluacionesAplicadas: aplicadas } };
}

/** Característica 21: estrategias del PEP y recomendaciones aplicadas (meta 70 %). */
function estrategias({ encuestas, seguimientos }: Contexto): Indicador {
  const docentes = encuestas.filter((e) => e.rol === Rol.DOCENTE);
  const cumplenPep = docentes.filter((e) => {
    const n = (t: TipoEstrategia) => e.estrategias.filter((x) => x.estrategia.tipo === t).length;
    const activas = n(TipoEstrategia.ACTIVA);
    return n(TipoEstrategia.DIDACTICA) >= 3 && activas >= 1 && activas <= 2;
  }).length;
  const apreciacion = encuestas.filter(
    (e) => e.rol === Rol.ESTUDIANTE && e.momento === Momento.APRECIACION,
  );
  const acuerdo = apreciacion.filter(
    (e) => (e.general as Record<string, unknown>).acuerdoPedagogico === 1,
  ).length;
  const usos = new Map<string, number>();
  for (const e of docentes) {
    for (const x of e.estrategias)
      usos.set(x.estrategia.nombre, (usos.get(x.estrategia.nombre) ?? 0) + 1);
  }
  const valor: Record<string, number> = { APLICADA: 100, PARCIAL: 50, NO_APLICADA: 0 };
  const aplicadas = r1(promedio(seguimientos.map((s) => valor[s] ?? 0)));
  const alcance = encuestas.filter((e) => e.momento === Momento.ALCANCE);
  const estado: EstadoPlan =
    aplicadas === null
      ? 'SIN_DATOS'
      : aplicadas >= 70
        ? 'CUMPLE'
        : aplicadas >= 35
          ? 'EN_PROGRESO'
          : 'NO_CUMPLE';
  return {
    estado,
    indicadores: {
      pctCumplenPep: pctDe(cumplenPep, docentes.length),
      efectividadDocentes: likert(
        alcance.filter((e) => e.rol === Rol.DOCENTE),
        'efectividadEstrategias',
      ),
      efectividadEstudiantes: likert(
        alcance.filter((e) => e.rol === Rol.ESTUDIANTE),
        'efectividadEstrategias',
      ),
      pctAcuerdoPedagogico: pctDe(acuerdo, apreciacion.length),
      estrategiasMasUsadas: [...usos]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nombre, veces]) => ({ nombre, veces })),
      pctRecomendacionesAplicadas: aplicadas,
      recomendacionesEvaluadas: seguimientos.length,
    },
  };
}

/** Características 22–24: evaluación, seguimiento de RA y competencias. */
function evaluacion(c: Contexto): Indicador {
  const alcance = c.encuestas.filter((e) => e.momento === Momento.ALCANCE);
  const est = alcance.filter((e) => e.rol === Rol.ESTUDIANTE);
  const doc = alcance.filter((e) => e.rol === Rol.DOCENTE);
  const conSeguimiento = new Set(doc.map((e) => e.curso.unidadId)).size;
  const pct = pctDe(conSeguimiento, c.totalUnidades) ?? 0;
  const metaAnio = Math.max(0, Math.min(100, ((c.anio - 2026 + 1) / 4) * 100));
  const retro = doc.filter((e) => (e.general as Record<string, unknown>).retroalimentacionRa === 1);

  const porItem = new Map(c.competencias.map((x) => [x.itemId, x]));
  const codigos = [...new Set(c.competencias.map((x) => x.codigo))].sort();
  const competencias = codigos.map((codigo) => {
    const respuestas = alcance.flatMap((e) =>
      e.items
        .filter((i) => porItem.get(i.itemId)?.codigo === codigo)
        .map((i) => ({ i, rol: e.rol })),
    );
    const niveles = respuestas
      .filter((x) => x.rol === Rol.ESTUDIANTE)
      .map((x) => nivelRespuesta(x.i))
      .filter((n): n is number => n !== null);
    return {
      codigo,
      unidades: new Set(c.competencias.filter((x) => x.codigo === codigo).map((x) => x.unidadId))
        .size,
      nivelPercibido: r1(promedio(niveles)),
      aciertos: pctAciertos(respuestas.map((x) => x.i)),
      logroDocente: pctLogro(respuestas.filter((x) => x.rol === Rol.DOCENTE).map((x) => x.i)),
    };
  });
  const estado: EstadoPlan = !doc.length ? 'SIN_DATOS' : pct >= metaAnio ? 'CUMPLE' : 'EN_PROGRESO';
  return {
    estado,
    indicadores: {
      coherenciaEvaluacion: likert(est, 'evaluacionCoherente'),
      retroalimentacionEstudiantes: likert(est, 'retroalimentacion'),
      pctDocentesRetroalimentan: pctDe(retro.length, doc.length),
      pctUnidadesConSeguimiento: pct,
      metaAnio,
      competencias,
    },
  };
}

const INDICADORES: Record<string, (c: Contexto) => Indicador> = {
  '18,19,20': curriculo,
  '21': estrategias,
  '22,23,24': evaluacion,
};

@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultados: ResultadosService,
  ) {}

  async calcular(periodoId?: number) {
    const periodo = await this.resultados.periodo(periodoId);
    if (!periodo) return { periodo: null, caracteristicas: [] };
    const [encuestas, totalUnidades, seguimientos, items, caracteristicas] = await Promise.all([
      this.resultados.cargar(periodo.id),
      this.prisma.unidadFormacion.count(),
      this.prisma.seguimientoRecomendacion.findMany({
        where: { curso: { periodoId: periodo.id } },
        select: { estado: true },
      }),
      this.prisma.itemEvaluable.findMany({
        where: { activo: true, competencia: { codigo: { not: null } } },
        select: { id: true, unidadId: true, competencia: { select: { codigo: true } } },
      }),
      this.prisma.caracteristicaPlan.findMany({ orderBy: { orden: 'asc' } }),
    ]);
    const contexto: Contexto = {
      anio: periodo.anio,
      encuestas,
      totalUnidades,
      seguimientos: seguimientos.map((s) => s.estado),
      competencias: items.map((i) => ({
        itemId: i.id,
        unidadId: i.unidadId,
        codigo: i.competencia?.codigo as string,
      })),
    };
    return {
      periodo: { id: periodo.id, codigo: periodo.codigo },
      caracteristicas: caracteristicas.map((c) => ({
        ...c,
        ...(INDICADORES[c.numeros]?.(contexto) ?? { estado: 'SIN_DATOS', indicadores: {} }),
      })),
    };
  }
}
