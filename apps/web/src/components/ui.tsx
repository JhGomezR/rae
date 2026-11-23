'use client';

import { NIVELES, SIN_DATOS } from '@rae/shared';
import type { ReactNode } from 'react';

export function Estado({
  cargando,
  error,
  children,
}: {
  cargando: boolean;
  error: string | null;
  children: ReactNode;
}) {
  if (error) {
    return (
      <p role="alert" className="card text-err">
        {error}
      </p>
    );
  }
  if (cargando) return <p className="card text-muted">Cargando…</p>;
  return <>{children}</>;
}

export const SinDatos = () => <p className="text-muted">{SIN_DATOS}</p>;

export function Encabezado({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>{titulo}</h1>
        {texto && <p className="mt-1 max-w-3xl text-muted">{texto}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function ChipNivel({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return <span className="text-faint">—</span>;
  const n = Math.min(4, Math.max(1, Math.round(valor)));
  const nivel = NIVELES[n - 1];
  return (
    <span className={`chip chip-nivel lv${n}`}>
      {nivel?.nombre} · {valor.toFixed(1)}
    </span>
  );
}

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${v} %`;

export function Kpi({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">{valor}</p>
      {nota && <p className="mt-1 text-sm text-faint">{nota}</p>}
    </div>
  );
}

export function Paginador({
  pagina,
  tamano,
  total,
  onCambio,
}: {
  pagina: number;
  tamano: number;
  total: number;
  onCambio: (p: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
      <span>
        {total} registros · página {pagina} de {paginas}
      </span>
      <span className="flex gap-2">
        <button className="btn" disabled={pagina <= 1} onClick={() => onCambio(pagina - 1)}>
          Anterior
        </button>
        <button className="btn" disabled={pagina >= paginas} onClick={() => onCambio(pagina + 1)}>
          Siguiente
        </button>
      </span>
    </div>
  );
}
