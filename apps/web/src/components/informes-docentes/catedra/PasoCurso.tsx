'use client';

import type { DatosCatedra } from '@rae/shared';
import type { ReactNode } from 'react';
import { Campo } from '../comun';

/** Campos del primer paso que deben estar diligenciados. */
export const cursoCompleto = (d: DatosCatedra) =>
  !!(d.programa && d.unidad && d.semestre && d.horasSemana && d.desde && d.hasta && d.fecha);

/** Paso 1 del informe de hora cátedra: docente, curso y periodo que cubre el informe. */
export function PasoCurso({
  d,
  docente,
  lectura,
  set,
  horas,
}: {
  d: DatosCatedra;
  docente: { nombre: string; documento: string };
  lectura?: boolean;
  set: <K extends keyof DatosCatedra>(k: K, v: DatosCatedra[K]) => void;
  horas: ReactNode;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <section className="card space-y-4">
      <h2>Datos del informe</h2>
      <dl className="grid gap-2 rounded-lg bg-surface-2 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-faint">Docente</dt>
          <dd className="font-semibold">{docente.nombre}</dd>
        </div>
        <div>
          <dt className="text-faint">No. de identificación</dt>
          <dd className="font-semibold">{docente.documento}</dd>
        </div>
      </dl>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-muted">Curso</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            etiqueta="Programa"
            className="sm:col-span-2"
            valor={d.programa}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('programa', v)}
          />
          <Campo
            etiqueta="Unidad de formación"
            className="sm:col-span-2"
            valor={d.unidad}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('unidad', v)}
          />
          <Campo
            etiqueta="Semestre"
            valor={d.semestre}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('semestre', v)}
          />
          {horas}
          <Campo
            etiqueta="Jornada"
            valor={d.jornada}
            max={40}
            lectura={lectura}
            onCambio={(v) => set('jornada', v)}
          />
          <Campo
            etiqueta="Documento expedido en"
            valor={d.expedida}
            max={60}
            lectura={lectura}
            onCambio={(v) => set('expedida', v)}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-muted">Periodo del informe</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Desde"
            tipo="date"
            valor={d.desde}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('desde', v)}
          />
          <Campo
            etiqueta="Hasta"
            tipo="date"
            valor={d.hasta}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('hasta', v)}
          />
          <div>
            <Campo
              etiqueta="Fecha del informe"
              className="block"
              tipo="date"
              valor={d.fecha}
              max={10}
              lectura={lectura}
              onCambio={(v) => set('fecha', v)}
            />
            {!lectura && !d.fecha && (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-primary underline"
                onClick={() => set('fecha', hoy)}
              >
                Usar la fecha de hoy
              </button>
            )}
          </div>
        </div>
        {d.desde && d.hasta && d.hasta < d.desde && (
          <p role="alert" className="text-sm text-[var(--warn)]">
            ⚠ La fecha «hasta» es anterior a «desde».
          </p>
        )}
      </fieldset>
    </section>
  );
}
