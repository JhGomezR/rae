import {
  cumplimientoEjecucion,
  DatosEjecucion,
  FilaEjecucion,
  LABORES_EJECUCION,
} from '@rae/shared';
import { Bloque } from '../informes/informe.tipos';
import { bloqueXml, parrafo } from '../informes/render-docx';
import { ContextoInforme, fechaCorta, numeroTexto } from './contexto';
import { armarDocx, celda, fila, p, tabla } from './docx-tablas';

/** El membrete de la agenda convertido al del F-DOC-004 (código, fecha y título). */
const MEMBRETE: [string, string][] = [
  ['-056', '-004'],
  ['0', '18'],
  ['9', ''],
  ['12', '03'],
  ['25', '26'],
  ['AGENDA SEMANAL ', 'INFORME DE EJECUCIÓN DE LA AGENDA SEMANAL '],
];

const corto = (t: string, n = 60) => {
  const l = t.replace(/\s+/g, ' ').trim();
  return l.length > n ? `${l.slice(0, n - 1)}…` : l;
};
const pct = (n: number | null) => (n === null ? '—' : `${numeroTexto(n)} %`);
const valor = (f: FilaEjecucion, corte: 1 | 2) => (corte === 2 ? f.corte2 : f.corte1);
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Estadísticas del informe: estados de las tareas, horas por labor y meses. */
export function estadisticasEjecucion(d: DatosEjecucion) {
  const tareas = d.filas.filter((f) => f.tarea);
  const estados = { cumplidas: 0, enAvance: 0, sinAvance: 0 };
  for (const f of tareas) {
    const v = valor(f, d.corte) ?? 0;
    if (v >= 100) estados.cumplidas += 1;
    else if (v > 0) estados.enAvance += 1;
    else estados.sinAvance += 1;
  }
  const horasPorLabor = LABORES_EJECUCION.map((l) => ({
    titulo: l.titulo,
    horas: tareas
      .filter((f) => l.actividades.some((a) => a.clave === f.actividad))
      .reduce((s, f) => s + (f.horas ?? 0), 0),
  }));
  const porMes = MESES.map((m, i) => ({
    mes: m,
    tareas: tareas.filter((f) => f.meses.includes(i + 1)).length,
  }));
  return {
    tareas,
    estados,
    horasPorLabor,
    horas: horasPorLabor.reduce((s, h) => s + h.horas, 0),
    porMes,
    corte1: cumplimientoEjecucion(d, 1),
    corte2: cumplimientoEjecucion(d, 2),
  };
}

