'use client';

/** Cumplimiento del programador de clases: todos los cursos del periodo deben tener el suyo. */
export function Programadores({
  p,
  periodo,
}: {
  p: {
    cursos: number;
    entregados: number;
    aprobados: number;
    pendientes: { id: number; nombreCompleto: string; cursos: string[] }[];
  };
  periodo?: string;
}) {
  if (!p.cursos) return null;
  const pct = Math.round((p.entregados / p.cursos) * 100);
  const faltan = p.cursos - p.entregados;
  return (
    <section className="card mb-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>Programador de clases{periodo ? ` · ${periodo}` : ''}</h2>
        <span className="text-sm text-muted">
          {p.entregados} de {p.cursos} cursos entregados · {p.aprobados} aprobados
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Cursos con programador entregado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: faltan ? 'var(--primary)' : 'var(--ok)' }}
        />
      </div>
      {p.pendientes.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Docentes con cursos sin programador ({p.pendientes.length} docentes · {faltan} cursos)
          </summary>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {p.pendientes.map((d) => (
              <li key={d.id}>
                <span className="font-semibold">{d.nombreCompleto}</span>
                <span className="block text-xs text-faint">{d.cursos.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-sm text-[var(--ok)]">
          ✓ Todos los cursos tienen su programador entregado.
        </p>
      )}
    </section>
  );
}
