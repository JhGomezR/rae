'use client';

import { useRef, useState, type ReactNode } from 'react';

export type EstadoPaso = 'listo' | 'pendiente' | 'alerta';

export interface Paso {
  id: string;
  titulo: string;
  /** Texto corto bajo el título en la barra de pasos (p. ej. «12 h»). */
  detalle?: string;
  estado: EstadoPaso;
  /** Contenido del paso; recibe `irA` para saltar a otro paso (útil en el resumen). */
  contenido: ReactNode | ((irA: (i: number) => void) => ReactNode);
}

const MARCA: Record<EstadoPaso, { clase: string; texto: string }> = {
  listo: { clase: 'border-[var(--ok)] bg-[var(--ok)] text-[var(--on-lv)]', texto: 'completo' },
  alerta: { clase: 'border-[var(--warn)] bg-[var(--lv2-bg)] text-[var(--warn)]', texto: 'revisar' },
  pendiente: { clase: 'border-line bg-surface text-faint', texto: 'sin datos' },
};

/**
 * Formulario por pasos: barra de progreso, pasos con su estado, anterior/siguiente y
 * la opción de ver todo en una sola página (por defecto al revisar). No cambia los datos:
 * cada paso edita el mismo informe que se guarda y entrega como siempre.
 */
export function Asistente({
  pasos,
  lectura,
  barra,
}: {
  pasos: Paso[];
  lectura?: boolean;
  /** Indicador fijo bajo los pasos (p. ej. el total de horas). */
  barra?: ReactNode;
}) {
  const [actual, setActual] = useState(0);
  const [todo, setTodo] = useState(!!lectura);
  const inicio = useRef<HTMLDivElement>(null);
  const listos = pasos.filter((p) => p.estado === 'listo').length;

  const irA = (i: number) => {
    setTodo(false);
    setActual(Math.max(0, Math.min(pasos.length - 1, i)));
    inicio.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const contenido = (p: Paso) =>
    typeof p.contenido === 'function' ? p.contenido(irA) : p.contenido;
  const paso = pasos[actual] ?? pasos[0];
  const siguiente = pasos[actual + 1];

  return (
    <div ref={inicio} className="scroll-mt-28 space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {todo ? 'Todo el informe' : `Paso ${actual + 1} de ${pasos.length}`} · {listos} de{' '}
            {pasos.length} completos
          </p>
          <button type="button" className="btn" aria-pressed={todo} onClick={() => setTodo(!todo)}>
            {todo ? 'Ver por pasos' : 'Ver todo en una página'}
          </button>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Pasos completos"
          aria-valuemin={0}
          aria-valuemax={pasos.length}
          aria-valuenow={listos}
        >
          <div
            className="h-full rounded-full bg-[var(--ok)] transition-all"
            style={{ width: `${(listos / pasos.length) * 100}%` }}
          />
        </div>
        <ol className="flex gap-1 overflow-x-auto pb-1">
          {pasos.map((p, i) => {
            const activo = !todo && i === actual;
            return (
              <li key={p.id} className="min-w-28 flex-1">
                <button
                  type="button"
                  onClick={() => irA(i)}
                  aria-current={activo ? 'step' : undefined}
                  title={`${p.titulo}: ${MARCA[p.estado].texto}`}
                  className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-xs ${activo ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2'}`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full border-2 text-xs font-bold ${MARCA[p.estado].clase} ${activo ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}`}
                  >
                    {p.estado === 'listo' ? '✓' : p.estado === 'alerta' ? '!' : i + 1}
                  </span>
                  <span className="leading-tight font-semibold">{p.titulo}</span>
                  {p.detalle && <span className="text-faint">{p.detalle}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        {barra}
      </section>

      {todo ? (
        pasos.map((p) => <div key={p.id}>{contenido(p)}</div>)
      ) : (
        <>
          {paso && contenido(paso)}
          <nav aria-label="Pasos" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn"
              disabled={actual === 0}
              onClick={() => irA(actual - 1)}
            >
              ← Anterior
            </button>
            {siguiente && (
              <button type="button" className="btn btn-primary" onClick={() => irA(actual + 1)}>
                Siguiente: {siguiente.titulo} →
              </button>
            )}
            {!lectura && actual === pasos.length - 1 && (
              <p className="text-sm text-muted">
                Último paso. Guarda los cambios y, cuando esté listo, márcalo como entregado.
              </p>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
