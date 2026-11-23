'use client';

import { useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Usuario {
  id: number;
  documento: string;
  nombreCompleto: string;
  rol: string;
  email: string | null;
  activo: boolean;
  debeCambiarClave: boolean;
}
interface Pagina {
  datos: Usuario[];
  total: number;
  pagina: number;
  tamano: number;
}

export default function UsuariosPage() {
  const [q, setQ] = useState('');
  const [rol, setRol] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aviso, setAviso] = useState('');
  const params = new URLSearchParams({
    pagina: String(pagina),
    ...(q ? { q } : {}),
    ...(rol ? { rol } : {}),
  });
  const { datos, error, cargando, recargar } = useDatos<Pagina>(`/usuarios?${params}`);

  const accion = async (f: () => Promise<unknown>, ok: string) => {
    try {
      await f();
      setAviso(ok);
      await recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo completar.');
    }
  };

  return (
    <>
      <Encabezado titulo="Usuarios" />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-sm">
          Buscar por nombre o documento
          <input
            className="input mt-1 font-normal"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
          />
        </label>
        <label className="text-sm font-semibold">
          Rol
          <select
            className="input mt-1 font-normal"
            value={rol}
            onChange={(e) => {
              setRol(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="ADMIN">Administrador</option>
            <option value="DOCENTE">Docente</option>
            <option value="ESTUDIANTE">Estudiante</option>
          </select>
        </label>
      </div>
      {aviso && (
        <p role="status" className="mb-3 text-sm text-muted">
          {aviso}
        </p>
      )}
      <Estado cargando={cargando && !datos} error={error}>
        {!datos?.datos.length ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((u) => (
                    <tr key={u.id}>
                      <td>{u.documento}</td>
                      <td className="min-w-52">{u.nombreCompleto}</td>
                      <td>{u.rol}</td>
                      <td>{u.email ?? '—'}</td>
                      <td>
                        {!u.activo
                          ? 'Inactivo'
                          : u.debeCambiarClave
                            ? 'Sin primer ingreso'
                            : 'Activo'}
                      </td>
                      <td>
                        <span className="flex gap-2">
                          <button
                            className="btn whitespace-nowrap"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Reiniciar la clave de ${u.nombreCompleto}? Volverá a la clave inicial.`,
                                )
                              )
                                void accion(
                                  () => api(`/usuarios/${u.id}/reiniciar-clave`, 'POST'),
                                  'Clave reiniciada.',
                                );
                            }}
                          >
                            Reiniciar clave
                          </button>
                          <button
                            className="btn"
                            onClick={() =>
                              void accion(
                                () => api(`/usuarios/${u.id}`, 'PATCH', { activo: !u.activo }),
                                'Usuario actualizado.',
                              )
                            }
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador
              pagina={datos.pagina}
              tamano={datos.tamano}
              total={datos.total}
              onCambio={setPagina}
            />
          </>
        )}
      </Estado>
    </>
  );
}
