'use client';

import {
  horasAgenda,
  type DatosAgenda,
  type FilaAgenda,
  type SeccionAgenda as Seccion,
} from '@rae/shared';
import { ActividadAgenda, filaDe } from './ActividadAgenda';

/** Subtotal de horas de un grupo de secciones y si supera su máximo. */
export function subtotalDe(s: Seccion, d: DatosAgenda) {
  if (!s.subtotal) return null;
  const { porSeccion } = horasAgenda(d);
  const horas = s.subtotal.secciones.reduce((t, k) => t + (porSeccion[k] ?? 0), 0);
  return { horas, excede: !!s.subtotal.maximo && horas > s.subtotal.maximo };
}

/** Una sección del formato F-DOC-056 con sus actividades y el subtotal del documento. */
export function SeccionAgenda({
  s,
  d,
  lectura,
  onFila,
}: {
  s: Seccion;
  d: DatosAgenda;
  lectura?: boolean;
  onFila: (clave: string, f: FilaAgenda) => void;
}) {
  const { porSeccion } = horasAgenda(d);
  const sub = subtotalDe(s, d);
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>{s.titulo}</h2>
        {s.conHoras && (
          <span className="chip text-sm font-semibold">{porSeccion[s.clave] ?? 0} h/sem</span>
        )}
      </div>
      {s.texto && <p className="text-sm text-muted">{s.texto}</p>}
      <div className="space-y-3">
        {s.actividades.map((a) => (
          <ActividadAgenda
            key={a.clave}
            a={a}
            f={filaDe(a, d.actividades)}
            conHoras={s.conHoras}
            lectura={lectura}
            onCambio={(f) => onFila(a.clave, f)}
          />
        ))}
      </div>
      {s.nota && <p className="text-xs text-faint">{s.nota}</p>}
      {s.subtotal && sub && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${sub.excede ? 'bg-[var(--lv2-bg)] text-[var(--warn)]' : 'bg-surface-2'}`}
        >
          {s.subtotal.titulo}: {sub.horas} horas{sub.excede ? ' · supera el máximo' : ''}
        </p>
      )}
    </section>
  );
}
