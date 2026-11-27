'use client';

import {
  DIDACTICAS_SUGERIDAS,
  MAX_SEMANAS_PROGRAMADOR,
  RECURSOS_SUGERIDOS,
  semanaCompleta,
  semanaConDatos,
  semanaVacia,
  type DatosProgramador,
  type SemanaProgramador,
} from '@rae/shared';
import { useState } from 'react';
import { TablaSemanas } from './TablaSemanas';

type Set = <K extends keyof DatosProgramador>(k: K, v: DatosProgramador[K]) => void;
type Campo = Exclude<keyof SemanaProgramador, 'semana'>;

/** Agrega una sugerencia al texto, separada por coma, si aún no está. */
const sumarTexto = (actual: string, extra: string) =>
  actual.toLowerCase().includes(extra.toLowerCase())
    ? actual
    : actual.trim()
      ? `${actual.trim()}, ${extra}`
      : extra;

function Texto({
  etiqueta,
  valor,
  max,
  onCambio,
  sugerencias,
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  max: number;
  onCambio: (v: string) => void;
  sugerencias?: string[];
  ayuda?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold">
        {etiqueta}
        <textarea
          className="input mt-1 min-h-20 font-normal"
          maxLength={max}
          value={valor}
          placeholder={ayuda}
          onChange={(e) => onCambio(e.target.value)}
        />
      </label>
      {sugerencias && (
        <div className="flex flex-wrap gap-1" aria-label={`Sugerencias para ${etiqueta}`}>
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              className="chip text-xs hover:bg-primary-soft"
              onClick={() => onCambio(sumarTexto(valor, s).slice(0, max))}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Semanas [desde, hasta) del programador: selector de semana y la semana elegida. */
export function PasoSemanas({
  d,
  lectura,
  set,
  desde,
  hasta,
  ultimo,
}: {
  d: DatosProgramador;
  lectura?: boolean;
  set: Set;
  desde: number;
  hasta: number;
  /** Último bloque: permite agregar o quitar semanas. */
  ultimo: boolean;
}) {
  const [actual, setActual] = useState(desde);
  const rango = d.semanas.slice(desde, hasta);
  if (lectura) {
    return (
      <section className="card space-y-3">
        <h2>
          Semanas {desde + 1} a {Math.min(hasta, d.semanas.length)}
        </h2>
        <TablaSemanas semanas={rango} />
      </section>
    );
  }
  const i = Math.min(
    Math.max(actual, desde),
    Math.max(desde, Math.min(hasta, d.semanas.length) - 1),
  );
  const s = d.semanas[i];
  const previa = d.semanas[i - 1];
  const cambiar = (k: Campo, v: string) =>
    set(
      'semanas',
      d.semanas.map((x, n) => (n === i ? { ...x, [k]: v } : x)),
    );
  const copiar = () =>
    previa &&
    set(
      'semanas',
      d.semanas.map((x, n) =>
        n === i
          ? {
              ...x,
              didacticas: x.didacticas || previa.didacticas,
              recursos: x.recursos || previa.recursos,
            }
          : x,
      ),
    );
  const agregar = () => {
    set('semanas', [...d.semanas, semanaVacia(d.semanas.length + 1)]);
    setActual(d.semanas.length);
  };
  const quitar = () => {
    set('semanas', d.semanas.slice(0, -1));
    setActual(Math.max(desde, d.semanas.length - 2));
  };
  const completas = rango.filter(semanaCompleta).length;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>
          Semanas {desde + 1} a {Math.min(hasta, d.semanas.length)}
        </h2>
        <span className="chip text-sm">
          {completas} de {rango.length} completas
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Semanas">
        {rango.map((x, k) => {
          const n = desde + k;
          const lista = semanaCompleta(x);
          const parcial = !lista && semanaConDatos(x);
          return (
            <button
              key={x.semana}
              type="button"
              role="tab"
              aria-selected={n === i}
              title={x.contenidos || 'Sin contenidos'}
              onClick={() => setActual(n)}
              className={`grid size-10 place-items-center rounded-full border-2 text-sm font-bold ${
                lista
                  ? 'border-[var(--ok)] bg-[var(--ok)] text-[var(--on-lv)]'
                  : parcial
                    ? 'border-[var(--warn)] bg-[var(--lv2-bg)] text-[var(--warn)]'
                    : 'border-line bg-surface text-faint'
              } ${n === i ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}`}
            >
              {x.semana}
            </button>
          );
        })}
        {ultimo && d.semanas.length < MAX_SEMANAS_PROGRAMADOR && (
          <button type="button" className="btn" onClick={agregar}>
            + Agregar semana
          </button>
        )}
      </div>
      {s && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-sans text-base font-semibold">Semana {s.semana}</h3>
            {previa && (!s.didacticas || !s.recursos) && (previa.didacticas || previa.recursos) && (
              <button type="button" className="btn text-xs" onClick={copiar}>
                Copiar didáctica y recursos de la semana {previa.semana}
              </button>
            )}
          </div>
          <Texto
            etiqueta="Contenidos del syllabus a desarrollar"
            valor={s.contenidos}
            max={1500}
            ayuda="Temas de la semana según el syllabus"
            onCambio={(v) => cambiar('contenidos', v)}
          />
          <Texto
            etiqueta="Didácticas pedagógicas en aula"
            valor={s.didacticas}
            max={600}
            sugerencias={DIDACTICAS_SUGERIDAS}
            onCambio={(v) => cambiar('didacticas', v)}
          />
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold text-muted">
              Actividades / evidencias de aprendizaje (al menos una)
            </legend>
            <Texto
              etiqueta="Individuales"
              valor={s.individuales}
              max={800}
              onCambio={(v) => cambiar('individuales', v)}
            />
            <Texto
              etiqueta="Grupales"
              valor={s.grupales}
              max={800}
              onCambio={(v) => cambiar('grupales', v)}
            />
          </fieldset>
          <Texto
            etiqueta="Recursos – medios educativos requeridos"
            valor={s.recursos}
            max={600}
            sugerencias={RECURSOS_SUGERIDOS}
            onCambio={(v) => cambiar('recursos', v)}
          />
          <Texto
            etiqueta="Observaciones (opcional)"
            valor={s.observaciones}
            max={600}
            onCambio={(v) => cambiar('observaciones', v)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              disabled={i <= desde}
              onClick={() => setActual(i - 1)}
            >
              ← Semana {s.semana - 1 || ''}
            </button>
            {i + 1 < Math.min(hasta, d.semanas.length) && (
              <button type="button" className="btn btn-primary" onClick={() => setActual(i + 1)}>
                Semana {s.semana + 1} →
              </button>
            )}
            {ultimo && i === d.semanas.length - 1 && d.semanas.length > 1 && (
              <button type="button" className="btn ml-auto" onClick={quitar}>
                Quitar la semana {s.semana}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
