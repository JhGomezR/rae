'use client';

import { useState, type FormEvent } from 'react';
import { api, useDatos } from '@/lib/api';

export interface GrupoPermisos {
  grupo: string;
  permisos: Record<string, string>;
}

export interface RolFila {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  base: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  sistema: boolean;
  activo: boolean;
  permisos: string[];
  usuarios: number;
  editable: boolean;
  motivo: string | null;
}

/** Crea o edita un rol administrativo. Solo se pueden marcar permisos que uno mismo tiene. */
export function FormRol({
  catalogo,
  rol,
  onListo,
}: {
  catalogo: GrupoPermisos[];
  rol?: RolFila;
  onListo: (mensaje: string) => Promise<void>;
}) {
  const { datos: yo } = useDatos<{ permisos: string[] }>('/auth/yo');
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [permisos, setPermisos] = useState<Set<string>>(new Set(rol?.permisos ?? []));
  const [error, setError] = useState('');
  const soloDescripcion = !!rol?.sistema;

  const alternar = (p: string) => {
    const n = new Set(permisos);
    if (n.has(p)) n.delete(p);
    else n.add(p);
    setPermisos(n);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (rol) {
        await api(
          `/roles/${rol.id}`,
          'PATCH',
          soloDescripcion
            ? { descripcion: descripcion || null }
            : { nombre, descripcion: descripcion || null, permisos: [...permisos] },
        );
        await onListo(`Rol ${nombre} actualizado.`);
      } else {
        await api('/roles', 'POST', {
          nombre,
          descripcion: descripcion || null,
          permisos: [...permisos],
        });
        await onListo(`Rol ${nombre} creado.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Nombre del rol
          <input
            className="input mt-1 font-normal"
            required
            minLength={3}
            maxLength={80}
            readOnly={soloDescripcion}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Descripción
          <input
            className="input mt-1 font-normal"
            maxLength={300}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
      </div>
      {!soloDescripcion && (
        <div className="grid gap-3 md:grid-cols-2">
          {catalogo.map((g) => (
            <fieldset key={g.grupo} className="rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-semibold">{g.grupo}</legend>
              {Object.entries(g.permisos).map(([clave, texto]) => {
                const propio = !!yo?.permisos.includes(clave);
                return (
                  <label
                    key={clave}
                    className={`flex items-start gap-2 py-0.5 text-sm ${propio ? '' : 'text-faint'}`}
                    title={propio ? undefined : 'No puedes otorgar un permiso que no tienes'}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={!propio}
                      checked={permisos.has(clave)}
                      onChange={() => alternar(clave)}
                    />
                    {texto}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={!soloDescripcion && permisos.size === 0}>
          {rol ? 'Guardar rol' : 'Crear rol'}
        </button>
        <span className="text-sm text-muted">{permisos.size} permiso(s)</span>
        {error && (
          <p role="alert" className="text-sm text-err">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
