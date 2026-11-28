'use client';

import { ACCIONES, LISTA_ACCIONES, type ComponentePermisos } from '@rae/shared';
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormRol, type RolFila } from './FormRol';
import { ResumenPermisos } from './ResumenPermisos';

const TIPO = { ADMIN: 'Administrativo', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function RolesPage() {
  const { datos, error, cargando, recargar } = useDatos<RolFila[]>('/roles');
  const { datos: catalogo } = useDatos<ComponentePermisos[]>('/roles/permisos');
  const { datos: yo } = useDatos<{ permisos: string[] }>('/auth/yo');
  const [formulario, setFormulario] = useState<RolFila | 'nuevo' | null>(null);
  const [q, setQ] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const puede = (p: string) => !!yo?.permisos.includes(p);
  const filas = (datos ?? []).filter(
    (r) => !q || normal(`${r.nombre} ${r.descripcion ?? ''}`).includes(normal(q)),
  );

  const accion = async (f: () => Promise<unknown>, ok: string) => {
    try {
      await f();
      setAviso({ texto: ok });
      await recargar();
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo completar.', error: true });
    }
  };
  const listo = async (m: string) => {
    setAviso({ texto: m });
    setFormulario(null);
    await recargar();
  };

  return (
    <>
      <Encabezado
        titulo="Gestión de roles"
        texto="Define roles y permisos para los usuarios del sistema. Docente y Estudiante son roles fijos; Administrador tiene todos los permisos."
      >
        {puede('roles.crear') && catalogo && (
          <button className="btn btn-primary" onClick={() => setFormulario('nuevo')}>
            <Icono nombre="mas" /> Nuevo rol
          </button>
        )}
      </Encabezado>
      {aviso && (
        <p
          role={aviso.error ? 'alert' : 'status'}
          className={`mb-3 text-sm ${aviso.error ? 'text-err' : 'text-muted'}`}
        >
          {aviso.texto}
        </p>
      )}
      <section className="card mb-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2>Roles de usuario</h2>
            <p className="text-sm text-muted">Roles disponibles en el sistema y sus permisos.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Buscar rol</span>
            <Icono
              nombre="buscar"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
            />
            <input
              className="input pl-9"
              placeholder="Buscar rol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
          {LISTA_ACCIONES.map((a) => (
            <span key={a} className="inline-flex items-center gap-1">
              <Icono nombre={a} className="size-3.5" /> {ACCIONES[a]}
            </span>
          ))}
        </p>
        <Estado cargando={cargando && !datos} error={error}>
          {!filas.length ? (
            <p className="text-muted">No existen datos para esta sección.</p>
          ) : (
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Permisos</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="min-w-48">
                        <span className="block font-semibold">{r.nombre}</span>
                        <span className="block text-xs text-faint">
                          {TIPO[r.base]} · {r.usuarios} usuario(s)
                          {r.sistema ? ' · del sistema' : ''}
                        </span>
                        {r.descripcion && (
                          <span className="mt-1 block text-sm">{r.descripcion}</span>
                        )}
                        {!r.editable && r.motivo && (
                          <span className="mt-1 block text-xs text-faint">{r.motivo}</span>
                        )}
                      </td>
                      <td className="min-w-80">
                        {r.base !== 'ADMIN' ? (
                          <span className="text-sm text-muted">
                            Sus encuestas
                            {r.base === 'DOCENTE'
                              ? ', programador de clases e informes docentes'
                              : ''}
                            ; sin permisos administrativos.
                          </span>
                        ) : (
                          catalogo && <ResumenPermisos catalogo={catalogo} permisos={r.permisos} />
                        )}
                      </td>
                      <td>
                        <span className={`chip ${r.activo ? 'chip-nivel lv3' : ''}`}>
                          {r.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {r.editable && (
                          <span className="flex justify-end gap-1">
                            {puede('roles.editar') && (
                              <button
                                className="btn px-2"
                                title="Editar"
                                aria-label={`Editar ${r.nombre}`}
                                onClick={() => setFormulario(r)}
                              >
                                <Icono nombre="editar" />
                              </button>
                            )}
                            {!r.sistema && puede('roles.editar') && (
                              <button
                                className="btn px-2"
                                title={r.activo ? 'Inactivar' : 'Activar'}
                                aria-label={`${r.activo ? 'Inactivar' : 'Activar'} ${r.nombre}`}
                                onClick={() =>
                                  void accion(
                                    () => api(`/roles/${r.id}`, 'PATCH', { activo: !r.activo }),
                                    r.activo ? 'Rol inactivado.' : 'Rol activado.',
                                  )
                                }
                              >
                                <Icono nombre={r.activo ? 'pausa' : 'activar'} />
                              </button>
                            )}
                            {!r.sistema && puede('roles.eliminar') && (
                              <button
                                className="btn px-2 text-err"
                                title="Eliminar"
                                aria-label={`Eliminar ${r.nombre}`}
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar el rol ${r.nombre}?`))
                                    void accion(
                                      () => api(`/roles/${r.id}`, 'DELETE'),
                                      'Rol eliminado.',
                                    );
                                }}
                              >
                                <Icono nombre="eliminar" />
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </section>
      <details className="card text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-ink">
          Reglas que siempre se aplican
        </summary>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>Nadie puede otorgar ni asignar permisos que no tiene.</li>
          <li>Nadie puede modificar su propio rol ni inactivar o eliminar su propia cuenta.</li>
          <li>Siempre queda al menos una cuenta activa que puede editar roles.</li>
          <li>
            Un rol con usuarios no se inactiva ni se elimina; una cuenta con cursos, encuestas o
            informes no cambia de tipo ni se elimina.
          </li>
          <li>Marcar crear, editar o eliminar en un módulo incluye ver ese módulo.</li>
        </ul>
      </details>
      {formulario && catalogo && (
        <FormRol
          catalogo={catalogo}
          rol={formulario === 'nuevo' ? undefined : formulario}
          onListo={listo}
          onCerrar={() => setFormulario(null)}
        />
      )}
    </>
  );
}
