'use client';

import type { DatosCatedra } from '@rae/shared';
import type { ReactNode } from 'react';
import { aNumero, Campo } from '../comun';

type Sesion = DatosCatedra['sesiones'][number];

const MAX_SESIONES = 40;

/** Suma días a una fecha AAAA-MM-DD; vacío si la fecha no es válida. */
export function sumarDias(fecha: string, dias: number): string {
  const f = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(f.getTime())) return '';
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

/** Una sesión por semana entre «desde» y «hasta», empezando el mismo día de «desde». */
export function sesionesSemanales(desde: string, hasta: string): Sesion[] {
  const r: Sesion[] = [];
  for (let f = desde; f && f <= hasta && r.length < MAX_SESIONES; f = sumarDias(f, 7)) {
    r.push({ numero: r.length + 1, fecha: f, tema: '' });
  }
  return r;
}

/** Avance del contenido programático: sesiones del periodo y porcentajes. */
export function PasoSesiones({
  d,
  lectura,
  set,
  numero,
}: {
  d: DatosCatedra;
  lectura?: boolean;
  set: <K extends keyof DatosCatedra>(k: K, v: DatosCatedra[K]) => void;
  numero: (k: 'avancePeriodo' | 'avanceAcumulado', etiqueta: string, max: number) => ReactNode;
}) {
  const sesion = (i: number, cambio: Partial<Sesion>) =>
    set(
      'sesiones',
      d.sesiones.map((s, k) => (k === i ? { ...s, ...cambio } : s)),
    );
  const agregar = () => {
    const ultima = d.sesiones.at(-1);
    set('sesiones', [
      ...d.sesiones,
      {
        numero: (ultima?.numero ?? 0) + 1,
        fecha: ultima?.fecha ? sumarDias(ultima.fecha, 7) : d.desde,
        tema: '',
      },
    ]);
  };
  const conTema = d.sesiones.filter((s) => s.tema.trim()).length;
  const propuestas = d.desde && d.hasta ? sesionesSemanales(d.desde, d.hasta).length : 0;

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>Avance del contenido programático</h2>
        <span className="chip text-sm">
          {conTema} de {d.sesiones.length} sesiones con tema
        </span>
      </div>
      {d.sesiones.length === 0 && (
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
          <p>Agrega las sesiones del periodo, una por una o todas de una vez.</p>
          {!lectura && propuestas > 0 && (
            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={() => set('sesiones', sesionesSemanales(d.desde, d.hasta))}
            >
              Crear {propuestas} sesiones semanales ({d.desde} a {d.hasta})
            </button>
          )}
          {!lectura && !propuestas && (
            <p className="mt-1 text-xs">
              Con las fechas «desde» y «hasta» del primer paso puedo crear las sesiones semanales.
            </p>
          )}
        </div>
      )}
      <ol className="space-y-2">
        {d.sesiones.map((s, i) => (
          <li
            key={i}
            className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[5rem_11rem_1fr_auto] ${s.tema.trim() ? 'border-[var(--primary)]' : 'border-line'}`}
          >
            <label className="text-sm font-semibold">
              Sesión
              <input
                className="input mt-1 font-normal"
                type="number"
                min={1}
                max={99}
                readOnly={lectura}
                value={s.numero ?? ''}
                onChange={(e) => sesion(i, { numero: aNumero(e.target.value, 99) })}
              />
            </label>
            <Campo
              etiqueta="Fecha"
              tipo="date"
              valor={s.fecha}
              max={40}
              lectura={lectura}
              onCambio={(v) => sesion(i, { fecha: v })}
            />
            <Campo
              etiqueta="Tema o actividad"
              largo
              max={1000}
              valor={s.tema}
              lectura={lectura}
              onCambio={(v) => sesion(i, { tema: v })}
            />
            {!lectura && (
              <button
                type="button"
                className="btn self-end"
                aria-label={`Quitar la sesión ${s.numero ?? i + 1}`}
                onClick={() =>
                  set(
                    'sesiones',
                    d.sesiones.filter((_, k) => k !== i),
                  )
                }
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ol>
      {!lectura && (
        <button
          type="button"
          className="btn"
          disabled={d.sesiones.length >= MAX_SESIONES}
          onClick={agregar}
        >
          + Agregar sesión
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {numero('avancePeriodo', 'Porcentaje del periodo (%)', 100)}
        {numero('avanceAcumulado', 'Porcentaje acumulado (%)', 100)}
      </div>
    </section>
  );
}
