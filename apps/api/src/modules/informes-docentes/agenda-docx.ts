import {
  DatosAgenda,
  DEDICACIONES,
  ESCALAFONES,
  horasAgenda,
  RESPONSABILIDADES_AGENDA,
  SECCIONES_AGENDA,
  SeccionAgenda,
} from '@rae/shared';
import { ContextoInforme, letraPeriodo, numeroTexto } from './contexto';
import { armarDocx, casillas, celda, fila, GRIS, p, tabla } from './docx-tablas';

const ANCHO = 9918;
const ID = [2600, ANCHO - 2600];
const PLAN = [2400, 1700, 2300, 1918, 1600];
const DES = [2100, 900, 1500, 1918, 1900, 1600];

const chico = (t: string, o: Parameters<typeof p>[1] = {}) => p(t, { tamano: 18, ...o });
const cab = (t: string) => chico(t, { negrita: true, jc: 'center' });
const titulo = (t: string) => p(t, { negrita: true, jc: 'center', antes: 200, despues: 120 });

function identificacion(d: DatosAgenda, c: ContextoInforme): string {
  const v = c.docente.vinculacion;
  const etiqueta = (t: string, nota?: string) =>
    celda(
      p(t, { negrita: true }) + (nota ? p(nota, { tamano: 14, cursiva: true }) : ''),
      ID[0] as number,
      { relleno: GRIS },
    );
  const valor = (t: string, extra = '') => celda(p(t) + extra, ID[1] as number);
  const filas: [ReturnType<typeof etiqueta>, ReturnType<typeof valor>][] = [
    [etiqueta('Fecha de diligenciamiento'), valor(d.fechaDiligenciamiento)],
    [etiqueta('Nombres y apellidos'), valor(c.docente.nombre)],
    [etiqueta('Identificación'), valor(c.docente.documento)],
    [
      etiqueta('Tipo de vinculación'),
      valor(
        casillas([
          ['Carrera', v === 'PLANTA'],
          ['Ocasional', v === 'OCASIONAL'],
          ['Provisional', v === 'PROVISIONAL'],
        ]),
      ),
    ],
    [
      etiqueta('Tipo de dedicación'),
      valor(
        casillas(
          (Object.keys(DEDICACIONES) as (keyof typeof DEDICACIONES)[]).map((k) => [
            DEDICACIONES[k],
            d.dedicacion === k,
          ]),
        ),
        p(
          [
            { t: 'Nota: ', negrita: true },
            {
              t: 'Profesor de tiempo completo (40) horas semanales. • Profesor de medio (20) horas semanales.',
            },
          ],
          { tamano: 14 },
        ),
      ),
    ],
    [
      etiqueta('Escalafón Profesoral', '(Arts. 39, 40, 42, 43 Estatuto. Prof.)'),
      valor(
        casillas(
          (Object.keys(ESCALAFONES) as (keyof typeof ESCALAFONES)[]).map((k) => [
            ESCALAFONES[k],
            d.escalafon === k,
          ]),
        ),
      ),
    ],
    [
      etiqueta('Periodo académico'),
      valor(`${letraPeriodo(c.periodo.numero)} (${c.periodo.codigo})`),
    ],
    [etiqueta('Franja horaria'), valor(d.franjaHoraria)],
    [etiqueta('Facultad adscrita'), valor(d.facultad)],
    [etiqueta('Programa adscrito'), valor(d.programa)],
  ];
  return tabla(
    ID,
    filas.map((f) => fila(f, { alto: 300 })),
  );
}

const ancha = (contenido: string, cols: number[], relleno?: string) =>
  fila([celda(contenido, ANCHO, { span: cols.length, relleno })]);

function filasSeccion(s: SeccionAgenda, d: DatosAgenda): string[] {
  const cols = s.conHoras ? DES : PLAN;
  const encabezados = s.conHoras
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
      ];
  const filas: string[] = [];
  if (s.conHoras && s.texto) {
    filas.push(
      ancha(
        p([{ t: `${s.titulo}: `, negrita: true }, { t: s.texto }], { tamano: 18, jc: 'both' }),
        cols,
        GRIS,
      ),
    );
  }
  filas.push(
    fila(
      encabezados.map((t, i) => celda(cab(t), cols[i] as number, { relleno: GRIS })),
      { cabecera: true },
    ),
  );
  for (const a of s.actividades) {
    const f = d.actividades[a.clave];
    const valores = [
      chico(a.actividad, { jc: 'center' }),
      ...(s.conHoras
        ? [
            chico(a.horasTexto && f?.horas == null ? a.horasTexto : numeroTexto(f?.horas), {
              jc: 'center',
            }),
          ]
        : []),
      chico(f?.fuente || a.fuente, { jc: 'center' }),
      chico(f?.descripcion ?? '', { jc: 'center' }),
      chico(f?.evidencias || a.evidencias, { jc: 'center' }),
      chico(f?.observaciones ?? '', { tamano: 16 }),
    ];
    filas.push(
      fila(
        valores.map((v, i) => celda(v, cols[i] as number)),
        { alto: 700 },
      ),
    );
  }
  if (s.nota) {
    filas.push(ancha(p(s.nota, { tamano: 16, cursiva: true, jc: 'both' }), cols));
  }
  if (s.subtotal) {
    const { porSeccion } = horasAgenda(d);
    const h = s.subtotal.secciones.reduce((t, k) => t + (porSeccion[k] ?? 0), 0);
    filas.push(
      ancha(
        p(`${s.subtotal.titulo}: ${numeroTexto(h)} horas`, {
          negrita: true,
          tamano: 18,
          jc: 'center',
        }),
        cols,
        GRIS,
      ),
    );
  }
  return filas;
}

