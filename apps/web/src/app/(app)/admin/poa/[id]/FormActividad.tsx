'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { MESES, TIPOS, type Actividad, type TipoIndicador } from '../tipos';

type Valores = Omit<Actividad, 'id' | 'activo' | 'seguimientos'>;

const VACIA: Valores = {
  numero: 1,
  ejePgr: '',
  ejePdi: '',
  programaPdi: '',
  subprograma: '',
  proyecto: '',
  metaVigencia: null,
  indicadorPdi: '',
  actividad: '',
  tipoIndicador: null,
  indicadorActividad: '',
  interpretacion: null,
  responsableEjecucion: '',
  meses: [],
  presupuesto: null,
  observaciones: null,
};

const TEXTOS: { k: keyof Valores; t: string; largo?: boolean; max: number }[] = [
  { k: 'ejePgr', t: 'Eje plan de gobierno rectoral', max: 300 },
  { k: 'ejePdi', t: 'Eje PDI', max: 500 },
  { k: 'programaPdi', t: 'Programa PDI', max: 300 },
  { k: 'subprograma', t: 'Subprograma', max: 300 },
  { k: 'proyecto', t: 'Nombre del proyecto PDI', largo: true, max: 1000 },
  { k: 'indicadorPdi', t: 'Indicador PDI', max: 500 },
  { k: 'actividad', t: 'Actividades del proyecto', largo: true, max: 2000 },
  { k: 'indicadorActividad', t: 'Indicador de la actividad', max: 1000 },
  { k: 'responsableEjecucion', t: 'Responsable de ejecución', max: 300 },
  {
    k: 'interpretacion',
    t: 'Interpretación (vacío = la del tipo de indicador)',
    largo: true,
    max: 1000,
  },
  { k: 'observaciones', t: 'Observaciones', largo: true, max: 2000 },
];

const numeroONulo = (s: string) => (s.trim() === '' ? null : Number(s));

/** Crea o edita una fila del POA con los mismos campos del F-PIN-001. */
export function FormActividad({
  poaId,
  actividad,
  siguienteNumero,
  onListo,
}: {
  poaId: number;
  actividad?: Actividad;
  siguienteNumero?: number;
  onListo: () => Promise<void>;
}) {
  const [v, setV] = useState<Valores>(() => {
    if (!actividad) return { ...VACIA, numero: siguienteNumero ?? 1 };
    const { id: _i, activo: _a, seguimientos: _s, ...resto } = actividad;
    void _i;
    void _a;
    void _s;
    return resto;
  });
  const [error, setError] = useState('');
  const mes = (m: number) =>
    setV({ ...v, meses: v.meses.includes(m) ? v.meses.filter((x) => x !== m) : [...v.meses, m] });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cuerpo = {
      ...v,
      interpretacion: v.interpretacion?.trim() || null,
      observaciones: v.observaciones?.trim() || null,
    };
    try {
      if (actividad) await api(`/poa/actividades/${actividad.id}`, 'PUT', cuerpo);
      else await api(`/poa/${poaId}/actividades`, 'POST', cuerpo);
      await onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  return (
    <form onSubmit={(e) => void guardar(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold">
        No.
        <input
          className="input mt-1 font-normal"
          type="number"
          min={1}
          max={999}
          required
          value={v.numero}
          onChange={(e) => setV({ ...v, numero: Number(e.target.value) })}
        />
      </label>
      <label className="text-sm font-semibold">
        Meta vigencia
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          step="any"
          value={v.metaVigencia ?? ''}
          onChange={(e) => setV({ ...v, metaVigencia: numeroONulo(e.target.value) })}
        />
      </label>
      <label className="text-sm font-semibold">
        Tipo de indicador
        <select
          className="input mt-1 font-normal"
          value={v.tipoIndicador ?? ''}
          onChange={(e) =>
            setV({ ...v, tipoIndicador: (e.target.value || null) as TipoIndicador | null })
          }
        >
          <option value="">Sin tipo</option>
          {(Object.keys(TIPOS) as TipoIndicador[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Presupuesto (COP)
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          step="any"
          value={v.presupuesto ?? ''}
          onChange={(e) => setV({ ...v, presupuesto: numeroONulo(e.target.value) })}
        />
      </label>
      {TEXTOS.map((c) => (
        <label
          key={c.k}
          className={`text-sm font-semibold ${c.largo ? 'sm:col-span-2 lg:col-span-4' : 'sm:col-span-2'}`}
        >
          {c.t}
          {c.largo ? (
            <textarea
              className="input mt-1 min-h-20 font-normal"
              maxLength={c.max}
              required={c.k === 'actividad'}
              value={String(v[c.k] ?? '')}
              onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
            />
          ) : (
            <input
              className="input mt-1 font-normal"
              maxLength={c.max}
              value={String(v[c.k] ?? '')}
              onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
            />
          )}
        </label>
      ))}
      <fieldset className="sm:col-span-2 lg:col-span-4">
        <legend className="text-sm font-semibold">Tiempo: meses de ejecución</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {MESES.map((m, i) => {
            const activo = v.meses.includes(i + 1);
            return (
              <button
                type="button"
                key={m}
                aria-pressed={activo}
                onClick={() => mes(i + 1)}
                className={`btn min-w-14 ${activo ? 'btn-primary' : ''}`}
              >
                {activo ? '✓ ' : ''}
                {m}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button className="btn btn-primary">
          {actividad ? 'Guardar actividad' : 'Agregar actividad'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-err">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
