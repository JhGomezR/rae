'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { MESES, MESES_LARGOS, pctPoa, pesos, type Actividad } from '../tipos';

/** Reporte mensual de una actividad: avance acumulado, logro, evidencia y presupuesto ejecutado. */
export function Seguimiento({
  actividad,
  mesSugerido,
  onListo,
}: {
  actividad: Actividad;
  mesSugerido: number;
  onListo: () => Promise<void>;
}) {
  const previo = (m: number) => actividad.seguimientos.find((s) => s.mes === m);
  const inicial = (m: number) => {
    const s = previo(m);
    const anterior = [...actividad.seguimientos]
      .filter((x) => x.mes < m)
      .sort((a, b) => b.mes - a.mes)[0];
    return {
      avance: s?.avance ?? anterior?.avance ?? 0,
      logro: s?.logro ?? '',
      evidencia: s?.evidencia ?? '',
      ejecutado: s?.ejecutado === null || s?.ejecutado === undefined ? '' : String(s.ejecutado),
    };
  };
  const [mes, setMes] = useState(Math.min(12, Math.max(1, mesSugerido)));
  const [v, setV] = useState(() => inicial(Math.min(12, Math.max(1, mesSugerido))));
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cambiarMes = (m: number) => {
    setMes(m);
    setV(inicial(m));
    setAviso('');
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/poa/actividades/${actividad.id}/seguimiento/${mes}`, 'PUT', {
        avance: v.avance,
        logro: v.logro,
        evidencia: v.evidencia.trim() || null,
        ejecutado: v.ejecutado.trim() === '' ? null : Number(v.ejecutado),
      });
      setAviso(`Seguimiento de ${MESES_LARGOS[mes - 1]?.toLowerCase()} guardado.`);
      await onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  const quitar = async (m: number) => {
    if (!window.confirm(`¿Quitar el seguimiento de ${MESES_LARGOS[m - 1]?.toLowerCase()}?`)) return;
    await api(`/poa/actividades/${actividad.id}/seguimiento/${m}`, 'DELETE');
    await onListo();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={(e) => void guardar(e)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Mes del reporte
            <select
              className="input mt-1 font-normal"
              value={mes}
              onChange={(e) => cambiarMes(Number(e.target.value))}
            >
              {MESES_LARGOS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                  {actividad.meses.includes(i + 1) ? ' · programado' : ''}
                  {previo(i + 1) ? ' · reportado' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Avance acumulado: {v.avance} %
            <input
              className="mt-3 w-full accent-[var(--primary)]"
              type="range"
              min={0}
              max={100}
              step={5}
              value={v.avance}
              onChange={(e) => setV({ ...v, avance: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Logro del mes
          <textarea
            className="input mt-1 min-h-20 font-normal"
            required
            maxLength={2000}
            value={v.logro}
            onChange={(e) => setV({ ...v, logro: e.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Evidencia (enlace o descripción)
            <input
              className="input mt-1 font-normal"
              maxLength={500}
              value={v.evidencia}
              onChange={(e) => setV({ ...v, evidencia: e.target.value })}
            />
          </label>
          <label className="text-sm font-semibold">
            Presupuesto ejecutado en el mes (COP)
            <input
              className="input mt-1 font-normal"
              type="number"
              min={0}
              step="any"
              value={v.ejecutado}
              onChange={(e) => setV({ ...v, ejecutado: e.target.value })}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary">Guardar seguimiento</button>
          {aviso && (
            <p role="status" className="text-sm text-muted">
              {aviso}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-err">
              {error}
            </p>
          )}
        </div>
      </form>
      <div>
        <p className="mb-2 text-sm font-semibold">Historial</p>
        {!actividad.seguimientos.length ? (
          <p className="text-sm text-muted">No existen datos para esta sección.</p>
        ) : (
          <ul className="space-y-2">
            {actividad.seguimientos.map((s) => (
              <li key={s.mes} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong>
                    {MESES[s.mes - 1]} · {pctPoa(s.avance)}
                  </strong>
                  <span className="flex gap-2">
                    <button type="button" className="btn" onClick={() => cambiarMes(s.mes)}>
                      Editar
                    </button>
                    <button type="button" className="btn" onClick={() => void quitar(s.mes)}>
                      Quitar
                    </button>
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line">{s.logro}</p>
                {(s.evidencia || s.ejecutado) && (
                  <p className="mt-1 text-xs text-faint">
                    {s.evidencia && <>Evidencia: {s.evidencia}. </>}
                    {s.ejecutado ? <>Ejecutado: {pesos(s.ejecutado)}.</> : null}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
