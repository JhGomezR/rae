import { Momento, NIVELES, Rol, SIN_DATOS, TipoEstrategia } from '@rae/shared';
import { EncuestaCargada, nivelRespuesta, promedio } from '../resultados/resultados.service';
import { Bloque, ClaveInforme, Kpi } from './informe.tipos';

export interface CompetenciaPlan {
  codigo: string;
  unidades: number;
  nivelPercibido: number | null;
  aciertos: number | null;
  logroDocente: number | null;
}

export interface DatosInforme {
  periodo: { codigo: string; anio: number; numero: number };
  encuestas: EncuestaCargada[];
  totalUnidades: number;
  recomendacionesPeriodo: number;
  seguimientos: string[];
  competencias: CompetenciaPlan[];
}

export interface Contenido {
  meta: string;
  kpis: Kpi[];
  bloques: Bloque[];
  logros: string[];
  impactos: string[];
  porcentaje: number;
}

const num = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${num(v)} %`);
const pctDe = (parte: number, total: number) => (total ? (parte / total) * 100 : null);
const dif = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);
const conSigno = (v: number | null) =>
  v === null ? '—' : `${v > 0 ? '+' : ''}${num(Number(v.toFixed(2)))}`;

function likert(lista: EncuestaCargada[], campo: string): number | null {
  const v = lista
    .map((e) => (e.general as Record<string, unknown>)[campo])
    .filter((x): x is number => typeof x === 'number');
  const p = promedio(v);
  return p === null ? null : Number(p.toFixed(2));
}

const deRol = (l: EncuestaCargada[], rol: Rol) => l.filter((e) => e.rol === rol);
const deMomento = (l: EncuestaCargada[], m: Momento) => l.filter((e) => e.momento === m);
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const respuestas = (l: EncuestaCargada[]) =>
  `${plural(l.length, 'respuesta', 'respuestas')} (${deRol(l, Rol.ESTUDIANTE).length} de estudiantes y ${deRol(l, Rol.DOCENTE).length} de docentes)`;
const sobre5 = (v: number | null) => (v === null ? '—' : `${num(v)} / 5`);

const ASPECTOS = [
  ['integralidad', 'Integralidad'],
  ['flexibilidad', 'Flexibilidad'],
  ['interdisciplinariedad', 'Interdisciplinariedad'],
] as const;

function informe021({ periodo, encuestas }: DatosInforme): Contenido {
  const meta =
    'Aplicar a partir del 2026 dos evaluaciones para medir el estado del currículo y la efectividad de mejoras implementadas del nuevo plan de estudios.';
  const diag = deMomento(encuestas, Momento.APRECIACION);
  const post = deMomento(encuestas, Momento.ALCANCE);
  const aplicadas = Number(diag.length > 0) + Number(post.length > 0);
  const filas = ASPECTOS.map(([campo, nombre]) => ({
    nombre,
    d: likert(diag, campo),
    p: likert(post, campo),
    ed: likert(deRol(diag, Rol.ESTUDIANTE), campo),
    ep: likert(deRol(post, Rol.ESTUDIANTE), campo),
    dd: likert(deRol(diag, Rol.DOCENTE), campo),
    dp: likert(deRol(post, Rol.DOCENTE), campo),
  }));
  const kpis: Kpi[] = [
    {
      titulo: 'Evaluaciones aplicadas',
      valor: `${aplicadas} de 2`,
      nota: `Periodo ${periodo.codigo}`,
    },
    { titulo: 'Respuestas diagnósticas', valor: String(diag.length) },
    { titulo: 'Respuestas posteriores', valor: String(post.length) },
  ];
  if (!aplicadas) {
    return {
      meta,
      kpis,
      bloques: [{ tipo: 'parrafo', texto: SIN_DATOS }],
      logros: [SIN_DATOS],
      impactos: [SIN_DATOS],
      porcentaje: 0,
    };
  }
  const bloques: Bloque[] = [
    {
      tipo: 'parrafo',
      texto: `Meta: ${meta} En el periodo ${periodo.codigo} se aplicaron ${aplicadas} de las 2 evaluaciones mediante el aplicativo de seguimiento curricular. La evaluación diagnóstica, al inicio del semestre, registró ${respuestas(diag)}; la evaluación posterior, al finalizar, registró ${respuestas(post)}. Cada aspecto se valoró en una escala de 1 (nada) a 5 (totalmente).`,
    },
    {
      tipo: 'barras',
      titulo: 'Promedio por aspecto del currículo (escala 1 a 5)',
      series: ['Diagnóstica', 'Posterior'],
      maximo: 5,
      unidad: '',
      filas: filas.map((f) => ({ etiqueta: f.nombre, valores: [f.d, f.p] })),
    },
    {
      tipo: 'tabla',
      columnas: [
        'Aspecto',
        'Est. diagnóstica',
        'Est. posterior',
        'Doc. diagnóstica',
        'Doc. posterior',
        'Variación',
      ],
      filas: filas.map((f) => [
        f.nombre,
        num(f.ed),
        num(f.ep),
        num(f.dd),
        num(f.dp),
        conSigno(dif(f.d, f.p)),
      ]),
    },
    {
      tipo: 'parrafo',
      texto:
        aplicadas === 2
          ? 'Con las dos evaluaciones aplicadas se cumple la meta del periodo y se dispone de una comparación entre el estado inicial y el estado final del currículo.'
          : 'Falta aplicar una de las dos evaluaciones para cumplir la meta y comparar el estado inicial con el final.',
    },
  ];
  const logros: string[] = [];
  if (diag.length) logros.push(`Se aplicó la evaluación diagnóstica con ${respuestas(diag)}.`);
  if (post.length) logros.push(`Se aplicó la evaluación posterior con ${respuestas(post)}.`);
  if (aplicadas === 2) logros.push('Se cumplió la meta de dos evaluaciones en el periodo.');
  const mejor = filas
    .filter((f) => (f.p ?? f.d) !== null)
    .sort((a, b) => (b.p ?? b.d ?? 0) - (a.p ?? a.d ?? 0))[0];
  if (mejor) {
    logros.push(
      `El aspecto mejor valorado fue ${mejor.nombre.toLowerCase()}, con ${num(mejor.p ?? mejor.d)} sobre 5.`,
    );
  }
  const impactos = filas.flatMap((f) => {
    const v = dif(f.d, f.p);
    if (v === null) return [];
    const verbo = v > 0 ? 'aumentó' : v < 0 ? 'disminuyó' : 'se mantuvo';
    return [
      `La valoración de ${f.nombre.toLowerCase()} ${verbo} de ${num(f.d)} a ${num(f.p)} entre la evaluación diagnóstica y la posterior.`,
    ];
  });
  impactos.push(
    'El programa cuenta con una línea de medición del currículo que puede repetirse cada semestre.',
  );
  return { meta, kpis, bloques, logros, impactos, porcentaje: aplicadas === 2 ? 100 : 50 };
}

function usoEstrategias(docentes: EncuestaCargada[]) {
  const usos = new Map<string, { nombre: string; tipo: string; veces: number }>();
  for (const e of docentes) {
    for (const x of e.estrategias) {
      const a = usos.get(x.estrategia.nombre) ?? {
        nombre: x.estrategia.nombre,
        tipo: x.estrategia.tipo,
        veces: 0,
      };
      a.veces += 1;
      usos.set(a.nombre, a);
    }
  }
  return [...usos.values()].sort((a, b) => b.veces - a.veces);
}

function siguientePeriodo({ anio, numero }: DatosInforme['periodo']) {
  return numero === 1 ? `${anio}-2` : `${anio + 1}-1`;
}

function informe022(d: DatosInforme): Contenido {
  const meta =
    'A partir del 2026, evaluar anualmente las estrategias pedagógicas del PEP y garantizar que al menos el 70 % de las recomendaciones sean aplicadas en el siguiente periodo académico.';
  const docentes = deRol(d.encuestas, Rol.DOCENTE);
  const alcance = deMomento(d.encuestas, Momento.ALCANCE);
  const apEst = deRol(deMomento(d.encuestas, Momento.APRECIACION), Rol.ESTUDIANTE);
  const cumplen = docentes.filter((e) => {
    const n = (t: TipoEstrategia) => e.estrategias.filter((x) => x.estrategia.tipo === t).length;
    const activas = n(TipoEstrategia.ACTIVA);
    return n(TipoEstrategia.DIDACTICA) >= 3 && activas >= 1 && activas <= 2;
  }).length;
  const pctPep = pctDe(cumplen, docentes.length);
  const efDoc = likert(deRol(alcance, Rol.DOCENTE), 'efectividadEstrategias');
  const efEst = likert(deRol(alcance, Rol.ESTUDIANTE), 'efectividadEstrategias');
  const acuerdo = pctDe(
    apEst.filter((e) => (e.general as Record<string, unknown>).acuerdoPedagogico === 1).length,
    apEst.length,
  );
  const valor: Record<string, number> = { APLICADA: 100, PARCIAL: 50, NO_APLICADA: 0 };
  const aplicadas = promedio(d.seguimientos.map((s) => valor[s] ?? 0));
  const usos = usoEstrategias(docentes);
  const kpis: Kpi[] = [
    {
      titulo: 'Docentes que cumplen el PEP',
      valor: pct(pctPep),
      nota: `${cumplen} de ${docentes.length} encuestas`,
    },
    { titulo: 'Efectividad según docentes', valor: sobre5(efDoc) },
    { titulo: 'Efectividad según estudiantes', valor: sobre5(efEst) },
    { titulo: 'Recomendaciones aplicadas', valor: pct(aplicadas), nota: 'Meta: 70 %' },
  ];
  if (!docentes.length && !alcance.length) {
    return {
      meta,
      kpis,
      bloques: [{ tipo: 'parrafo', texto: SIN_DATOS }],
      logros: [SIN_DATOS],
      impactos: [SIN_DATOS],
      porcentaje: 0,
    };
  }
  const siguiente = siguientePeriodo(d.periodo);
  const textoRec = d.seguimientos.length
    ? `De las recomendaciones del periodo anterior se evaluaron ${d.seguimientos.length}, con un nivel de aplicación de ${pct(aplicadas)} frente a la meta del 70 %.`
    : `En este periodo se registraron ${d.recomendacionesPeriodo} recomendaciones de mejora, que se aplicarán y evaluarán en el periodo ${siguiente}.`;
  const bloques: Bloque[] = [
    {
      tipo: 'parrafo',
      texto: `Meta: ${meta} En el periodo ${d.periodo.codigo} las estrategias se evaluaron con ${respuestas(d.encuestas)}. El PEP pide al menos 3 estrategias didácticas y 1 o 2 metodologías activas por unidad: ${pct(pctPep)} de las encuestas docentes cumplen ese criterio.`,
    },
  ];
  if (usos.length) {
    bloques.push({
      tipo: 'barras',
      titulo: 'Estrategias más usadas (% de encuestas docentes)',
      series: ['Encuestas docentes'],
      maximo: 100,
      unidad: ' %',
      filas: usos.slice(0, 8).map((u) => ({
        etiqueta: u.nombre,
        valores: [Number((pctDe(u.veces, docentes.length) ?? 0).toFixed(1))],
      })),
    });
  }
  bloques.push(
    {
      tipo: 'tabla',
      columnas: ['Indicador', 'Resultado'],
      filas: [
        ['Efectividad según docentes (1 a 5)', num(efDoc)],
        ['Efectividad según estudiantes (1 a 5)', num(efEst)],
        ['Estudiantes que confirman el acuerdo pedagógico', pct(acuerdo)],
        ['Recomendaciones registradas en el periodo', String(d.recomendacionesPeriodo)],
        ['Recomendaciones del periodo anterior evaluadas', String(d.seguimientos.length)],
        ['Nivel de aplicación de recomendaciones', pct(aplicadas)],
      ],
    },
    { tipo: 'parrafo', texto: textoRec },
  );
  const cumpleMeta = aplicadas !== null && aplicadas >= 70;
  if (aplicadas === null) {
    bloques.push({
      tipo: 'parrafo',
      texto: `El informe queda en el 90 % porque las recomendaciones serán aplicadas en el periodo ${siguiente}.`,
    });
  }
  const logros: string[] = [
    `Se evaluaron las estrategias pedagógicas del PEP con ${respuestas(d.encuestas)}.`,
  ];
  if (pctPep !== null)
    logros.push(
      `${pct(pctPep)} de las encuestas docentes cumple el mínimo de estrategias del PEP.`,
    );
  if (d.recomendacionesPeriodo)
    logros.push(`Se registraron ${d.recomendacionesPeriodo} recomendaciones de mejora.`);
  if (cumpleMeta) logros.push('Se alcanzó la meta del 70 % de recomendaciones aplicadas.');
  const impactos: string[] = [];
  if (efEst !== null)
    impactos.push(
      `Los estudiantes valoraron la efectividad de las estrategias en ${num(efEst)} sobre 5.`,
    );
  if (efDoc !== null)
    impactos.push(
      `Los docentes valoraron la efectividad de las estrategias en ${num(efDoc)} sobre 5.`,
    );
  if (usos[0]) impactos.push(`La estrategia más usada fue «${usos[0].nombre}».`);
  impactos.push(
    'El programa cuenta con un seguimiento periódico de las estrategias y de sus recomendaciones.',
  );
  return { meta, kpis, bloques, logros, impactos, porcentaje: cumpleMeta ? 100 : 90 };
}

function informe023(d: DatosInforme): Contenido {
  const meta =
    'Establecer un sistema de evaluación y retroalimentación de resultados de aprendizaje (RA) en el 100 % de las asignaturas del programa en un plazo de cuatro años a partir del 2026.';
  const alcance = deMomento(d.encuestas, Momento.ALCANCE);
  const est = deRol(alcance, Rol.ESTUDIANTE);
  const doc = deRol(alcance, Rol.DOCENTE);
  const unidades = new Set(doc.map((e) => e.curso.unidadId)).size;
  const pctUnidades = pctDe(unidades, d.totalUnidades) ?? 0;
  const metaAnio = Math.max(0, Math.min(100, ((d.periodo.anio - 2026 + 1) / 4) * 100));
  const retro = pctDe(
    doc.filter((e) => (e.general as Record<string, unknown>).retroalimentacionRa === 1).length,
    doc.length,
  );
  const coherencia = likert(est, 'evaluacionCoherente');
  const retroEst = likert(est, 'retroalimentacion');
  const kpis: Kpi[] = [
    {
      titulo: 'Unidades con seguimiento de RA',
      valor: pct(pctUnidades),
      nota: `${unidades} de ${d.totalUnidades}`,
    },
    { titulo: 'Meta del año', valor: pct(metaAnio) },
    { titulo: 'Docentes que retroalimentan RA', valor: pct(retro) },
    { titulo: 'Coherencia evaluación–RA', valor: sobre5(coherencia) },
  ];
  if (!alcance.length) {
    return {
      meta,
      kpis,
      bloques: [{ tipo: 'parrafo', texto: SIN_DATOS }],
      logros: [SIN_DATOS],
      impactos: [SIN_DATOS],
      porcentaje: 0,
    };
  }
  const niveles = alcance
    .flatMap((e) => e.items.map(nivelRespuesta))
    .filter((n): n is number => n !== null);
  const distribucion = NIVELES.map((n) => ({
    etiqueta: n.nombre,
    valores: [
      Number((pctDe(niveles.filter((x) => x === n.valor).length, niveles.length) ?? 0).toFixed(1)),
    ],
  }));
  const conDatos = d.competencias.filter(
    (c) => c.nivelPercibido !== null || c.aciertos !== null || c.logroDocente !== null,
  );
  const bloques: Bloque[] = [
    {
      tipo: 'parrafo',
      texto: `Meta: ${meta} Los syllabus cuentan con rúbricas de evaluación y el programa dispone del aplicativo de seguimiento curricular, creado en 2026 para aplicarse cada semestre. En el periodo ${d.periodo.codigo} se registraron ${respuestas(alcance)} de alcance. ${unidades} de ${d.totalUnidades} unidades (${pct(pctUnidades)}) tienen seguimiento docente de RA, frente a una meta de ${pct(metaAnio)} para ${d.periodo.anio}.`,
    },
    {
      tipo: 'barras',
      titulo: 'Distribución del nivel de alcance de los RA (% de respuestas)',
      series: ['Respuestas'],
      maximo: 100,
      unidad: ' %',
      filas: distribucion,
    },
    {
      tipo: 'tabla',
      columnas: ['Indicador del sistema de evaluación', 'Resultado'],
      filas: [
        ['Coherencia entre evaluación y RA, según estudiantes (1 a 5)', num(coherencia)],
        ['Retroalimentación oportuna, según estudiantes (1 a 5)', num(retroEst)],
        ['Docentes que retroalimentan sobre los RA', pct(retro)],
      ],
    },
  ];
  if (conDatos.length) {
    bloques.push(
      { tipo: 'subtitulo', texto: 'Resultados por competencia' },
      {
        tipo: 'tabla',
        columnas: ['Competencia', 'Unidades', 'Nivel percibido', '% aciertos', '% logro docente'],
        filas: conDatos.map((c) => [
          c.codigo,
          String(c.unidades),
          num(c.nivelPercibido),
          pct(c.aciertos),
          pct(c.logroDocente),
        ]),
      },
    );
  }
  const logros = [
    `${unidades} de ${d.totalUnidades} unidades cuentan con seguimiento docente de RA (${pct(pctUnidades)}).`,
    pctUnidades >= metaAnio
      ? `Se cumplió la meta de ${pct(metaAnio)} prevista para ${d.periodo.anio}.`
      : `El avance frente a la meta de ${pct(metaAnio)} para ${d.periodo.anio} continúa en curso.`,
    `Se midieron ${conDatos.length} competencias con la autoevaluación, las preguntas prácticas y el logro reportado por docentes.`,
  ];
  const altos = niveles.filter((n) => n >= 3).length;
  const impactos = [
    `${pct(pctDe(altos, niveles.length))} de las respuestas se ubica en nivel Alto o Superior.`,
  ];
  if (retro !== null)
    impactos.push(
      `${pct(retro)} de los docentes retroalimentó a sus estudiantes sobre su avance en los RA.`,
    );
  impactos.push(
    'El programa cuenta con evidencia por competencia para orientar sus decisiones de mejora.',
  );
  return {
    meta,
    kpis,
    bloques,
    logros,
    impactos,
    porcentaje: doc.length ? 100 : 50,
  };
}

const CONSTRUCTORES: Record<ClaveInforme, (d: DatosInforme) => Contenido> = {
  '021': informe021,
  '022': informe022,
  '023': informe023,
};

/** Una gráfica sin ningún valor no aporta: se quitan sus filas vacías o el bloque completo. */
function sinBarrasVacias(bloques: Bloque[]): Bloque[] {
  return bloques.flatMap((b): Bloque[] => {
    if (b.tipo !== 'barras') return [b];
    const filas = b.filas.filter((f) => f.valores.some((v) => v !== null));
    return filas.length ? [{ ...b, filas }] : [];
  });
}

export function construirContenido(clave: ClaveInforme, d: DatosInforme): Contenido {
  const c = CONSTRUCTORES[clave](d);
  return { ...c, bloques: sinBarrasVacias(c.bloques) };
}
