'use client';

import type { Bloque } from './tipos';

const COLOR = ['var(--serie1)', 'var(--serie2)'];
const formato = (v: number | null, unidad: string) =>
  v === null ? '—' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${unidad}`;

function Barras({ b }: { b: Extract<Bloque, { tipo: 'barras' }> }) {
  return (
    <figure className="space-y-2">
      <figcaption className="font-semibold">{b.titulo}</figcaption>
      {b.series.length > 1 && (
        <ul className="flex flex-wrap gap-4 text-sm text-muted">
          {b.series.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-3 rounded-sm"
                style={{ background: COLOR[i] }}
              />
              {s}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        {b.filas.map((f) => (
          <div key={f.etiqueta} className="grid gap-1 sm:grid-cols-[minmax(0,34%)_1fr] sm:gap-3">
            <span className="text-sm">{f.etiqueta}</span>
            <div className="space-y-0.5">
              {b.series.map((s, i) => {
                const v = f.valores[i] ?? null;
                const ancho = v === null ? 0 : (Math.min(v, b.maximo) / b.maximo) * 100;
                const texto = formato(v, b.unidad);
                return (
                  <div
                    key={s}
                    className="grid grid-cols-[1fr_64px] items-center gap-2"
                    title={`${f.etiqueta} · ${s}: ${texto}`}
                  >
                    <div className="h-3 rounded-r bg-surface-2">
                      <div
                        className="h-3 rounded-r"
                        style={{ width: `${ancho}%`, background: COLOR[i] }}
                      />
                    </div>
                    <span className="text-right text-sm tabular-nums text-muted">{texto}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function BloqueInforme({ b }: { b: Bloque }) {
  if (b.tipo === 'parrafo') return <p className="max-w-4xl text-muted">{b.texto}</p>;
  if (b.tipo === 'subtitulo') return <h3>{b.texto}</h3>;
  if (b.tipo === 'barras') return <Barras b={b} />;
  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            {b.columnas.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.filas.map((f, i) => (
            <tr key={i}>
              {f.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
