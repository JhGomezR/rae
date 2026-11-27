import {
  DatosAgenda,
  DatosCatedra,
  DEDICACIONES,
  ESCALAFONES,
  horasAgenda,
  RESPONSABILIDADES_AGENDA,
  SECCIONES_AGENDA,
  SeccionAgenda,
} from '@rae/shared';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { pdfABuffer } from '../../infrastructure/pdf/impresora';
import { porcentajes } from './catedra-docx';
import {
  ContextoInforme,
  EncabezadoFormato,
  fechaCorta,
  fechaLarga,
  FORMATO_AGENDA,
  FORMATO_CATEDRA,
  letraPeriodo,
  numeroTexto,
} from './contexto';
import { logoPlantilla } from './docx-tablas';

const GRIS = '#D9D9D9';
export const LINEAS = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  paddingLeft: () => 3,
  paddingRight: () => 3,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

export function documento(
  f: EncabezadoFormato,
  logo: string | null,
  contenido: Content[],
  titulo: string,
  horizontal = false,
): TDocumentDefinitions {
  const membrete = (pagina: number, total: number): Content => ({
    margin: [57, 28, 57, 0],
    table: {
      widths: [110, '*', 115],
      body: [
        [
          logo
            ? { image: logo, fit: [100, 40], rowSpan: 3, alignment: 'center', margin: [0, 4, 0, 0] }
            : { text: '', rowSpan: 3 },
          { text: [{ text: 'MACROPROCESO: ', bold: true }, 'MISIONAL'], alignment: 'center' },
          { text: [{ text: 'Código: ', bold: true }, f.codigo] },
        ],
        [
          {},
          { text: [{ text: 'PROCESO: ', bold: true }, 'DOCENCIA'], alignment: 'center' },
          {
            text: [
              { text: 'Versión: ', bold: true },
              `${f.version}\n`,
              { text: 'Fecha: ', bold: true },
              f.fecha,
            ],
          },
        ],
        [
          {},
          { text: f.titulo, alignment: 'center' },
          { text: [{ text: 'Página: ', bold: true }, `${pagina} de ${total}`] },
        ],
      ],
    },
    layout: LINEAS,
    fontSize: 8.5,
  });
  return {
    pageSize: horizontal ? 'LEGAL' : 'LETTER',
    pageOrientation: horizontal ? 'landscape' : 'portrait',
    pageMargins: [57, 110, 57, 50],
    info: { title: titulo, author: 'Seguimiento RAE' },
    header: (pagina, total) => membrete(pagina, total),
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.1 },
    content: contenido,
  };
}

const marca = (texto: string, si: boolean) =>
  ({
    columns: [
      { width: 'auto', text: texto },
      {
        width: 12,
        canvas: [
          {
            type: 'rect',
            x: 3,
            y: 1.5,
            w: 8,
            h: 8,
            lineWidth: 0.7,
            ...(si ? { color: '#000000' } : {}),
          },
        ],
      },
    ],
    columnGap: 2,
    width: 'auto',
  }) as unknown as Content;
const casillas = (op: [string, boolean][]): Content => ({
  columns: op.map(([t, si]) => marca(t, si)),
  columnGap: 22,
});
/** Contenido como objeto para poder añadirle relleno o colSpan. */
const objeto = (c: Content | TableCell): Record<string, unknown> =>
  typeof c === 'string'
    ? { text: c }
    : Array.isArray(c)
      ? { stack: c }
      : (c as unknown as Record<string, unknown>);
const gris = (c: Content | string, extra: object = {}): TableCell =>
  ({
    ...objeto(c),
    fillColor: GRIS,
    ...extra,
  }) as TableCell;
const titulo = (t: string): Content => ({
  text: t,
  bold: true,
  alignment: 'center',
  margin: [0, 10, 0, 6],
});
const cab = (t: string) => gris({ text: t, bold: true, alignment: 'center', fontSize: 7.5 });

