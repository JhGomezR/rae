import type { DatosProgramador } from '@rae/shared';
import { ContextoInforme, numeroTexto } from './contexto';
import { armarDocx, celda, fila, GRIS, p, tabla } from './docx-tablas';
import {
  COLUMNAS_PROGRAMADOR,
  FechasProgramador,
  firmasProgramador,
  FORMATO_PROGRAMADOR,
} from './programador-firmas';

/** Ancho útil de la hoja horizontal (carta, márgenes de 2 cm). */
const DATOS = [2300, 3700, 1700, 1300, 2600, 1972];
const SEMANAS = [1100, 2600, 1900, 2000, 2000, 2072, 1900];
const TAM = 18;

const et = (t: string, ancho: number, span = 1) =>
  celda(p(t, { negrita: true, tamano: TAM }), ancho, { relleno: GRIS, span });
const valor = (t: string, ancho: number, span = 1) => celda(p(t, { tamano: TAM }), ancho, { span });
const suma = (a: number[], desde: number, n: number) =>
  a.slice(desde, desde + n).reduce((s, x) => s + x, 0);

/** Unidad con su grupo, como en el formato: «DISEÑO DE SISTEMAS – GRUPO A». */
export const unidadConGrupo = (d: DatosProgramador) =>
  d.grupo ? `${d.unidad} – GRUPO ${d.grupo}` : d.unidad;

function encabezado(d: DatosProgramador, c: ContextoInforme): string {
  const a = (i: number) => DATOS[i] as number;
  return tabla(DATOS, [
    fila([
      et('Facultad:', a(0)),
      valor(d.facultad, a(1)),
      et('Programa académico:', suma(DATOS, 2, 2), 2),
      valor(d.programa, suma(DATOS, 4, 2), 2),
    ]),
    fila([
      et('Unidad de formación:', a(0)),
      valor(unidadConGrupo(d), a(1)),
      et('No. créditos:', a(2)),
      valor(numeroTexto(d.creditos), a(3)),
      et('No. horas semanales:', a(4)),
      valor(numeroTexto(d.horasSemana), a(5)),
    ]),
    fila([
      et('Docente:', a(0)),
      valor(c.docente.nombre, suma(DATOS, 1, 3), 3),
      et('Periodo académico:', a(4)),
      valor(c.periodo.codigo, a(5)),
    ]),
    fila([et('Objetivo de aprendizaje:', a(0)), valor(d.objetivo, suma(DATOS, 1, 5), 5)]),
  ]);
}

function semanas(d: DatosProgramador): string {
  const a = (i: number) => SEMANAS[i] as number;
  const cab = (t: string, i: number, combinar?: 'inicio' | 'sigue', span = 1, ancho = a(i)) =>
    celda(
      combinar === 'sigue' ? p('') : p(t, { negrita: true, jc: 'center', tamano: TAM }),
      ancho,
      {
        relleno: GRIS,
        span,
        combinar,
      },
    );
  const [c0, c1, c2, , , c5, c6] = COLUMNAS_PROGRAMADOR;
  const cabecera = [
    fila(
      [
        cab(c0, 0, 'inicio'),
        cab(c1, 1, 'inicio'),
        cab(c2, 2, 'inicio'),
        cab('Actividades/ evidencias de aprendizaje', 3, undefined, 2, suma(SEMANAS, 3, 2)),
        cab(c5, 5, 'inicio'),
        cab(c6, 6, 'inicio'),
      ],
      { cabecera: true },
    ),
    fila(
      [
        cab('', 0, 'sigue'),
        cab('', 1, 'sigue'),
        cab('', 2, 'sigue'),
        cab('Individuales', 3),
        cab('Grupales', 4),
        cab('', 5, 'sigue'),
        cab('', 6, 'sigue'),
      ],
      { cabecera: true },
    ),
  ];
  const cuerpo = d.semanas.map((s) =>
    fila(
      [
        celda(p(String(s.semana), { tamano: TAM, jc: 'center' }), a(0)),
        valor(s.contenidos, a(1)),
        valor(s.didacticas, a(2)),
        valor(s.individuales, a(3)),
        valor(s.grupales, a(4)),
        valor(s.recursos, a(5)),
        valor(s.observaciones, a(6)),
      ],
      { alto: 500 },
    ),
  );
  return tabla(SEMANAS, [...cabecera, ...cuerpo]);
}

function firmas(d: DatosProgramador, c: ContextoInforme, f: FechasProgramador): string {
  const ancho = Math.floor(suma(SEMANAS, 0, 7) / 3);
  const o = { tamano: 15 };
  return tabla(
    [ancho, ancho, ancho],
    [
      fila(
        firmasProgramador(d, c, f).map((x) =>
          celda(
            p(x.rotulo, { ...o, despues: 200 }) +
              p('Firma: ______________________________________', { ...o, despues: 60 }) +
              p(`Nombre y Apellidos Completos: ${x.nombre}`, o) +
              p(`Cargo: ${x.cargo}`, o) +
              p(`${x.etiquetaFecha}: ${x.fecha}`, o),
            ancho,
            { centrado: false },
          ),
        ),
      ),
    ],
  );
}

export function programadorDocx(
  d: DatosProgramador,
  c: ContextoInforme,
  f: FechasProgramador,
): Promise<Buffer> {
  const cuerpo = [
    p('', { despues: 120 }),
    encabezado(d, c),
    p('', { despues: 160 }),
    semanas(d),
    p('', { despues: 160 }),
    firmas(d, c, f),
  ].join('');
  return armarDocx(
    'catedra.docx',
    cuerpo,
    `Programador de clases - ${c.docente.nombre}`,
    [
      ['-047', FORMATO_PROGRAMADOR.codigo.slice(5)],
      ['INFORME DOCENCIA', FORMATO_PROGRAMADOR.titulo],
    ],
    true,
  );
}
