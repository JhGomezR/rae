'use client';

import { alertasAgenda, horasAgenda, SECCIONES_AGENDA, type DatosAgenda } from '@rae/shared';
import { Campo } from '../comun';

/** Máximo de horas semanales según la dedicación (TC 40 · MT 20). */
export const maximoHoras = (d: DatosAgenda) => (d.dedicacion === 'MEDIO_TIEMPO' ? 20 : 40);

/** Total de horas frente al máximo, en una barra. Se muestra bajo los pasos. */
export function MedidorHoras({ d }: { d: DatosAgenda }) {
  const { total } = horasAgenda(d);
  const maximo = maximoHoras(d);
  const excede = total > maximo;
  return (
    <div className="flex items-center gap-3 text-sm" aria-live="polite">
      <span className="font-semibold whitespace-nowrap">
        {total} de {maximo} h/sem
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (total / maximo) * 100)}%`,
            background: excede ? 'var(--warn)' : 'var(--primary)',
          }}
        />
      </div>
      <span className="text-xs text-faint">
        {d.dedicacion
          ? excede
            ? 'supera el máximo'
            : `quedan ${maximo - total}`
          : 'TC 40 · MT 20'}
      </span>
    </div>
  );
}

/** Último paso: horas por labor, alertas del Estatuto y observaciones del profesor. */
export function ResumenAgenda({
  d,
  lectura,
  set,
  pendientes,
}: {
  d: DatosAgenda;
  lectura?: boolean;
  set: <K extends keyof DatosAgenda>(k: K, v: DatosAgenda[K]) => void;
  /** Pasos sin datos, con su acción para ir a ellos. */
  pendientes: { titulo: string; ir: () => void }[];
}) {
  const { porSeccion, total } = horasAgenda(d);
  const alertas = alertasAgenda(d);
  const conHoras = SECCIONES_AGENDA.filter((s) => s.conHoras);
  const mayor = Math.max(1, ...conHoras.map((s) => porSeccion[s.clave] ?? 0));
  return (
    <section className="card space-y-4">
      <h2>Resumen y observaciones</h2>
      <div className="space-y-2">
        {conHoras.map((s) => {
          const h = porSeccion[s.clave] ?? 0;
          return (
            <div
              key={s.clave}
              className="grid grid-cols-[minmax(0,14rem)_1fr_3.5rem] items-center gap-3 text-sm"
            >
              <span className="truncate" title={s.titulo}>
                {s.titulo.replace(/^[\d.]+\s*/, '')}
              </span>
              <div className="h-4 overflow-hidden rounded bg-surface-2">
                <div
                  className="h-full rounded bg-[var(--serie1)]"
                  style={{ width: `${(h / mayor) * 100}%` }}
                />
              </div>
              <span className="text-right font-semibold">{h} h</span>
            </div>
          );
        })}
      </div>
      <p className="font-serif text-xl font-semibold">
        Total de horas semanales: {total}
        <span className="ml-2 text-sm font-normal text-muted">(máximo 40 TC · 20 MT)</span>
      </p>
      {alertas.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-[var(--lv2-bg)] p-3 text-sm text-[var(--warn)]">
          {alertas.map((a) => (
            <li key={a}>⚠ {a}</li>
          ))}
        </ul>
      ) : (
        d.dedicacion &&
        total > 0 && (
          <p className="text-sm text-[var(--ok)]">✓ La agenda cumple los límites del Estatuto.</p>
        )
      )}
      {!lectura && pendientes.length > 0 && (
        <div className="text-sm text-muted">
          Sin datos todavía:{' '}
          {pendientes.map((p, i) => (
            <span key={p.titulo}>
              {i > 0 && ', '}
              <button type="button" className="font-semibold text-primary underline" onClick={p.ir}>
                {p.titulo}
              </button>
            </span>
          ))}
          . Si no aplican a tu labor, puedes dejarlos vacíos.
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <Campo
          etiqueta="Observaciones del profesor (planeación y desarrollo)"
          largo
          max={3000}
          valor={d.observacionesPlaneacion}
          lectura={lectura}
          onCambio={(v) => set('observacionesPlaneacion', v)}
        />
        <Campo
          etiqueta="Observaciones del profesor (evaluación académica)"
          largo
          max={3000}
          valor={d.observacionesEvaluacion}
          lectura={lectura}
          onCambio={(v) => set('observacionesEvaluacion', v)}
        />
      </div>
    </section>
  );
}
