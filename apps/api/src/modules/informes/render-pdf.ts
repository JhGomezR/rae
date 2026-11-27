import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { pdfABuffer } from '../../infrastructure/pdf/impresora';
import { Bloque, ClaveInforme, Firmante, Informe, TEXTOS_PLANTILLA } from './informe.tipos';
import { CARPETA_PLANTILLAS, COLORES_SERIE } from './render-docx';

export const PAGINA = { ancho: 612, alto: 1008 };
export const MARGEN = 85;
const ANCHO_INTERNO = PAGINA.ancho - MARGEN * 2 - 12;

const LINEAS = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#000000',
  vLineColor: () => '#000000',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};
const LINEAS_INTERNAS = { ...LINEAS, hLineColor: () => '#808080', vLineColor: () => '#808080' };

function tabla(columnas: string[], filas: string[][], pesos?: number[]): ContentTable {
  const primera = columnas.length === 2 ? '*' : columnas.length >= 5 ? 100 : 150;
  const total = pesos?.reduce((s, x) => s + x, 0) ?? 0;
  const widths =
    pesos && total
      ? pesos.map((w) => (w / total) * (ANCHO_INTERNO - 4 * columnas.length))
      : columnas.map((_, i) => (i === 0 ? primera : columnas.length === 2 ? 70 : '*'));
  // Columnas anchas (texto largo) a la izquierda; las cortas, centradas.
  const izquierda = (i: number) => i === 0 || (!!pesos && (pesos[i] ?? 0) / total >= 0.3);
  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths,
      body: [
        columnas.map((c, i) => ({
          text: c,
          bold: true,
          fontSize: 8.5,
          fillColor: '#E7E6E6',
          alignment: izquierda(i) ? ('left' as const) : ('center' as const),
        })),
        ...filas.map((f) =>
          f.map((v, i) => ({
            text: v,
            fontSize: 8.5,
            alignment: izquierda(i) ? ('left' as const) : ('center' as const),
          })),
        ),
      ],
    },
    layout: LINEAS_INTERNAS,
    margin: [0, 2, 0, 8],
  };
}

function barras(b: Extract<Bloque, { tipo: 'barras' }>): Content {
  const anchoEtiqueta = 150;
  const anchoValor = 42;
  const anchoBarra = ANCHO_INTERNO - anchoEtiqueta - anchoValor - 12;
  const filas: Content[] = b.filas.map((f) => ({
    columns: [
      { width: anchoEtiqueta, text: f.etiqueta, fontSize: 8.5 },
      {
        width: anchoBarra,
        stack: b.series.map((_, s) => {
          const v = f.valores[s] ?? null;
          const w = v === null ? 0 : (Math.min(v, b.maximo) / b.maximo) * anchoBarra;
          return {
            canvas: w
              ? [
                  {
                    type: 'rect' as const,
                    x: 0,
                    y: 1,
                    w,
                    h: 8,
                    r: 1,
                    color: `#${COLORES_SERIE[s]}`,
                  },
                ]
              : [{ type: 'line' as const, x1: 0, y1: 5, x2: 0, y2: 5, lineWidth: 0 }],
            margin: [0, 0, 0, 1] as [number, number, number, number],
            height: 10,
          };
        }),
      },
      {
        width: anchoValor,
        stack: b.series.map((_, s) => {
          const v = f.valores[s] ?? null;
          return {
            text:
              v === null
                ? '—'
                : `${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${b.unidad}`,
            fontSize: 8,
            alignment: 'right' as const,
            lineHeight: 1,
            margin: [0, 0, 0, 1.5] as [number, number, number, number],
          };
        }),
      },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 3],
  }));
  const leyenda: Content[] =
    b.series.length > 1
      ? [
          {
            text: b.series.flatMap((n, i) => [
              { text: '■ ', color: `#${COLORES_SERIE[i]}` },
              { text: `${n}     ` },
            ]),
            fontSize: 8.5,
            margin: [0, 0, 0, 3],
          },
        ]
      : [];
  return {
    unbreakable: true,
    stack: [
      { text: b.titulo, bold: true, fontSize: 9.5, margin: [0, 2, 0, 3] },
      ...leyenda,
      ...filas,
    ],
    margin: [0, 0, 0, 6],
  };
}

