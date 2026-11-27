'use client';

import { useEffect, useState } from 'react';
import { api, useDatos } from '@/lib/api';

/** Nombres que aparecen en las firmas de la agenda (decano y vicerrector académico). */
export function Firmantes() {
  const { datos } = useDatos<{ decano: string; vicerrector: string }>(
    '/validacion-informes/firmantes',
  );
  const [v, setV] = useState({ decano: '', vicerrector: '' });
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    if (datos) setV(datos);
  }, [datos]);
  const guardar = async () => {
    try {
      await api('/validacion-informes/firmantes', 'PUT', v);
      setAviso('Firmantes guardados.');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">Firmas de la agenda docente</summary>
      <p className="mt-2 text-sm text-muted">
        Aparecen al final de la agenda (F-DOC-056), junto a la firma del profesor.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Decano de facultad
          <input
            className="input mt-1 font-normal"
            maxLength={150}
            value={v.decano}
            onChange={(e) => setV({ ...v, decano: e.target.value })}
          />
        </label>
        <label className="text-sm font-semibold">
          Vicerrector académico
          <input
            className="input mt-1 font-normal"
            maxLength={150}
            value={v.vicerrector}
            onChange={(e) => setV({ ...v, vicerrector: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn btn-primary" onClick={() => void guardar()}>
          Guardar
        </button>
        {aviso && <span className="text-sm text-muted">{aviso}</span>}
      </div>
    </details>
  );
}
