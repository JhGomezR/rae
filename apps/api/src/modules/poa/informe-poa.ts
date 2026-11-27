import { Bloque } from '../informes/informe.tipos';
import type { PoaCompleto } from './poa.service';
import { Desempeno, ESTADOS, EstadoActividad, MESES, MESES_LARGOS, SEMAFOROS } from './poa.tipos';

export interface InformePoa {
  titulo: string;
  subtitulo: string;
  bloques: Bloque[];
  firmante: string;
  cargo: string;
}

const pct = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const pesos = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const corto = (t: string, n = 70) => {
  const l = t.replace(/\s+/g, ' ').trim();
  return l.length > n ? `${l.slice(0, n - 1)}…` : l;
};
const fecha = (d: Date) =>
  `${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;

function analisis(p: PoaCompleto, d: Desempeno, corte: string): string[] {
  const e = d.estados;
  const textos = [
    `Con corte a ${corte}, el Plan Operativo Anual ${p.vigencia} registra ${d.actividades} actividades. El avance real promedio es de ${pct(d.avance)} frente a un avance esperado de ${pct(d.esperado)} según la programación mensual, lo que da un índice de desempeño de ${pct(d.indice)}, calificado como ${SEMAFOROS[d.semaforo].nombre.toLowerCase()} (${SEMAFOROS[d.semaforo].rango}).`,
    `Del total, ${e.CUMPLIDA} actividades están cumplidas, ${e.EN_CURSO} en curso, ${e.ATRASADA} atrasadas y ${e.SIN_INICIAR} sin iniciar.`,
  ];
  const ordenados = [...d.porPilar].sort((a, b) => b.avance - a.avance);
  if (ordenados.length > 1) {
    const [mejor, peor] = [ordenados[0], ordenados[ordenados.length - 1]];
    if (mejor && peor && mejor.clave !== peor.clave) {
      textos.push(
        `El eje con mayor avance es «${corto(mejor.clave, 90)}» (${pct(mejor.avance)}) y el de menor avance es «${corto(peor.clave, 90)}» (${pct(peor.avance)}).`,
      );
    }
  }
  const atrasadas = d.porActividad.filter((a) => a.estado === 'ATRASADA');
  textos.push(
    atrasadas.length
      ? `Requieren atención prioritaria: ${atrasadas.map((a) => `No. ${a.numero} «${corto(a.actividad, 60)}» (${pct(a.avance)} de ${pct(a.esperado)} esperado)`).join('; ')}. Se recomienda revisar sus recursos y responsables y, si es necesario, reprogramar los meses de ejecución.`
      : 'Ninguna actividad presenta atraso frente a su programación.',
  );
  return textos;
}

/** Contenido del informe de seguimiento y desempeño del POA (lo comparten Word y PDF). */
export function construirInformePoa(p: PoaCompleto, d: Desempeno): InformePoa {
  const corte = d.mesCorte
    ? `${MESES_LARGOS[d.mesCorte - 1]} de ${p.vigencia}`
    : 'inicio de la vigencia';
  const meses = (m: number[]) => (m.length ? m.map((x) => MESES[x - 1]).join(', ') : '—');
  const estados = Object.keys(ESTADOS) as EstadoActividad[];
  const seguimientos = p.actividades
    .flatMap((a) =>
      a.seguimientos
        .filter((s) => s.mes <= d.mesCorte)
        .map((s) => [
          String(a.numero),
          MESES[s.mes - 1] ?? '',
          pct(s.avance),
          s.logro,
          s.evidencia ?? '—',
        ]),
    )
    .slice(0, 200);

  const bloques: Bloque[] = [
    { tipo: 'subtitulo', texto: '1. Información básica' },
    {
      tipo: 'tabla',
      columnas: ['Campo', 'Información'],
      anchos: [35, 65],
      filas: [
        ['Dependencia', p.dependencia],
        ['Área / Facultad', p.areaFacultad || '—'],
        ['Responsable', p.responsable],
        ['Cargo', p.cargo || '—'],
        ['Vigencia', String(p.vigencia)],
        ['Fecha de elaboración del POA', fecha(p.fechaElaboracion)],
        ['Fecha de corte del seguimiento', corte],
      ],
    },
    { tipo: 'subtitulo', texto: '2. Resumen del desempeño' },
    {
      tipo: 'tabla',
      columnas: ['Indicador', 'Resultado'],
      anchos: [60, 40],
      filas: [
        ['Actividades programadas', String(d.actividades)],
        ['Avance esperado promedio', pct(d.esperado)],
        ['Avance real promedio', pct(d.avance)],
        ['Índice de desempeño (real / esperado)', pct(d.indice)],
        ['Semáforo', `${SEMAFOROS[d.semaforo].nombre} (${SEMAFOROS[d.semaforo].rango})`],
        ...estados.map((k) => [`Actividades ${ESTADOS[k].toLowerCase()}`, String(d.estados[k])]),
        ['Presupuesto programado', pesos(d.presupuesto)],
        ['Presupuesto ejecutado', pesos(d.ejecutado)],
      ],
    },
    ...analisis(p, d, corte).map((t): Bloque => ({ tipo: 'parrafo', texto: t })),
    { tipo: 'subtitulo', texto: '3. Gráficos estadísticos' },
    {
      tipo: 'barras',
      titulo: 'Estado de las actividades (número de actividades)',
      series: ['Actividades'],
      maximo: Math.max(1, d.actividades),
      unidad: '',
      filas: estados.map((k) => ({ etiqueta: ESTADOS[k], valores: [d.estados[k]] })),
    },
    {
      tipo: 'barras',
      titulo: 'Curva de avance acumulado por mes (%)',
      series: ['Avance real', 'Avance esperado'],
      maximo: 100,
      unidad: ' %',
      filas: d.porMes.map((m) => ({
        etiqueta: MESES_LARGOS[m.mes - 1] ?? '',
        valores: [m.avance, m.esperado],
      })),
    },
    {
      tipo: 'barras',
      titulo: 'Avance por eje del plan de gobierno (%)',
      series: ['Avance real', 'Avance esperado'],
      maximo: 100,
      unidad: ' %',
      filas: d.porPilar.map((g) => ({
        etiqueta: `${corto(g.clave, 60)} (${g.actividades})`,
        valores: [g.avance, g.esperado],
      })),
    },
    {
      tipo: 'barras',
      titulo: 'Avance por tipo de indicador (%)',
      series: ['Avance real', 'Avance esperado'],
      maximo: 100,
      unidad: ' %',
      filas: d.porTipo.map((g) => ({
        etiqueta: `${g.clave} (${g.actividades})`,
        valores: [g.avance, g.esperado],
      })),
    },
    {
      tipo: 'barras',
      titulo: 'Actividades programadas por mes',
      series: ['Actividades'],
      maximo: Math.max(1, ...d.porMes.map((m) => m.programadas)),
      unidad: '',
      filas: d.porMes.map((m) => ({
        etiqueta: MESES_LARGOS[m.mes - 1] ?? '',
        valores: [m.programadas],
      })),
    },
    {
      tipo: 'barras',
      titulo: 'Avance por actividad (%)',
      series: ['Avance real', 'Avance esperado'],
      maximo: 100,
      unidad: ' %',
      filas: d.porActividad.map((a) => ({
        etiqueta: `${a.numero}. ${corto(a.actividad, 55)}`,
        valores: [a.avance, a.esperado],
      })),
    },
    { tipo: 'subtitulo', texto: '4. Detalle de las actividades' },
    {
      tipo: 'tabla',
      columnas: ['No.', 'Actividad', 'Meses', 'Esperado', 'Real', 'Estado'],
      anchos: [6, 46, 16, 11, 10, 11],
      filas: p.actividades.map((a) => {
        const x = d.porActividad.find((y) => y.id === a.id);
        return [
          String(a.numero),
          corto(a.actividad, 160),
          meses(a.meses),
          pct(x?.esperado ?? 0),
          pct(x?.avance ?? 0),
          x ? ESTADOS[x.estado] : '—',
        ];
      }),
    },
    { tipo: 'subtitulo', texto: '5. Logros reportados en el seguimiento' },
    seguimientos.length
      ? {
          tipo: 'tabla',
          columnas: ['No.', 'Mes', 'Avance', 'Logro', 'Evidencia'],
          anchos: [6, 8, 10, 52, 24],
          filas: seguimientos,
        }
      : { tipo: 'parrafo', texto: 'No existen datos para esta sección.' },
  ];

  return {
    titulo: 'INFORME DE SEGUIMIENTO Y DESEMPEÑO DEL PLAN OPERATIVO ANUAL (POA)',
    subtitulo: `Vigencia ${p.vigencia} · Formato F-PIN-001 · Corte: ${corte}`,
    bloques,
    firmante: p.responsable,
    cargo: p.cargo,
  };
}
