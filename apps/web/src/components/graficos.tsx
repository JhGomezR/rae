'use client';

/** Gráficas livianas en SVG/CSS, con los colores del proyecto y texto siempre en tinta. */

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

const formato = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const porcentaje = (v: number, t: number) => (t ? (v / t) * 100 : 0);

export function Dona({
  titulo,
  segmentos,
  centro,
  nota,
}: {
  titulo: string;
  segmentos: Segmento[];
  centro?: string;
  nota?: string;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  const separacion = segmentos.filter((s) => s.valor > 0).length > 1 ? 2 : 0;
  let acumulado = 0;
  return (
    <figure className="card flex flex-col gap-3">
      <figcaption className="font-semibold">{titulo}</figcaption>
      <div className="flex flex-wrap items-center gap-4">
        <svg
          viewBox="0 0 100 100"
          className="size-32 shrink-0 -rotate-90"
          role="img"
          aria-label={`${titulo}: ${segmentos.map((s) => `${s.etiqueta} ${s.valor}`).join(', ')}`}
        >
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
          {total > 0 &&
            segmentos.map((s) => {
              const largo = (s.valor / total) * c;
              const trazo = Math.max(0, largo - separacion);
              const el = (
                <circle
                  key={s.etiqueta}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${trazo} ${c - trazo}`}
                  strokeDashoffset={-acumulado}
                >
                  <title>{`${s.etiqueta}: ${s.valor} (${formato(porcentaje(s.valor, total))} %)`}</title>
                </circle>
              );
              acumulado += largo;
              return el;
            })}
          <text
            x="50"
            y="50"
            transform="rotate(90 50 50)"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-current text-[15px] font-semibold"
          >
            {centro ?? total}
          </text>
        </svg>
        <ul className="min-w-48 flex-1 space-y-1.5 text-sm">
          {segmentos.map((s) => (
            <li key={s.etiqueta} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="min-w-0 flex-1">{s.etiqueta}</span>
              <span className="whitespace-nowrap tabular-nums text-muted">
                {s.valor} · {formato(porcentaje(s.valor, total))} %
              </span>
            </li>
          ))}
        </ul>
      </div>
      {nota && <p className="text-sm text-faint">{nota}</p>}
    </figure>
  );
}

export interface FilaBarras {
  etiqueta: string;
  valores: number[];
  nota?: string;
}

/** Barras horizontales en porcentaje (0–100); una o dos series. */
export function BarrasPct({
  titulo,
  series,
  colores,
  filas,
  maximo = 100,
  unidad = ' %',
}: {
  titulo: string;
  series: string[];
  colores: string[];
  filas: FilaBarras[];
  maximo?: number;
  unidad?: string;
}) {
  return (
    <figure className="card space-y-3">
      <figcaption className="font-semibold">{titulo}</figcaption>
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-4 text-sm text-muted">
          {series.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-3 rounded-sm"
                style={{ background: colores[i] }}
              />
              {s}
            </li>
          ))}
        </ul>
      )}
      {filas.length === 0 ? (
        <p className="text-muted">No existen datos para esta sección.</p>
      ) : (
        <div className="space-y-2.5">
          {filas.map((f) => (
            <div key={f.etiqueta} className="grid gap-1 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-3">
              <span className="text-sm">
                {f.etiqueta}
                {f.nota && <span className="block text-xs text-faint">{f.nota}</span>}
              </span>
              <div className="space-y-0.5">
                {f.valores.map((v, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_58px] items-center gap-2"
                    title={`${f.etiqueta} · ${series[i]}: ${formato(v)}${unidad}`}
                  >
                    <div className="h-3 rounded-r bg-surface-2">
                      <div
                        className="h-3 rounded-r"
                        style={{
                          width: `${Math.min(100, (v / maximo) * 100)}%`,
                          background: colores[i],
                        }}
                      />
                    </div>
                    <span className="text-right text-sm tabular-nums text-muted">
                      {formato(v)}
                      {unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

/** Una barra apilada al 100 % (por ejemplo: completaron, a medias, sin empezar). */
export function BarraApilada({
  titulo,
  segmentos,
  nota,
}: {
  titulo: string;
  segmentos: Segmento[];
  nota?: string;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  return (
    <figure className="card space-y-3">
      <figcaption className="font-semibold">{titulo}</figcaption>
      <div
        className="flex h-5 overflow-hidden rounded-md bg-surface-2"
        role="img"
        aria-label={`${titulo}: ${segmentos.map((s) => `${s.etiqueta} ${s.valor}`).join(', ')}`}
      >
        {total > 0 &&
          segmentos.map((s) =>
            s.valor ? (
              <div
                key={s.etiqueta}
                title={`${s.etiqueta}: ${s.valor}`}
                style={{ width: `${porcentaje(s.valor, total)}%`, background: s.color }}
                className="h-full border-r-2 border-surface last:border-r-0"
              />
            ) : null,
          )}
      </div>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-3">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-3 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1">{s.etiqueta}</span>
            <span className="whitespace-nowrap tabular-nums text-muted">{s.valor}</span>
          </li>
        ))}
      </ul>
      {nota && <p className="text-sm text-faint">{nota}</p>}
    </figure>
  );
}
