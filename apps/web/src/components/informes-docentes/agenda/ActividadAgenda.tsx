'use client';

import type { ActividadAgenda as Actividad, FilaAgenda } from '@rae/shared';
import { aNumero, Campo } from '../comun';

export const FILA_VACIA: FilaAgenda = {
  horas: null,
  fuente: '',
  descripcion: '',
  evidencias: '',
  observaciones: '',
};

export const filaDe = (a: Actividad, actividades: Record<string, FilaAgenda>): FilaAgenda =>
  actividades[a.clave] ?? { ...FILA_VACIA, fuente: a.fuente, evidencias: a.evidencias };

export const filaConDatos = (f?: FilaAgenda) =>
  !!f && ((f.horas ?? 0) > 0 || !!f.descripcion.trim() || !!f.observaciones.trim());

/**
 * Una actividad de la agenda en tarjeta compacta: horas con − / + y descripción a la vista;
 * fuente, evidencias y observaciones (ya precargadas del formato) en un desplegable.
 */
export function ActividadAgenda({
  a,
  f,
  conHoras,
  lectura,
  onCambio,
}: {
  a: Actividad;
  f: FilaAgenda;
  conHoras: boolean;
  lectura?: boolean;
  onCambio: (f: FilaAgenda) => void;
}) {
  const cambiar = (k: keyof FilaAgenda, v: string | number | null) => onCambio({ ...f, [k]: v });
  const sumar = (n: number) => {
    const h = Math.max(0, Math.min(60, (f.horas ?? 0) + n));
    cambiar('horas', h || null);
  };
  const activa = filaConDatos(f);
  return (
    <article
      className={`rounded-xl border p-3 transition-colors ${activa ? 'border-[var(--primary)] bg-primary-soft/40' : 'border-line'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 font-sans text-sm leading-snug font-semibold">
          {activa && <span className="mr-1 text-[var(--ok)]">✓</span>}
          {a.actividad}
        </h3>
        {conHoras && (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={`Horas: ${a.actividad}`}
          >
            {!lectura && (
              <button
                type="button"
                className="btn px-3"
                aria-label="Restar una hora"
                disabled={!f.horas}
                onClick={() => sumar(-1)}
              >
                −
              </button>
            )}
            <input
              className="input w-20 text-center font-semibold"
              type="number"
              min={0}
              max={60}
              step="0.5"
              aria-label="Horas semanales"
              readOnly={lectura}
              placeholder={a.horasTexto ? '—' : '0'}
              title={a.horasTexto}
              value={f.horas ?? ''}
              onChange={(e) => cambiar('horas', aNumero(e.target.value, 60))}
            />
            {!lectura && (
              <button
                type="button"
                className="btn px-3"
                aria-label="Sumar una hora"
                onClick={() => sumar(1)}
              >
                +
              </button>
            )}
            <span className="text-xs text-faint">h/sem</span>
          </div>
        )}
      </div>
      {conHoras && a.horasTexto && <p className="mt-1 text-xs text-faint">{a.horasTexto}</p>}
      <Campo
        etiqueta="Descripción de la actividad"
        className="mt-2 block"
        largo
        max={2000}
        valor={f.descripcion}
        lectura={lectura}
        onCambio={(v) => cambiar('descripcion', v)}
      />
      <details className="mt-2" open={lectura || !!f.observaciones.trim()}>
        <summary className="cursor-pointer text-sm text-muted">
          Fuente, evidencias y observaciones
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Fuente / oficina de verificación"
            valor={f.fuente || a.fuente}
            lectura={lectura}
            onCambio={(v) => cambiar('fuente', v)}
          />
          <Campo
            etiqueta="Evidencias y productos esperados"
            max={1000}
            valor={f.evidencias || a.evidencias}
            lectura={lectura}
            onCambio={(v) => cambiar('evidencias', v)}
          />
          <Campo
            etiqueta="Observaciones"
            className="sm:col-span-2"
            max={1000}
            valor={f.observaciones}
            lectura={lectura}
            onCambio={(v) => cambiar('observaciones', v)}
          />
        </div>
      </details>
    </article>
  );
}