export function bloquePdf(b: Bloque): Content {
  if (b.tipo === 'parrafo') return { text: b.texto, alignment: 'justify', margin: [0, 0, 0, 6] };
  if (b.tipo === 'subtitulo') return { text: b.texto, bold: true, margin: [0, 4, 0, 4] };
  if (b.tipo === 'tabla') return tabla(b.columnas, b.filas, b.anchos);
  return barras(b);
}

const etiqueta = (nombre: string, valor?: string): Content => ({
  text: [{ text: nombre, bold: true }, ...(valor ? [{ text: valor }] : [])],
});
const fila = (contenido: Content): TableCell[] => [{ stack: [contenido], colSpan: 2 }, {}];

export async function generarPdf(clave: ClaveInforme, i: Informe, f: Firmante): Promise<Buffer> {
  const plantilla = TEXTOS_PLANTILLA[clave];
  const zip = await JSZip.loadAsync(await readFile(join(CARPETA_PLANTILLAS, `${clave}.docx`)));
  const membrete = await zip.file('word/media/image2.jpg')?.async('base64');
  const lista = (l: string[]): Content => ({ ul: l, alignment: 'justify', margin: [8, 3, 0, 3] });

  const cuerpo: TableCell[][] = [
    fila(etiqueta('FACTOR', ': ASPECTOS ACADÉMICOS Y RESULTADOS DE APRENDIZAJE.')),
    fila({ stack: [etiqueta('CARACTERÍSTICA', ':'), ...plantilla.caracteristicas] }),
    fila({
      ...(etiqueta('ASPECTO A MEJORAR', `: ${plantilla.aspecto}`) as object),
      alignment: 'justify',
    } as Content),
    fila({
      stack: [
        etiqueta('ACCIÓN:'),
        { ol: [plantilla.accion], alignment: 'justify', margin: [14, 0, 0, 0] },
      ],
    }),
    [
      { stack: [etiqueta('Programa académico/ Institucional:'), i.programa] },
      { stack: [etiqueta('Lugar de desarrollo:'), i.lugar] },
    ],
    [
      { stack: [etiqueta('Fecha de entrega:'), i.fechaEntrega] },
      { stack: [etiqueta('Porcentaje de terminación del documento', ':'), `${i.porcentaje}%`] },
    ],
    fila({
      stack: [
        {
          ol: [{ text: plantilla.accion, bold: true }],
          alignment: 'justify',
          margin: [14, 0, 0, 8],
        },
        ...i.bloques.map(bloquePdf),
      ],
    }),
    fila({ stack: [etiqueta('Logros:'), lista(i.logros)] }),
    fila({ stack: [etiqueta('Impactos'), lista(i.impactos)] }),
    fila({ stack: [etiqueta('Presupuesto invertido:'), i.presupuesto] }),
  ];

  const firma: Content = f.firma
    ? {
        image: `data:${f.firma.tipo};base64,${f.firma.datos.toString('base64')}`,
        fit: [199, 61],
        alignment: 'center',
        margin: [0, 8, 0, -16],
      }
    : { text: ' ', margin: [0, 30, 0, 0] };

  const doc: TDocumentDefinitions = {
    pageSize: { width: PAGINA.ancho, height: PAGINA.alto },
    pageMargins: [MARGEN, 140, MARGEN, 78],
    info: { title: `${i.titulo} - ${i.periodo}`, author: 'Seguimiento RAE' },
    background: membrete
      ? { image: `data:image/jpeg;base64,${membrete}`, width: PAGINA.ancho, height: PAGINA.alto }
      : undefined,
    header: {
      text: 'ACREDITACIÓN Y AUTOEVALUACIÓN',
      bold: true,
      alignment: 'right',
      fontSize: 10,
      margin: [MARGEN, 96, MARGEN, 0],
    },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.1 },
    content: [
      {
        text: 'FORMATO PARA PLANES DE MEJORAMIENTO',
        bold: true,
        fontSize: 11,
        alignment: 'center',
        margin: [0, 0, 0, 12],
      },
      { table: { widths: ['45%', '55%'], body: cuerpo }, layout: LINEAS },
      {
        // Anexos y firma siempre juntos: la firma nunca queda sola en una página.
        unbreakable: true,
        stack: [
          {
            table: { widths: ['*'], body: [[{ stack: [etiqueta('Anexos:'), i.anexos] }]] },
            layout: LINEAS,
            margin: [0, 0, 0, 14],
          },
          firma,
          { text: f.nombre || '______________________________', bold: true, alignment: 'center' },
          { text: f.cargo, alignment: 'center' },
        ],
      },
    ],
  };
  return pdfABuffer(doc);
}
