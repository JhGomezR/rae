import { DatosEjecucion, LABORES_EJECUCION } from '@rae/shared';
import type { Content, TableCell } from 'pdfmake/interfaces';
import { pdfABuffer } from '../../infrastructure/pdf/impresora';
import { ContextoInforme, fechaCorta, FORMATO_EJECUCION, numeroTexto } from './contexto';
import { logoPlantilla } from './docx-tablas';
import { filasDe } from './ejecucion-excel';
import { documento, LINEAS } from './pdf-docentes';

const GRIS = '#D9D9D9';
const t = (texto: string, o: object = {}): TableCell => ({
  text: texto,
  fontSize: 6.5,
  alignment: 'center',
  ...o,
});
const cab = (texto: string, o: object = {}) => t(texto, { bold: true, fillColor: GRIS, ...o });

/** PDF horizontal con la misma tabla del F-DOC-004. */
export async function ejecucionPdf(
  d: DatosEjecucion,
  c: ContextoInforme,
  fechaAprobacion: string,
): Promise<Buffer> {
  const vacio = {} as TableCell;
  const meses = Array.from({ length: 12 }, (_, i) => cab(String(i + 1)));
  const cuerpo: TableCell[][] = [
    [
      cab('LABOR DE DOCENCIA', { rowSpan: 2 }),
      cab('ACTIVIDADES', { rowSpan: 2 }),
      cab('TAREAS Y/O ACCIONES PARA CUMPLIR', { rowSpan: 2 }),
      cab('META', { rowSpan: 2 }),
      cab('INDICADOR', { rowSpan: 2 }),
      cab('HORAS', { rowSpan: 2 }),
      cab('SEGUIMIENTO', { colSpan: 3 }),
      vacio,
      vacio,
      cab('EVIDENCIAS', { rowSpan: 2 }),
      cab('Tiempo (Meses)', { colSpan: 12 }),
      ...Array.from({ length: 11 }, () => vacio),
      cab('OBSERVACIONES', { rowSpan: 2 }),
    ],
    [
      vacio,
      vacio,
      vacio,
      vacio,
      vacio,
      vacio,
      cab('CUMPLIMIENTO 1 CORTE % AVANCE', { fontSize: 5 }),
      cab('CUMPLIMIENTO 2 CORTE % AVANCE', { fontSize: 5 }),
      cab('CUMPLIMIENTO 3 CORTE % AVANCE', { fontSize: 5 }),
      vacio,
      ...meses,
      vacio,
    ],
  ];
  for (const labor of LABORES_EJECUCION) {
    const filasLabor = labor.actividades.reduce((s, a) => s + filasDe(d, a.clave).length, 0);
    let primeraLabor = true;
    for (const a of labor.actividades) {
      const filas = filasDe(d, a.clave);
      filas.forEach((f, i) => {
        cuerpo.push([
          primeraLabor ? t(labor.titulo, { bold: true, rowSpan: filasLabor }) : vacio,
          i === 0 ? t(a.actividad, { rowSpan: filas.length }) : vacio,
          t(f?.tarea ?? ''),
          t(f?.meta ?? ''),
          t(f?.indicador ?? ''),
          t(numeroTexto(f?.horas)),
          t(numeroTexto(f?.corte1, '%')),
          t(numeroTexto(f?.corte2, '%')),
          t(numeroTexto(f?.corte3, '%')),
          t(f?.evidencias ?? ''),
          ...Array.from({ length: 12 }, (_, m) =>
            t(f?.meses.includes(m + 1) ? 'X' : '', { bold: true }),
          ),
          t(f?.observaciones ?? ''),
        ]);
        primeraLabor = false;
      });
    }
  }
  const dato = (k: string, v: string): Content => ({
    text: [{ text: `${k} `, bold: true }, v],
    fontSize: 8,
  });
  const contenido: Content[] = [
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            dato('DOCENTE:', c.docente.nombre),
            dato('FACULTAD:', d.facultad),
            dato('FECHA DE ELABORACIÓN:', fechaCorta(d.fechaElaboracion)),
          ],
          [
            dato('ESCALAFÓN:', d.escalafon),
            dato('PERIODO:', `${c.periodo.codigo} · corte ${d.corte}`),
            dato('FECHA DE APROBACIÓN:', fechaAprobacion),
          ],
        ],
      },
      layout: LINEAS,
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        headerRows: 2,
        widths: [
          38,
          66,
          88,
          64,
          64,
          26,
          36,
          36,
          36,
          70,
          ...Array.from({ length: 12 }, () => 9),
          '*',
        ],
        body: cuerpo,
      },
      layout: LINEAS,
    },
    {
      unbreakable: true,
      margin: [0, 40, 0, 0],
      columns: [
        {
          stack: [
            '______________________________',
            { text: c.docente.nombre, bold: true },
            'Docente',
          ],
          alignment: 'center',
        },
        {
          stack: [
            '______________________________',
            { text: c.firmantes.director || ' ', bold: true },
            'Director de Programa',
          ],
          alignment: 'center',
        },
      ],
    },
  ];
  return pdfABuffer(
    documento(
      FORMATO_EJECUCION,
      await logoPlantilla('agenda.docx'),
      contenido,
      `Informe de ejecución de la agenda - ${c.docente.nombre}`,
      true,
    ),
  );
}
