'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export interface ValoresEncabezado {
  vigencia: number;
  fechaElaboracion: string;
  dependencia: string;
  areaFacultad: string;
  responsable: string;
  cargo: string;
}

const CAMPOS: {
  k: Exclude<keyof ValoresEncabezado, 'vigencia' | 'fechaElaboracion'>;
  t: string;
  ancho?: boolean;
}[] = [
  { k: 'dependencia', t: 'Dependencia', ancho: true },
  { k: 'areaFacultad', t: 'Área / Facultad' },
  { k: 'responsable', t: 'Responsable' },
  { k: 'cargo', t: 'Cargo' },
];

/** Información básica del F-PIN-001: crea un POA o edita el de una vigencia. */
export function FormEncabezado({
  inicial,
  poaId,
  onListo,
}: {
  inicial?: ValoresEncabezado;
  poaId?: number;
  onListo: (id: number) => Promise<void> | void;
}) {
  const [v, setV] = useState<ValoresEncabezado>(
    inicial ?? {
      vigencia: new Date().getFullYear(),
      fechaElaboracion: new Date().toISOString().slice(0, 10),
      dependencia: '',
      areaFacultad: '',
      responsable: '',
      cargo: '',
    },
  );
  const [error, setError] = useState('');
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (poaId) {
        const { vigencia: _v, ...resto } = v;
        void _v;
        await api(`/poa/${poaId}`, 'PATCH', resto);
        await onListo(poaId);
      } else {
        const p = await api<{ id: number }>('/poa', 'POST', v);
        await onListo(p.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };
  return (
    <form onSubmit={(e) => void guardar(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold">
        Vigencia
        <input
          className="input mt-1 font-normal"
          type="number"
          min={2000}
          max={2100}
          required
          disabled={!!poaId}
          value={v.vigencia}
          onChange={(e) => setV({ ...v, vigencia: Number(e.target.value) })}
        />
      </label>
      <label className="text-sm font-semibold">
        Fecha de elaboración
        <input
          className="input mt-1 font-normal"
          type="date"
          required
          value={v.fechaElaboracion}
          onChange={(e) => setV({ ...v, fechaElaboracion: e.target.value })}
        />
      </label>
      {CAMPOS.map((c) => (
        <label key={c.k} className={`text-sm font-semibold ${c.ancho ? 'sm:col-span-2' : ''}`}>
          {c.t}
          <input
            className="input mt-1 font-normal"
            required={c.k === 'dependencia' || c.k === 'responsable'}
            maxLength={c.k === 'dependencia' ? 300 : 150}
            value={v[c.k]}
            onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
          />
        </label>
      ))}
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button className="btn btn-primary">{poaId ? 'Guardar cambios' : 'Crear POA'}</button>
        {error && (
          <p role="alert" className="text-sm text-err">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
