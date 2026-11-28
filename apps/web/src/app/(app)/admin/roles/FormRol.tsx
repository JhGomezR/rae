'use client';

import type { ComponentePermisos } from '@rae/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, useDatos } from '@/lib/api';
import { MatrizPermisos } from './MatrizPermisos';

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

/**
 * Crea o edita un rol administrativo en una ventana: nombre, descripción y la matriz de
 * permisos. Solo se pueden marcar permisos que uno mismo tiene.
 */
export function FormRol({
  catalogo,
  rol,
  onListo,
  onCerrar,
}: {
  catalogo: ComponentePermisos[];
  rol?: RolFila;
  onListo: (mensaje: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const { datos: yo } = useDatos<{ permisos: string[] }>('/auth/yo');
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [permisos, setPermisos] = useState<Set<string>>(new Set(rol?.permisos ?? []));
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const soloDescripcion = !!rol?.sistema;
  const modulos = new Set([...permisos].map((p) => p.split('.')[0])).size;

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOcupado(true);
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
    } finally {
      setOcupado(false);
    }
  };

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      aria-labelledby="titulo-rol"
      className="m-auto w-[min(72rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={(e) => void guardar(e)} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 id="titulo-rol">{rol ? `Editar rol · ${rol.nombre}` : 'Nuevo rol'}</h2>
            <p className="text-sm text-muted">
              {soloDescripcion
                ? 'Es un rol del sistema: solo puedes cambiar su descripción.'
                : 'Define el nombre y marca lo que podrá hacer en cada módulo.'}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => dialogo.current?.close()}>
            Cerrar
          </button>
        </header>
        <div className="space-y-5 overflow-y-auto p-5">
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
                placeholder="Para qué sirve este rol"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </label>
          </div>
          {!soloDescripcion && (
            <section className="space-y-2">
              <div>
                <h3 className="font-sans text-base font-semibold">Permisos</h3>
                <p className="text-sm text-muted">
                  Selecciona los permisos que tendrá este rol. Las casillas grises son permisos que
                  tú no tienes y por eso no puedes otorgar.
                </p>
              </div>
              <MatrizPermisos
                catalogo={catalogo}
                valor={permisos}
                propios={new Set(yo?.permisos ?? [])}
                onCambio={setPermisos}
              />
            </section>
          )}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-line p-5">
          <button
            className="btn btn-primary"
            disabled={ocupado || (!soloDescripcion && permisos.size === 0)}
          >
            {rol ? 'Guardar cambios' : 'Crear rol'}
          </button>
          <button type="button" className="btn" onClick={() => dialogo.current?.close()}>
            Cancelar
          </button>
          {!soloDescripcion && (
            <span className="text-sm text-muted">
              {permisos.size} permiso(s) en {modulos} módulo(s)
            </span>
          )}
          {error && (
            <p role="alert" className="w-full text-sm text-err">
              {error}
            </p>
          )}
        </footer>
      </form>
    </dialog>
  );
}