function cierre(d: DatosAgenda, c: ContextoInforme): string[] {
  const obsDecano = c.estado === 'APROBADO' || c.estado === 'AJUSTES' ? (c.observacion ?? '') : '';
  const { total } = horasAgenda(d);
  const bloque = (t: string, valor: string) => [
    ancha(p(t, { negrita: true, tamano: 18 }), DES, GRIS),
    fila([celda(chico(valor), ANCHO, { span: DES.length, centrado: false })], { alto: 700 }),
  ];
  return [
    ancha(
      p(
        `TOTAL DE HORAS SEMANALES (Máximo 40 horas semanales TC - 20 MT): ${numeroTexto(total)} HORAS`,
        {
          negrita: true,
          tamano: 18,
          jc: 'center',
        },
      ),
      DES,
      GRIS,
    ),
    ...bloque('OBSERVACIONES DEL PROFESOR', d.observacionesPlaneacion),
    ...bloque('OBSERVACIONES DECANO FACULTAD', obsDecano),
    ancha(p('EVALUACIÓN ACADÉMICA', { negrita: true, tamano: 18, jc: 'center' }), DES, GRIS),
    ancha(
      chico(
        'Permite el reconocimiento del desempeño, los avances en el proceso de enseñanza-aprendizaje y en su desarrollo humano, esenciales para identificar las necesidades de acompañamiento que se retroalimentan con la intención de favorecer su crecimiento personal y su mejor desempeño académico, promoviendo además la permanencia y promoción. Esta actividad se realiza en los periodos de tiempo final de cada semestre, cuando no hay clases.',
        { jc: 'both' },
      ),
      DES,
    ),
    ancha(
      p(
        'Responsabilidades del profesor por la ejecución de la asignación Académica Art. 27. Estatuto Profesoral',
        { negrita: true, tamano: 18 },
      ),
      DES,
    ),
    ...RESPONSABILIDADES_AGENDA.map((r) => ancha(chico(`• ${r}`), DES)),
    ...bloque('OBSERVACIONES DEL PROFESOR', d.observacionesEvaluacion),
    ...bloque('OBSERVACIONES DECANO FACULTAD', ''),
  ];
}

function firmas(c: ContextoInforme): string {
  const mitad = ANCHO / 2;
  const linea = '______________________________';
  return (
    p('', { despues: 600 }) +
    tabla(
      [mitad, mitad],
      [
        fila([celda(p(linea, { jc: 'center' }), mitad), celda(p(linea, { jc: 'center' }), mitad)]),
        fila([
          celda(p(c.docente.nombre, { negrita: true, jc: 'center' }), mitad),
          celda(p(c.firmantes.decano || ' ', { negrita: true, jc: 'center' }), mitad),
        ]),
        fila([
          celda(p('PROFESOR', { jc: 'center' }), mitad),
          celda(p('DECANO DE FACULTAD', { jc: 'center' }), mitad),
        ]),
      ],
      true,
    ) +
    p('', { despues: 600 }) +
    p(linea, { jc: 'center' }) +
    p(c.firmantes.vicerrector || ' ', { negrita: true, jc: 'center' }) +
    p('VICERRECTOR ACADÉMICO', { jc: 'center' })
  );
}

export function agendaDocx(d: DatosAgenda, c: ContextoInforme): Promise<Buffer> {
  const [plan, ...desarrollo] = SECCIONES_AGENDA;
  const cuerpo = [
    titulo('1. DATOS DE IDENTIFICACIÓN DEL PROFESOR'),
    identificacion(d, c),
    titulo('2. PLANEACIÓN ACADÉMICA'),
    tabla(PLAN, [
      ancha(p(plan?.texto ?? '', { tamano: 18, jc: 'both' }), PLAN, GRIS),
      ancha(p(plan?.nota ?? '', { tamano: 16 }), PLAN),
      ...(plan ? filasSeccion(plan, d) : []),
    ]),
    titulo('3. DESARROLLO ACADÉMICO'),
    tabla(DES, [
      ancha(
        chico(
          'Ejecución de las actividades programadas y se desarrollan en los periodos de tiempo donde hay una interacción con los estudiantes',
          { jc: 'center' },
        ),
        DES,
        GRIS,
      ),
      ancha(p('3.1 LABORES DE DOCENCIA', { negrita: true, tamano: 18, jc: 'center' }), DES, GRIS),
      ...desarrollo.flatMap((s) => filasSeccion(s, d)),
      ...cierre(d, c),
    ]),
    firmas(c),
  ].join('');
  return armarDocx('agenda.docx', cuerpo, `Agenda semanal docente - ${c.docente.nombre}`);
}
