import { DatosCatedra } from '@rae/shared';
import { ContextoInforme, fechaCorta, fechaLarga, numeroTexto } from './contexto';
import { armarDocx, celda, fila, GRIS, p, tabla, Trozo } from './docx-tablas';

const DATOS = [1900, 1400, 1700, 1300, 1600, 2160];
const ANCHO = DATOS.reduce((s, x) => s + x, 0);
const BLOQUE = [1000, ANCHO - 1000];

/** «Desde el 1 de septiembre de 2025 al 30 de septiembre de 2025», con las fechas en negrita. */
export function periodoCatedra(d: DatosCatedra): Trozo[] {
  if (!d.desde && !d.hasta) return [{ t: '' }];
  return [
    { t: 'Desde el ' },
    { t: fechaLarga(d.desde), negrita: true },
    { t: ' al ' },
    { t: fechaLarga(d.hasta), negrita: true },
  ];
}

export const porcentajes = (periodo: number | null, acumulado: number | null) =>
  `PORCENTAJE PERIODO     ${numeroTexto(periodo, '%')}               PORCENTAJE ACUMULADO     ${numeroTexto(acumulado, '%')}`;

function datosGenerales(d: DatosCatedra, c: ContextoInforme): string {
  const et = (t: string, i: number) =>
    celda(p(t, { negrita: true }), DATOS[i] as number, { relleno: GRIS });
  const resto = (contenido: string, desde: number, span: number) =>
    celda(
      contenido,
      DATOS.slice(desde, desde + span).reduce((s, x) => s + x, 0),
      { span },
    );
  const centro = (t: string, i: number) => celda(p(t, { jc: 'center' }), DATOS[i] as number);
  return tabla(DATOS, [
    fila([et('Programa:', 0), resto(p(d.programa), 1, 5)]),
    fila([et('Unidad de formación:', 0), resto(p(d.unidad), 1, 5)]),
    fila([
      et('Semestre:', 0),
      centro(d.semestre, 1),
      et('HORAS SEMANA:', 2),
      centro(numeroTexto(d.horasSemana), 3),
      et('JORNADA:', 4),
      centro(d.jornada, 5),
    ]),
    fila([et('Docente:', 0), resto(p(c.docente.nombre), 1, 5)]),
    fila([
      et('No. de Identificación:', 0),
      centro(c.docente.documento, 1),
      et('EXPEDIDA:', 2),
      resto(p(d.expedida), 3, 3),
    ]),
    fila([et('Periodo:', 0), resto(p(periodoCatedra(d)), 1, 5)]),
  ]);
}

function bloques(d: DatosCatedra): string {
  const rotulo = (t: string) =>
    celda(p(t, { negrita: true, jc: 'center' }), BLOQUE[0] as number, {
      relleno: GRIS,
      vertical: true,
    });
  const cuerpo = (xml: string) => celda(xml, BLOQUE[1] as number, { centrado: false });
  const sesiones = d.sesiones.length
    ? d.sesiones
        .map(
          (s) =>
            p(
              `SESIÓN${s.numero ? ` ${s.numero}` : ''}${s.fecha ? `: ${fechaLarga(s.fecha)}` : ''}`,
              { negrita: true },
            ) + p(s.tema),
        )
        .join('')
    : p('');
  const asistencia = [
    ['Horas orientadas', d.horasOrientadas],
    ['Horas ausencias', d.horasAusencias],
    ['Horas reposición de clase', d.horasReposicion],
  ] as const;
  return tabla(BLOQUE, [
    fila(
      [
        rotulo('AVANCE DEL CONTENIDO PROGRAMÁTICO'),
        cuerpo(
          sesiones +
            p('', { despues: 120 }) +
            p(porcentajes(d.avancePeriodo, d.avanceAcumulado), { jc: 'center' }),
        ),
      ],
      { alto: 1700 },
    ),
    fila(
      [
        rotulo('ASISTENCIA DEL DOCENTE'),
        cuerpo(
          p('', { despues: 60 }) +
            asistencia.map(([t, v]) => p(`${t}:   ${numeroTexto(v)}`)).join('') +
            p('', { despues: 120 }) +
            p(porcentajes(d.asistenciaPeriodo, d.asistenciaAcumulada), { jc: 'center' }),
        ),
      ],
      { alto: 1300 },
    ),
    fila([rotulo('ASISTENCIA DE ESTUDIANTES'), cuerpo(p(d.asistenciaEstudiantes))], { alto: 1100 }),
    fila([rotulo('REPORTE DE NOTAS'), cuerpo(p(d.reporteNotas))], { alto: 1100 }),
    fila([rotulo('ANEXOS'), cuerpo(p(d.anexos))], { alto: 1100 }),
  ]);
}

export function catedraDocx(d: DatosCatedra, c: ContextoInforme): Promise<Buffer> {
  const cuerpo = [
    p('', { despues: 120 }),
    datosGenerales(d, c),
    p('', { despues: 200 }),
    bloques(d),
    p(`FECHA: ${fechaCorta(d.fecha)}`, { negrita: true, antes: 360, despues: 600 }),
    p('__________________________________', { jc: 'center' }),
    p(c.docente.nombre, { jc: 'center' }),
  ].join('');
  return armarDocx('catedra.docx', cuerpo, `Informe docencia - ${c.docente.nombre}`);
}