function seccionAgenda(s: SeccionAgenda, d: DatosAgenda): TableCell[][] {
  const n = s.conHoras ? 6 : 5;
  const ancha = (c: Content, relleno = false): TableCell[] => [
    { ...objeto(relleno ? gris(c) : c), colSpan: n } as TableCell,
    ...Array.from({ length: n - 1 }, () => ({})),
  ];
  const filas: TableCell[][] = [];
  if (s.conHoras && s.texto) {
    filas.push(
      ancha(
        {
          text: [{ text: `${s.titulo}: `, bold: true }, s.texto],
          alignment: 'justify',
          fontSize: 8,
        },
        true,
      ),
    );
  }
  filas.push(
    (s.conHoras
      ? [
          'ACTIVIDAD',
          'HORAS SEMANALES',
          'FUENTES DE VERIFICACIÓN/ OFICINA DE VERIFICACIÓN',
          'DESCRIPCIÓN DE ACTIVIDAD',
          'EVIDENCIAS Y PRODUCTOS ESPERADOS',
          'OBSERVACIONES',
        ]
      : [
          'ACTIVIDAD',
          'FUENTES DE VERIFICACIÓN/ OFICINA DE VERIFICACIÓN',
          'DESCRIPCIÓN DE ACTIVIDAD',
          'EVIDENCIAS Y PRODUCTOS ESPERADOS',
          'OBSERVACIONES',
        ]
    ).map(cab),
  );
  for (const a of s.actividades) {
    const f = d.actividades[a.clave];
    const centro = (t: string) => ({ text: t, alignment: 'center' as const, fontSize: 8 });
    filas.push([
      centro(a.actividad),
      ...(s.conHoras
        ? [centro(a.horasTexto && f?.horas == null ? a.horasTexto : numeroTexto(f?.horas))]
        : []),
      centro(f?.fuente || a.fuente),
      centro(f?.descripcion ?? ''),
      centro(f?.evidencias || a.evidencias),
      { text: f?.observaciones ?? '', fontSize: 7.5 },
    ]);
  }
  if (s.nota)
    filas.push(ancha({ text: s.nota, italics: true, fontSize: 7.5, alignment: 'justify' }));
  if (s.subtotal) {
    const { porSeccion } = horasAgenda(d);
    const h = s.subtotal.secciones.reduce((t, k) => t + (porSeccion[k] ?? 0), 0);
    filas.push(
      ancha(
        {
          text: `${s.subtotal.titulo}: ${numeroTexto(h)} horas`,
          bold: true,
          alignment: 'center',
          fontSize: 8,
        },
        true,
      ),
    );
  }
  return filas;
}

