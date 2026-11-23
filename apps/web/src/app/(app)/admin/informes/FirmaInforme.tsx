'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Configuracion } from './tipos';

export function FirmaInforme({
  config,
  onCambio,
}: {
  config: Configuracion;
  onCambio: (c: Configuracion) => void;
}) {
  const [nombre, setNombre] = useState(config.nombre);
  const [cargo, setCargo] = useState(config.cargo);
  const [aviso, setAviso] = useState('');

  const correr = async (f: () => Promise<Configuracion>, ok: string) => {
    try {
      onCambio(await f());
      setAviso(ok);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  const guardar = (e: FormEvent) => {
    e.preventDefault();
    void correr(
      () => api<Configuracion>('/informes/configuracion', 'PUT', { nombre, cargo }),
      'Responsable guardado.',
    );
  };
  const subir = (archivo: File | undefined) => {
    if (!archivo) return;
    const form = new FormData();
    form.append('archivo', archivo);
    void correr(
      () => api<Configuracion>('/informes/configuracion/firma', 'POST', form),
      'Firma guardada.',
    );
  };

  return (
    <details className="card" open={!config.nombre}>
      <summary className="cursor-pointer font-semibold">Responsable y firma</summary>
      <form onSubmit={guardar} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Nombre de quien firma
            <input
              className="input mt-1 font-normal"
              required
              minLength={3}
              maxLength={150}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Cargo
            <input
              className="input mt-1 font-normal"
              required
              minLength={3}
              maxLength={150}
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            />
          </label>
        </div>
        <button className="btn">Guardar responsable</button>
      </form>
      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Imagen de la firma (PNG o JPG, máximo 1 MB). Se guarda de forma privada.
          <input
            className="input mt-1 font-normal"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => subir(e.target.files?.[0])}
          />
        </label>
        {config.tieneFirma && (
          <button
            className="btn"
            onClick={() =>
              void correr(
                () => api<Configuracion>('/informes/configuracion/firma', 'DELETE'),
                'Firma eliminada.',
              )
            }
          >
            Quitar firma
          </button>
        )}
      </div>
      {aviso && (
        <p role="status" className="mt-3 text-sm text-muted">
          {aviso}
        </p>
      )}
    </details>
  );
}
