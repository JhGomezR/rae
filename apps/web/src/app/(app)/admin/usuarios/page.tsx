'use client';

import { VINCULACIONES, type Vinculacion } from '@rae/shared';
import { Fragment, useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormUsuario, type OpcionRol, type Usuario } from './FormUsuario';

interface Pagina {
  datos: Usuario[];
  total: number;
  pagina: number;
  tamano: number;
}
interface ResultadoMasivo {
  actualizados: number;
  omitidos: { id: number; nombre: string; motivo: string }[];
}
interface Yo {
  id: number;
  permisos: string[];
}
type Aviso = { texto: string; error?: boolean; detalle?: string[] } | null;

const TIPO = { ADMIN: 'Administrativo', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };

export default function UsuariosPage() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [rolId, setRolId] = useState('');
  const [estado, setEstado] = useState('todos');
  const [vinculacion, setVinculacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [abierto, setAbierto] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const { datos: yo } = useDatos<Yo>('/auth/yo');
  const { datos: roles } = useDatos<OpcionRol[]>('/usuarios/opciones');
  const params = new URLSearchParams({
    pagina: String(pagina),
    estado,
    ...(q ? { q } : {}),
    ...(tipo ? { rol: tipo } : {}),
    ...(rolId ? { rolSistemaId: rolId } : {}),
    ...(vinculacion ? { vinculacion } : {}),
  });
  const { datos, error, cargando, recargar } = useDatos<Pagina>(`/usuarios?${params}`);
  const puede = (p: string) => !!yo?.permisos.includes(p);
  const filtro = (f: () => void) => {
    f();
    setPagina(1);
    setSeleccion(new Set());
  };

  const accion = async (f: () => Promise<unknown>, ok: string) => {
    try {
      await f();
      setAviso({ texto: ok });
      await recargar();
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo completar.', error: true });
    }
  };

  const masivo = async (activo: boolean) => {
    const ids = [...seleccion];
    if (!window.confirm(`¿${activo ? 'Activar' : 'Inactivar'} ${ids.length} usuario(s)?`)) return;
    try {
      const r = await api<ResultadoMasivo>('/usuarios/estado', 'PATCH', { ids, activo });
      setAviso({
        texto: `${r.actualizados} usuario(s) ${activo ? 'activados' : 'inactivados'}.${r.omitidos.length ? ` ${r.omitidos.length} sin cambiar:` : ''}`,
        detalle: r.omitidos.map((o) => `${o.nombre || `Usuario ${o.id}`}: ${o.motivo}`),
      });
      setSeleccion(new Set());
      await recargar();
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo completar.', error: true });
    }
  };

  const filas = datos?.datos ?? [];
  const todos = filas.length > 0 && filas.every((u) => seleccion.has(u.id));
  const alternarTodos = () =>
    setSeleccion(
      todos
        ? new Set([...seleccion].filter((id) => !filas.some((u) => u.id === id)))
        : new Set([...seleccion, ...filas.map((u) => u.id)]),
    );
  const alternar = (id: number) => {
    const n = new Set(seleccion);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSeleccion(n);
  };
  const columnas = puede('usuarios.estado') ? 7 : 6;

  return (
    <>
      <Encabezado
        titulo="Usuarios"
        texto="Crea, edita, activa o inactiva cuentas, de una en una o en bloque. Cada acción respeta tu rol y sus permisos."
      />
      {puede('usuarios.crear') && roles && (
        <details className="card mb-4">
          <summary className="cursor-pointer font-semibold">Nuevo usuario</summary>
          <div className="mt-3">
            <FormUsuario
              roles={roles}
              onListo={async (m) => {
                setAviso({ texto: m });
                await recargar();
              }}
            />
          </div>
        </details>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-xs">
          Buscar por nombre, documento o correo
          <input
            className="input mt-1 font-normal"
            value={q}
            onChange={(e) => filtro(() => setQ(e.target.value))}
          />
        </label>
        <label className="text-sm font-semibold">
          Tipo
          <select
            className="input mt-1 font-normal"
            value={tipo}
            onChange={(e) => filtro(() => setTipo(e.target.value))}
          >
            <option value="">Todos</option>
            <option value="ADMIN">Administrativos</option>
            <option value="DOCENTE">Docentes</option>
            <option value="ESTUDIANTE">Estudiantes</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Rol asignado
          <select
            className="input mt-1 font-normal"
            value={rolId}
            onChange={(e) => filtro(() => setRolId(e.target.value))}
          >
            <option value="">Todos</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Estado
          <select
            className="input mt-1 font-normal"
            value={estado}
            onChange={(e) => filtro(() => setEstado(e.target.value))}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Vinculación
          <select
            className="input mt-1 font-normal"
            value={vinculacion}
            onChange={(e) => filtro(() => setVinculacion(e.target.value))}
          >
            <option value="">Todas</option>
            {(Object.keys(VINCULACIONES) as Vinculacion[]).map((v) => (
              <option key={v} value={v}>
                {VINCULACIONES[v]}
              </option>
            ))}
            <option value="SIN">Docentes sin vinculación</option>
          </select>
        </label>
      </div>
      {seleccion.size > 0 && puede('usuarios.estado') && (
        <div className="sticky top-12 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm lg:top-2">
          <span className="font-semibold">{seleccion.size} seleccionado(s)</span>
          <button className="btn btn-primary" onClick={() => void masivo(true)}>
            Activar
          </button>
          <button className="btn" onClick={() => void masivo(false)}>
            Inactivar
          </button>
          <button className="btn ml-auto" onClick={() => setSeleccion(new Set())}>
            Quitar selección
          </button>
        </div>
      )}
      {aviso && (
        <div
          role={aviso.error ? 'alert' : 'status'}
          className={`mb-3 text-sm ${aviso.error ? 'text-err' : 'text-muted'}`}
        >
          <p>{aviso.texto}</p>
          {!!aviso.detalle?.length && (
            <ul className="mt-1 list-disc pl-5">
              {aviso.detalle.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Estado cargando={cargando && !datos} error={error}>
        {!filas.length ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    {puede('usuarios.estado') && (
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todos los de esta página"
                          checked={todos}
                          onChange={alternarTodos}
                        />
                      </th>
                    )}
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((u) => (
                    <Fragment key={u.id}>
                      <tr className={u.activo ? '' : 'text-faint'}>
                        {puede('usuarios.estado') && (
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar a ${u.nombreCompleto}`}
                              checked={seleccion.has(u.id)}
                              onChange={() => alternar(u.id)}
                            />
                          </td>
                        )}
                        <td>{u.documento}</td>
                        <td className="min-w-52">
                          {u.nombreCompleto}
                          {u.id === yo?.id && (
                            <span className="block text-xs text-faint">Tu cuenta</span>
                          )}
                        </td>
                        <td className="min-w-36">
                          {u.rolSistema?.nombre ?? TIPO[u.rol]}
                          <span className="block text-xs text-faint">
                            {TIPO[u.rol]}
                            {u.vinculacion
                              ? ` · ${VINCULACIONES[u.vinculacion]}`
                              : u.rol === 'DOCENTE'
                                ? ' · sin vinculación'
                                : ''}
                          </span>
                        </td>
                        <td>{u.email ?? '—'}</td>
                        <td>
                          <span className={`chip ${u.activo ? '' : 'chip-nivel lv1'}`}>
                            {!u.activo
                              ? 'Inactivo'
                              : u.debeCambiarClave
                                ? 'Sin primer ingreso'
                                : 'Activo'}
                          </span>
                        </td>
                        <td>
                          <span className="flex gap-2">
                            {puede('usuarios.editar') && (
                              <button
                                className="btn"
                                aria-expanded={abierto === u.id}
                                onClick={() => setAbierto(abierto === u.id ? null : u.id)}
                              >
                                Editar
                              </button>
                            )}
                            {puede('usuarios.estado') && (
                              <button
                                className="btn whitespace-nowrap"
                                onClick={() =>
                                  void accion(
                                    () => api(`/usuarios/${u.id}`, 'PATCH', { activo: !u.activo }),
                                    u.activo ? 'Usuario inactivado.' : 'Usuario activado.',
                                  )
                                }
                              >
                                {u.activo ? 'Inactivar' : 'Activar'}
                              </button>
                            )}
                            {puede('usuarios.clave') && (
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
                                      'Clave reiniciada: vuelve a la clave inicial.',
                                    );
                                }}
                              >
                                Reiniciar clave
                              </button>
                            )}
                            {puede('usuarios.eliminar') && (
                              <button
                                className="btn"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Eliminar a ${u.nombreCompleto}? Solo es posible si no tiene cursos, encuestas ni informes, y no se puede deshacer.`,
                                    )
                                  )
                                    void accion(
                                      () => api(`/usuarios/${u.id}`, 'DELETE'),
                                      'Usuario eliminado.',
                                    );
                                }}
                              >
                                Eliminar
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                      {abierto === u.id && roles && (
                        <tr>
                          <td colSpan={columnas}>
                            <FormUsuario
                              roles={roles}
                              usuario={u}
                              onListo={async (m) => {
                                setAviso({ texto: m });
                                setAbierto(null);
                                await recargar();
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador
              pagina={pagina}
              tamano={datos?.tamano ?? 20}
              total={datos?.total ?? 0}
              onCambio={(p) => setPagina(p)}
            />
          </>
        )}
      </Estado>
    </>
  );
}
