import type { DatosProgramador } from '@rae/shared';
import type { Content, TableCell } from 'pdfmake/interfaces';
import { pdfABuffer } from '../../infrastructure/pdf/impresora';
import { ContextoInforme, numeroTexto } from './contexto';
import { logoPlantilla } from './docx-tablas';
import { documento, LINEAS } from './pdf-docentes';
import { unidadConGrupo } from './programador-docx';
import {
  COLUMNAS_PROGRAMADOR,
  FechasProgramador,
  firmasProgramador,
  FORMATO_PROGRAMADOR,
} from './programador-firmas';

const GRIS = '#D9D9D9';
const vacio = {} as TableCell;
const et = (t: string, colSpan = 1): TableCell[] => [
  { text: t, bold: true, fillColor: GRIS, colSpan },
  ...Array.from({ length: colSpan - 1 }, () => vacio),
];
const val = (t: string, colSpan = 1): TableCell[] => [
  { text: t, colSpan },
  ...Array.from({ length: colSpan - 1 }, () => vacio),
];

/** PDF horizontal con el encabezado, las semanas y las firmas del F-DOC-052. */
export async function programadorPdf(
  d: DatosProgramador,
  c: ContextoInforme,
  f: FechasProgramador,
): Promise<Buffer> {
  const cab = (t: string, extra: Record<string, unknown> = {}): TableCell => ({
    text: t,
    bold: true,
    fillColor: GRIS,
    alignment: 'center',
    ...extra,
  });
  const [c0, c1, c2, , , c5, c6] = COLUMNAS_PROGRAMADOR;
  const contenido: Content[] = [
    {
      table: {
        widths: [110, '*', 85, 60, 110, 80],
        body: [
          [
            ...et('Facultad:'),
            ...val(d.facultad),
            ...et('Programa académico:', 2),
            ...val(d.programa, 2),
          ],
          [
            ...et('Unidad de formación:'),
            ...val(unidadConGrupo(d)),
            ...et('No. créditos:'),
            ...val(numeroTexto(d.creditos)),
            ...et('No. horas semanales:'),
            ...val(numeroTexto(d.horasSemana)),
          ],
          [
            ...et('Docente:'),
            ...val(c.docente.nombre, 3),
            ...et('Periodo académico:'),
            ...val(c.periodo.codigo),
          ],
          [...et('Objetivo de aprendizaje:'), ...val(d.objetivo, 5)],
        ],
      },
      layout: LINEAS,
      fontSize: 8.5,
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        headerRows: 2,
        dontBreakRows: true,
        widths: [48, '*', 100, 110, 110, 110, 100],
        body: [
          [
            cab(c0, { rowSpan: 2 }),
            cab(c1, { rowSpan: 2 }),
            cab(c2, { rowSpan: 2 }),
            cab('Actividades/ evidencias de aprendizaje', { colSpan: 2 }),
            vacio,
            cab(c5, { rowSpan: 2 }),
            cab(c6, { rowSpan: 2 }),
          ],
          [
            vacio,
            vacio,
            vacio,
            cab('Individuales', { fontSize: 7.5 }),
            cab('Grupales', { fontSize: 7.5 }),
            vacio,
            vacio,
          ],
          ...d.semanas.map((s): TableCell[] => [
            { text: String(s.semana), alignment: 'center' },
            s.contenidos,
            s.didacticas,
            s.individuales,
            s.grupales,
            s.recursos,
            s.observaciones,
          ]),
        ],
      },
      layout: LINEAS,
      fontSize: 8.5,
      margin: [0, 0, 0, 10],
    },
    {
      unbreakable: true,
      table: {
        widths: ['*', '*', '*'],
        body: [
          firmasProgramador(d, c, f).map((x) => ({
            stack: [
              x.rotulo,
              { text: 'Firma: ____________________________________', margin: [0, 14, 0, 4] },
              `Nombre y Apellidos Completos: ${x.nombre}`,
              `Cargo: ${x.cargo}`,
              `${x.etiquetaFecha}: ${x.fecha}`,
            ],
          })),
        ],
      },
      layout: LINEAS,
      fontSize: 7,
    },
  ];
  return pdfABuffer(
    documento(
      FORMATO_PROGRAMADOR,
      await logoPlantilla('catedra.docx'),
      contenido,
      `Programador de clases - ${c.docente.nombre}`,
      true,
    ),
  );
}
