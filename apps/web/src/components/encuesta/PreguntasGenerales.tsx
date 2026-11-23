'use client';

import type { Encuesta, EstadoSeguimiento, General } from './tipos';

type Campo =
  | { t: 'likert' | 'sino' | 'texto' | 'numero'; k: string; q: string }
  | { t: 'estrategias'; q: string }
  | { t: 'previas' }
  | { t: 'recomendaciones' };

const curriculo = (docente: boolean, fut: boolean): Campo[] => [
  {
    t: 'likert',
    k: 'integralidad',
    q: docente
      ? fut
        ? '¿Qué tanto contribuirá esta unidad a la formación integral de tus estudiantes (valores, comunicación, convivencia), además de lo técnico?'
        : '¿Qué tanto contribuyó esta unidad a la formación integral de tus estudiantes, además de lo técnico?'
      : fut
        ? '¿Qué tanto esperas que esta unidad aporte a tu formación como persona (valores, comunicación, convivencia), además de lo técnico?'
        : '¿Qué tanto aportó esta unidad a tu formación como persona, además de lo técnico?',
  },
  {
    t: 'likert',
    k: 'flexibilidad',
    q: docente
      ? fut
        ? '¿Qué tanto podrás adaptar actividades, ritmos o rutas de la unidad a los intereses de tus estudiantes?'
        : '¿Qué tanto pudiste adaptar actividades, ritmos o rutas a los intereses de tus estudiantes?'
      : fut
        ? '¿Qué tanto esperas poder adaptar las actividades de esta unidad a tus intereses y ritmo de trabajo?'
        : '¿Qué tanto pudiste adaptar las actividades a tus intereses y ritmo de trabajo?',
  },
  {
    t: 'likert',
    k: 'interdisciplinariedad',
    q: docente
      ? fut
        ? '¿Qué tanto se articulará esta unidad con otras unidades de formación o áreas del conocimiento?'
        : '¿Qué tanto se articuló esta unidad con otras unidades de formación o áreas del conocimiento?'
      : fut
        ? '¿Qué tanto esperas relacionar esta unidad con otras asignaturas o áreas del conocimiento?'
        : '¿Qué tanto relacionaste lo aprendido con otras asignaturas o áreas del conocimiento?',
  },
];

function campos(rol: Encuesta['rol'], momento: Encuesta['momento']): Campo[] {
  const docente = rol === 'DOCENTE';
  const fut = momento === 'APRECIACION';
  const c = curriculo(docente, fut);
  if (fut && !docente) {
    return [
      {
        t: 'sino',
        k: 'acuerdoPedagogico',
        q: '¿El docente presentó el plan de clases y el acuerdo pedagógico al iniciar el semestre?',
      },
      {
        t: 'likert',
        k: 'claridad',
        q: '¿Qué tan clara fue la información que compartió el docente sobre la unidad?',
      },
      {
        t: 'likert',
        k: 'relevancia',
        q: '¿Qué tan importante consideras esta unidad para tu formación profesional?',
      },
      ...c,
      { t: 'texto', k: 'expectativas', q: '¿Qué esperas aprender en esta unidad de formación?' },
    ];
  }
  if (fut) {
    return [
      { t: 'numero', k: 'matriculados', q: 'Nº de estudiantes matriculados' },
      { t: 'estrategias', q: '¿Qué estrategias planeas usar en esta unidad?' },
      ...c,
      {
        t: 'texto',
        k: 'estrategiasTexto',
        q: 'Describe brevemente cómo aplicarás las estrategias',
      },
    ];
  }
  if (!docente) {
    return [
      {
        t: 'likert',
        k: 'expectativasCumplidas',
        q: '¿En qué medida se cumplieron tus expectativas iniciales?',
      },
      { t: 'estrategias', q: '¿Qué estrategias usó el docente en esta unidad?' },
      {
        t: 'likert',
        k: 'efectividadEstrategias',
        q: '¿Qué tanto te ayudaron esas estrategias a aprender?',
      },
      {
        t: 'likert',
        k: 'evaluacionCoherente',
        q: '¿Las evaluaciones correspondieron a lo que se esperaba aprender en la unidad?',
      },
      {
        t: 'likert',
        k: 'retroalimentacion',
        q: '¿Recibiste retroalimentación oportuna sobre tus evaluaciones?',
      },
      ...c,
      { t: 'texto', k: 'observaciones', q: 'Observaciones generales sobre tu aprendizaje' },
    ];
  }
  return [
    { t: 'estrategias', q: '¿Qué estrategias usaste realmente en esta unidad?' },
    {
      t: 'likert',
      k: 'efectividadEstrategias',
      q: '¿Qué tan efectivas fueron esas estrategias para el logro de los resultados de aprendizaje?',
    },
    {
      t: 'sino',
      k: 'retroalimentacionRa',
      q: '¿Retroalimentaste a tus estudiantes sobre su avance en los resultados de aprendizaje?',
    },
    ...c,
    { t: 'previas' },
    { t: 'recomendaciones' },
    { t: 'texto', k: 'observaciones', q: 'Observaciones generales del grupo' },
  ];
}