function bloques(d: DatosEjecucion, c: ContextoInforme, aprobacion: string): Bloque[] {
  const e = estadisticasEjecucion(d);
  const actual = d.corte === 2 ? e.corte2 : e.corte1;
  const series = d.corte === 2 ? ['Corte 1', 'Corte 2'] : ['Corte 1'];
  const dos = (a: number | null, b: number | null) => (d.corte === 2 ? [a, b] : [a]);
  const nombreActividad = (clave: string) =>
    LABORES_EJECUCION.flatMap((l) => l.actividades).find((a) => a.clave === clave)?.actividad ??
    clave;
  const ordenadas = [...e.corte1.porLabor].map((l, i) => ({
    ...l,
    c2: e.corte2.porLabor[i]?.cumplimiento ?? null,
  }));
  const conValor = actual.porLabor
    .filter((l) => l.cumplimiento !== null)
    .sort((a, b) => (b.cumplimiento ?? 0) - (a.cumplimiento ?? 0));
  const analisis = [
    `En el corte ${d.corte} del periodo ${c.periodo.codigo}, ${c.docente.nombre} reporta ${e.tareas.length} tareas en su agenda, con ${numeroTexto(e.horas)} horas registradas y un cumplimiento promedio de ${pct(actual.total)}.`,
    `Tareas cumplidas: ${e.estados.cumplidas}; en avance: ${e.estados.enAvance}; sin avance reportado: ${e.estados.sinAvance}.`,
    ...(d.corte === 2 && e.corte1.total !== null && e.corte2.total !== null
      ? [
          `Frente al primer corte (${pct(e.corte1.total)}), el cumplimiento ${e.corte2.total >= e.corte1.total ? 'aumentó' : 'disminuyó'} ${numeroTexto(Math.abs(Math.round((e.corte2.total - e.corte1.total) * 10) / 10))} puntos.`,
        ]
      : []),
    ...(conValor.length > 1
      ? [
          `La labor con mayor cumplimiento es ${conValor[0]?.titulo.toLowerCase()} (${pct(conValor[0]?.cumplimiento ?? null)}) y la de menor, ${conValor[conValor.length - 1]?.titulo.toLowerCase()} (${pct(conValor[conValor.length - 1]?.cumplimiento ?? null)}).`,
        ]
      : []),
  ];
  const conObservacion = e.tareas.filter((f) => f.observaciones);
  return [
    { tipo: 'subtitulo', texto: '1. Información general' },
    {
      tipo: 'tabla',
      columnas: ['Campo', 'Información'],
      anchos: [35, 65],
      filas: [
        ['Docente', c.docente.nombre],
        ['Identificación', c.docente.documento],
        ['Escalafón', d.escalafon],
        ['Facultad', d.facultad],
        ['Periodo', `${c.periodo.codigo} · corte ${d.corte}`],
        ['Fecha de elaboración', fechaCorta(d.fechaElaboracion)],
        ['Fecha de aprobación', aprobacion || 'Pendiente'],
      ],
    },
    { tipo: 'subtitulo', texto: '2. Resumen del cumplimiento' },
    {
      tipo: 'tabla',
      columnas: ['Indicador', 'Resultado'],
      anchos: [60, 40],
      filas: [
        ['Tareas registradas', String(e.tareas.length)],
        ['Horas registradas', numeroTexto(e.horas)],
        ['Cumplimiento promedio corte 1', pct(e.corte1.total)],
        ...(d.corte === 2 ? [['Cumplimiento promedio corte 2', pct(e.corte2.total)]] : []),
        ['Tareas cumplidas (100 %)', String(e.estados.cumplidas)],
        ['Tareas en avance', String(e.estados.enAvance)],
        ['Tareas sin avance', String(e.estados.sinAvance)],
      ],
    },
    ...analisis.map((t): Bloque => ({ tipo: 'parrafo', texto: t })),
    { tipo: 'subtitulo', texto: '3. Gráficos estadísticos' },
    {
      tipo: 'barras',
      titulo: 'Cumplimiento por labor (%)',
      series,
      maximo: 100,
      unidad: ' %',
      filas: ordenadas.map((l) => ({
        etiqueta: `${l.titulo} (${l.tareas})`,
        valores: dos(l.cumplimiento, l.c2),
      })),
    },
    {
      tipo: 'barras',
      titulo: `Estado de las tareas en el corte ${d.corte} (número de tareas)`,
      series: ['Tareas'],
      maximo: Math.max(1, e.tareas.length),
      unidad: '',
      filas: [
        { etiqueta: 'Cumplidas (100 %)', valores: [e.estados.cumplidas] },
        { etiqueta: 'En avance', valores: [e.estados.enAvance] },
        { etiqueta: 'Sin avance', valores: [e.estados.sinAvance] },
      ],
    },
    {
      tipo: 'barras',
      titulo: 'Horas registradas por labor',
      series: ['Horas'],
      maximo: Math.max(1, ...e.horasPorLabor.map((h) => h.horas)),
      unidad: ' h',
      filas: e.horasPorLabor.map((h) => ({ etiqueta: h.titulo, valores: [h.horas] })),
    },
    {
      tipo: 'barras',
      titulo: 'Tareas programadas por mes',
      series: ['Tareas'],
      maximo: Math.max(1, ...e.porMes.map((m) => m.tareas)),
      unidad: '',
      filas: e.porMes.map((m) => ({ etiqueta: m.mes, valores: [m.tareas] })),
    },
    {
      tipo: 'barras',
      titulo: 'Cumplimiento por tarea (%)',
      series,
      maximo: 100,
      unidad: ' %',
      filas: e.tareas.map((f) => ({ etiqueta: corto(f.tarea), valores: dos(f.corte1, f.corte2) })),
    },
    { tipo: 'subtitulo', texto: '4. Detalle de las actividades' },
    e.tareas.length
      ? {
          tipo: 'tabla',
          columnas: [
            'Actividad',
            'Tarea',
            'Meta',
            'Indicador',
            'Horas',
            'Corte 1',
            'Corte 2',
            'Evidencias',
          ],
          anchos: [16, 20, 13, 13, 8, 9, 9, 12],
          filas: e.tareas.map((f) => [
            corto(nombreActividad(f.actividad), 70),
            f.tarea,
            f.meta,
            f.indicador,
            numeroTexto(f.horas),
            pct(f.corte1),
            pct(f.corte2),
            f.evidencias,
          ]),
        }
      : { tipo: 'parrafo', texto: 'No existen datos para esta sección.' },
    { tipo: 'subtitulo', texto: '5. Observaciones' },
    conObservacion.length
      ? {
          tipo: 'tabla',
          columnas: ['Tarea', 'Observación'],
          anchos: [40, 60],
          filas: conObservacion.map((f) => [corto(f.tarea, 90), f.observaciones]),
        }
      : { tipo: 'parrafo', texto: 'Sin observaciones.' },
    ...(c.observacion && (c.estado === 'APROBADO' || c.estado === 'AJUSTES')
      ? [
          { tipo: 'subtitulo', texto: '6. Observaciones de la revisión' } as Bloque,
          { tipo: 'parrafo', texto: c.observacion } as Bloque,
        ]
      : []),
  ];
}

/** Word de presentación del F-DOC-004: resumen, análisis y gráficos estadísticos. */
export function ejecucionDocx(
  d: DatosEjecucion,
  c: ContextoInforme,
  aprobacion: string,
): Promise<Buffer> {
  const mitad = 4250;
  const linea = '______________________________';
  const cuerpo = [
    parrafo('INFORME DE EJECUCIÓN DE LA AGENDA SEMANAL DOCENTE', {
      negrita: true,
      jc: 'center',
      tamano: 24,
      despues: 60,
      antes: 120,
    }),
    parrafo(`Periodo ${c.periodo.codigo} · Corte ${d.corte}`, {
      jc: 'center',
      tamano: 20,
      despues: 240,
      color: '595959',
    }),
    ...bloques(d, c, aprobacion).map(bloqueXml),
    p('', { despues: 900 }),
    tabla(
      [mitad, mitad],
      [
        fila([celda(p(linea, { jc: 'center' }), mitad), celda(p(linea, { jc: 'center' }), mitad)]),
        fila([
          celda(p(c.docente.nombre, { negrita: true, jc: 'center' }), mitad),
          celda(p(c.firmantes.director || ' ', { negrita: true, jc: 'center' }), mitad),
        ]),
        fila([
          celda(p('Docente', { jc: 'center' }), mitad),
          celda(p('Director de Programa', { jc: 'center' }), mitad),
        ]),
      ],
      true,
    ),
  ].join('');
  return armarDocx(
    'agenda.docx',
    cuerpo,
    `Informe de ejecución de la agenda - ${c.docente.nombre}`,
    MEMBRETE,
  );
}
