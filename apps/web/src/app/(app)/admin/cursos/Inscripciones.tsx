'use client';

import { useState, type FormEvent } from 'react';
import { SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Inscripcion {
  id: number;
  activa: boolean;
  estudiante: { documento: string; nombreCompleto: string };
}

export function Inscripciones({
  cursoId,
  onCambio,
}: {
  cursoId: number;
  onCambio: () => Promise<void>;
}) {
  const { datos, error, recargar } = useDatos<Inscripcion[]>(`/cursos/${cursoId}/inscripciones`);
  const [documento, setDocumento] = useState('');
  const [aviso, setAviso] = useState('');

  const correr = async (f: () => Promise<unknown>, ok: string) => {
    try {
      await f();
      setAviso(ok);
      await recargar();
      await onCambio();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  const inscribir = (e: FormEvent) => {
    e.preventDefault();
    void correr(
      () => api(`/cursos/${cursoId}/inscripciones`, 'POST', { documento }),
      'Estudiante inscrito.',
    ).then(() => setDocumento(''));
  };

  return (
    <div className="space-y-3 rounded-lg bg-surface-2 p-3">
      <form onSubmit={inscribir} className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">
          Inscribir por documento
          <input
            className="input mt-1 font-normal"
            inputMode="numeric"
            required
            pattern="\d{5,20}"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
        </label>
        <button className="btn">Inscribir</button>
        {aviso && (
          <span role="status" className="text-sm text-muted">
            {aviso}
          </span>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
      {!datos?.length ? (
        <SinDatos />
      ) : (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto">
          {datos.map((i) => (
            <li
              key={i.id}
              className={`flex items-center justify-between gap-3 py-2 text-sm ${i.activa ? '' : 'text-faint'}`}
            >
              <span className="min-w-0">
                {i.estudiante.nombreCompleto}
                <span className="block text-xs text-faint">
                  {i.estudiante.documento}
                  {i.activa ? '' : ' · retirado'}
                </span>
              </span>
              <button
                className="btn shrink-0"
                onClick={() =>
                  void correr(
                    () =>
                      api(`/cursos/${cursoId}/inscripciones/${i.id}`, 'PATCH', {
                        activa: !i.activa,
                      }),
                    i.activa ? 'Estudiante retirado del curso.' : 'Estudiante reincorporado.',
                  )
                }
              >
                {i.activa ? 'Retirar' : 'Reincorporar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