export async function agendaPdf(d: DatosAgenda, c: ContextoInforme): Promise<Buffer> {
  const v = c.docente.vinculacion;
  const fila = (t: string, valor: Content, nota?: string): TableCell[] => [
    gris({
      stack: [
        { text: t, bold: true },
        ...(nota ? [{ text: nota, italics: true, fontSize: 6.5 }] : []),
      ],
    }),
    valor,
  ];
  const [plan, ...desarrollo] = SECCIONES_AGENDA;
  const { total } = horasAgenda(d);
  const obsDecano = c.estado === 'APROBADO' || c.estado === 'AJUSTES' ? (c.observacion ?? '') : '';
  const ancha6 = (contenido: Content, relleno = false, alto = 0): TableCell[] => [
    {
      ...objeto(relleno ? gris(contenido) : contenido),
      colSpan: 6,
      ...(alto ? { margin: [0, 0, 0, alto] } : {}),
    } as TableCell,
    {},
    {},
    {},
    {},
    {},
  ];
  const bloque = (t: string, valor: string) => [
    ancha6({ text: t, bold: true, fontSize: 8 }, true),
    ancha6({ text: valor || ' ', fontSize: 8 }, false, 24),
  ];
  const contenido: Content[] = [
    titulo('1. DATOS DE IDENTIFICACIÓN DEL PROFESOR'),
    {
      table: {
        widths: [140, '*'],
        body: [
          fila('Fecha de diligenciamiento', d.fechaDiligenciamiento),
          fila('Nombres y apellidos', c.docente.nombre),
          fila('Identificación', c.docente.documento),
          fila(
            'Tipo de vinculación',
            casillas([
              ['Carrera', v === 'PLANTA'],
              ['Ocasional', v === 'OCASIONAL'],
              ['Provisional', v === 'PROVISIONAL'],
            ]),
          ),
          fila('Tipo de dedicación', {
            stack: [
              casillas(
                (Object.keys(DEDICACIONES) as (keyof typeof DEDICACIONES)[]).map((k) => [
                  DEDICACIONES[k],
                  d.dedicacion === k,
                ]),
              ),
              {
                text: [
                  { text: 'Nota: ', bold: true },
                  'Profesor de tiempo completo (40) horas semanales. • Profesor de medio (20) horas semanales.',
                ],
                fontSize: 6.5,
              },
            ],
          }),
          fila(
            'Escalafón Profesoral',
            casillas(
              (Object.keys(ESCALAFONES) as (keyof typeof ESCALAFONES)[]).map((k) => [
                ESCALAFONES[k],
                d.escalafon === k,
              ]),
            ),
            '(Arts. 39, 40, 42, 43 Estatuto. Prof.)',
          ),
          fila('Periodo académico', `${letraPeriodo(c.periodo.numero)} (${c.periodo.codigo})`),
          fila('Franja horaria', d.franjaHoraria),
          fila('Facultad adscrita', d.facultad),
          fila('Programa adscrito', d.programa),
        ],
      },
      layout: LINEAS,
    },
    titulo('2. PLANEACIÓN ACADÉMICA'),
    {
      table: {
        widths: [100, 75, 110, 95, '*'],
        headerRows: 0,
        body: [
          [
            {
              ...(gris({ text: plan?.texto ?? '', alignment: 'justify', fontSize: 8 }) as object),
              colSpan: 5,
            } as TableCell,
            {},
            {},
            {},
            {},
          ],
          [{ text: plan?.nota ?? '', fontSize: 7.5, colSpan: 5 }, {}, {}, {}, {}],
          ...(plan ? seccionAgenda(plan, d) : []),
        ],
      },
      layout: LINEAS,
    },
    titulo('3. DESARROLLO ACADÉMICO'),
    {
      table: {
        widths: [92, 40, 70, 88, 88, '*'],
        body: [
          ancha6(
            {
              text: 'Ejecución de las actividades programadas y se desarrollan en los periodos de tiempo donde hay una interacción con los estudiantes',
              alignment: 'center',
              fontSize: 8,
            },
            true,
          ),
          ancha6(
            { text: '3.1 LABORES DE DOCENCIA', bold: true, alignment: 'center', fontSize: 8 },
            true,
          ),
          ...desarrollo.flatMap((s) => seccionAgenda(s, d)),
          ancha6(
            {
              text: `TOTAL DE HORAS SEMANALES (Máximo 40 horas semanales TC - 20 MT): ${numeroTexto(total)} HORAS`,
              bold: true,
              alignment: 'center',
              fontSize: 8,
            },
            true,
          ),
          ...bloque('OBSERVACIONES DEL PROFESOR', d.observacionesPlaneacion),
          ...bloque('OBSERVACIONES DECANO FACULTAD', obsDecano),
          ancha6(
            { text: 'EVALUACIÓN ACADÉMICA', bold: true, alignment: 'center', fontSize: 8 },
            true,
          ),
          ancha6({
            text: 'Permite el reconocimiento del desempeño, los avances en el proceso de enseñanza-aprendizaje y en su desarrollo humano, esenciales para identificar las necesidades de acompañamiento que se retroalimentan con la intención de favorecer su crecimiento personal y su mejor desempeño académico, promoviendo además la permanencia y promoción. Esta actividad se realiza en los periodos de tiempo final de cada semestre, cuando no hay clases.',
            alignment: 'justify',
            fontSize: 8,
          }),
          ancha6({
            text: 'Responsabilidades del profesor por la ejecución de la asignación Académica Art. 27. Estatuto Profesoral',
            bold: true,
            fontSize: 8,
          }),
          ...RESPONSABILIDADES_AGENDA.map((r) => ancha6({ text: `• ${r}`, fontSize: 8 })),
          ...bloque('OBSERVACIONES DEL PROFESOR', d.observacionesEvaluacion),
          ...bloque('OBSERVACIONES DECANO FACULTAD', ''),
        ],
      },
      layout: LINEAS,
    },
    {
      unbreakable: true,
      margin: [0, 40, 0, 0],
      stack: [
        {
          columns: [
            {
              stack: [
                '______________________________',
                { text: c.docente.nombre, bold: true },
                'PROFESOR',
              ],
              alignment: 'center',
            },
            {
              stack: [
                '______________________________',
                { text: c.firmantes.decano || ' ', bold: true },
                'DECANO DE FACULTAD',
              ],
              alignment: 'center',
            },
          ],
        },
        {
          stack: [
            '______________________________',
            { text: c.firmantes.vicerrector || ' ', bold: true },
            'VICERRECTOR ACADÉMICO',
          ],
          alignment: 'center',
          margin: [0, 40, 0, 0],
        },
      ],
    },
  ];
  return pdfABuffer(
    documento(
      FORMATO_AGENDA,
      await logoPlantilla('agenda.docx'),
      contenido,
      `Agenda semanal docente - ${c.docente.nombre}`,
    ),
  );
}

