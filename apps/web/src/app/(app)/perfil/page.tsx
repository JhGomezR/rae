'use client';

import { useState, type FormEvent } from 'react';
import type { Perfil } from '@/components/Shell';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

export default function PerfilPage() {
  const { datos, error, cargando } = useDatos<Perfil>('/auth/yo');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cambiar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/auth/clave', 'PATCH', { actual, nueva });
      window.location.href = '/login';
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    }
  };

  return (
    <>
      <Encabezado titulo="Mi perfil" />
      <Estado cargando={cargando} error={error}>
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <section className="card">
            <h3 className="mb-3">Datos</h3>
            <p className="font-semibold break-words">{datos?.nombre}</p>
            <p className="text-muted">Documento {datos?.documento}</p>
            <p className="break-words text-muted">{datos?.email ?? 'Sin correo registrado'}</p>
          </section>
          <form onSubmit={(e) => void cambiar(e)} className="card space-y-3">
            <h3>Cambiar contraseña</h3>
            <div>
              <label className="label" htmlFor="actual">
                Contraseña actual
              </label>
              <input
                id="actual"
                className="input"
                type="password"
                required
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="nueva">
                Nueva contraseña
              </label>
              <input
                id="nueva"
                className="input"
                type="password"
                minLength={8}
                required
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
              />
            </div>
            {mensaje && (
              <p role="alert" className="text-sm text-err">
                {mensaje}
              </p>
            )}
            <button className="btn btn-primary">Cambiar contraseña</button>
          </form>
        </div>
      </Estado>
    </>
  );
}