const ESTADOS = [
  ['APLICADA', 'Sí'],
  ['PARCIAL', 'Parcial'],
  ['NO_APLICADA', 'No'],
] as const;

interface Props {
  encuesta: Encuesta;
  general: General;
  estrategias: number[];
  recomendaciones: string;
  previas: EstadoSeguimiento[];
  soloLectura: boolean;
  onGeneral: (k: string, v: string | number | undefined) => void;
  onEstrategias: (v: number[]) => void;
  onRecomendaciones: (v: string) => void;
  onPrevia: (id: number, estado: EstadoSeguimiento['estado']) => void;
}

export function PreguntasGenerales(p: Props) {
  const { encuesta, general, soloLectura } = p;
  const docente = encuesta.rol === 'DOCENTE';
  const didacticas = encuesta.estrategiasCatalogo.filter((e) => e.tipo === 'DIDACTICA');
  const activas = encuesta.estrategiasCatalogo.filter((e) => e.tipo === 'ACTIVA');
  const n = (l: { id: number }[]) => l.filter((e) => p.estrategias.includes(e.id)).length;
  const alternar = (id: number) =>
    p.onEstrategias(
      p.estrategias.includes(id) ? p.estrategias.filter((x) => x !== id) : [...p.estrategias, id],
    );

  const opciones = (k: string, q: string, lista: [number, string][]) => (
    <div role="radiogroup" aria-label={q} className="flex flex-wrap gap-2">
      {lista.map(([v, t]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={general[k] === v}
          disabled={soloLectura}
          className="opcion !w-auto min-w-11 justify-center"
          onClick={() => p.onGeneral(k, v)}
        >
          {t}
        </button>
      ))}
    </div>
  );

  const lista = (titulo: string, items: typeof didacticas) => (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{titulo}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((e) => (
          <label key={e.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={soloLectura}
              checked={p.estrategias.includes(e.id)}
              onChange={() => alternar(e.id)}
            />
            {e.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <section className="card space-y-5">
      <h2>Preguntas generales</h2>
      {campos(encuesta.rol, encuesta.momento).map((c, i) => {
        if (c.t === 'estrategias') {
          return (
            <div key={i} className="space-y-3">
              <p className="font-medium">{c.q}</p>
              {lista(
                docente
                  ? `Estrategias didácticas (${n(didacticas)}, mínimo 3)`
                  : 'Estrategias didácticas',
                didacticas,
              )}
              {lista(
                docente
                  ? `Metodologías activas (${n(activas)}, entre 1 y 2)`
                  : 'Metodologías activas',
                activas,
              )}
            </div>
          );
        }
        if (c.t === 'previas') {
          if (!p.previas.length) return null;
          return (
            <div key={i} className="space-y-3">
              <p className="font-medium">¿Se aplicaron las recomendaciones del periodo anterior?</p>
              {p.previas.map((r) => (
                <div key={r.id} className="rounded-lg bg-surface-2 p-3">
                  <p className="mb-2 text-sm">{r.texto}</p>
                  <div role="radiogroup" aria-label={r.texto} className="flex gap-2">
                    {ESTADOS.map(([v, t]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={r.estado === v}
                        disabled={soloLectura}
                        className="opcion !w-auto"
                        onClick={() => p.onPrevia(r.id, v)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        if (c.t === 'recomendaciones') {
          return (
            <label key={i} className="block font-medium">
              Recomendaciones de mejora para el próximo periodo (una por línea)
              <textarea
                className="input mt-1 font-normal"
                rows={3}
                disabled={soloLectura}
                value={p.recomendaciones}
                onChange={(e) => p.onRecomendaciones(e.target.value)}
              />
            </label>
          );
        }
        if (c.t === 'texto') {
          return (
            <label key={c.k} className="block font-medium">
              {c.q}
              <textarea
                className="input mt-1 font-normal"
                rows={3}
                maxLength={1000}
                disabled={soloLectura}
                value={general[c.k] ?? ''}
                onChange={(e) => p.onGeneral(c.k, e.target.value)}
              />
            </label>
          );
        }
        if (c.t === 'numero') {
          return (
            <label key={c.k} className="block max-w-xs font-medium">
              {c.q}
              <input
                className="input mt-1 font-normal"
                type="number"
                min={0}
                disabled={soloLectura}
                value={general[c.k] ?? ''}
                onChange={(e) =>
                  p.onGeneral(
                    c.k,
                    e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                  )
                }
              />
            </label>
          );
        }
        return (
          <div key={c.k}>
            <p className="mb-2 font-medium">{c.q}</p>
            {c.t === 'sino'
              ? opciones(c.k, c.q, [
                  [1, 'Sí'],
                  [0, 'No'],
                ])
              : opciones(c.k, c.q, [
                  [1, '1'],
                  [2, '2'],
                  [3, '3'],
                  [4, '4'],
                  [5, '5'],
                ])}
            {c.t === 'likert' && (
              <p className="mt-1 text-xs text-faint">1 = Nada · 5 = Totalmente</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