export async function catedraPdf(d: DatosCatedra, c: ContextoInforme): Promise<Buffer> {
  const et = (t: string) => gris({ text: t, bold: true });
  const vacio = {} as TableCell;
  const span = (t: Content, n: number): TableCell[] => [
    { ...objeto(t), colSpan: n } as TableCell,
    ...Array.from({ length: n - 1 }, () => vacio),
  ];
  const periodo: Content =
    d.desde || d.hasta
      ? {
          text: [
            'Desde el ',
            { text: fechaLarga(d.desde), bold: true },
            ' al ',
            { text: fechaLarga(d.hasta), bold: true },
          ],
        }
      : '';
  const rotulo = (t: string) => gris({ text: t, bold: true, alignment: 'center', fontSize: 8 });
  const bloque = (t: string, contenido: Content): TableCell[] => [rotulo(t), contenido];
  const contenido: Content[] = [
    {
      table: {
        widths: [90, 65, 80, 55, 70, '*'],
        body: [
          [et('Programa:'), ...span(d.programa, 5)],
          [et('Unidad de formación:'), ...span(d.unidad, 5)],
          [
            et('Semestre:'),
            { text: d.semestre, alignment: 'center' },
            et('HORAS SEMANA:'),
            { text: numeroTexto(d.horasSemana), alignment: 'center' },
            et('JORNADA:'),
            { text: d.jornada, alignment: 'center' },
          ],
          [et('Docente:'), ...span(c.docente.nombre, 5)],
          [
            et('No. de Identificación:'),
            { text: c.docente.documento, alignment: 'center' },
            et('EXPEDIDA:'),
            ...span(d.expedida, 3),
          ],
          [et('Periodo:'), ...span(periodo, 5)],
        ],
      },
      layout: LINEAS,
      margin: [0, 0, 0, 12],
    },
    {
      table: {
        widths: [70, '*'],
        // Altos mínimos como en el formato impreso.
        heights: (i: number) => [95, 75, 55, 55, 55][i] ?? 'auto',
        body: [
          bloque('AVANCE DEL CONTENIDO PROGRAMÁTICO', {
            stack: [
              ...d.sesiones.flatMap((s) => [
                {
                  text: `SESIÓN${s.numero ? ` ${s.numero}` : ''}${s.fecha ? `: ${fechaLarga(s.fecha)}` : ''}`,
                  bold: true,
                },
                { text: s.tema },
              ]),
              {
                text: porcentajes(d.avancePeriodo, d.avanceAcumulado),
                alignment: 'center',
                margin: [0, 8, 0, 0],
                preserveLeadingSpaces: true,
              },
            ],
          }),
          bloque('ASISTENCIA DEL DOCENTE', {
            stack: [
              `Horas orientadas:   ${numeroTexto(d.horasOrientadas)}`,
              `Horas ausencias:   ${numeroTexto(d.horasAusencias)}`,
              `Horas reposición de clase:   ${numeroTexto(d.horasReposicion)}`,
              {
                text: porcentajes(d.asistenciaPeriodo, d.asistenciaAcumulada),
                alignment: 'center',
                margin: [0, 8, 0, 0],
                preserveLeadingSpaces: true,
              },
            ],
          }),
          bloque('ASISTENCIA DE ESTUDIANTES', { text: d.asistenciaEstudiantes }),
          bloque('REPORTE DE NOTAS', { text: d.reporteNotas }),
          bloque('ANEXOS', { text: d.anexos }),
        ],
      },
      layout: { ...LINEAS, paddingTop: () => 6, paddingBottom: () => 6 },
    },
    { text: `FECHA: ${fechaCorta(d.fecha)}`, bold: true, margin: [0, 18, 0, 36] },
    { text: '__________________________________', alignment: 'center' },
    { text: c.docente.nombre, alignment: 'center' },
  ];
  return pdfABuffer(
    documento(
      FORMATO_CATEDRA,
      await logoPlantilla('catedra.docx'),
      contenido,
      `Informe docencia - ${c.docente.nombre}`,
    ),
  );
}
