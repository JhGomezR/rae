'use client';

import { useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormRol, type GrupoPermisos, type RolFila } from './FormRol';

const TIPO = { ADMIN: 'Administrativo', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };

export default function RolesPage() {
  const { datos, error, cargando, recargar } = useDatos<RolFila[]>('/roles');
  const { datos: catalogo } = useDatos<GrupoPermisos[]>('/roles/permisos');
  const [abierto, setAbierto] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const nombres = Object.assign({}, ...(catalogo ?? []).map((g) => g.permisos)) as Record<
    string,
    string
  >;

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
    setAbierto(null);
    await recargar();
  };

  return (
    <>
      <Encabezado
        titulo="Roles y permisos"
        texto="Docente y Estudiante son roles fijos. Administrador tiene todos los permisos. Crea roles administrativos con solo los permisos que cada persona necesita."
      />
      {catalogo && (
        <details className="card mb-4">
          <summary className="cursor-pointer font-semibold">Nuevo rol administrativo</summary>
          <div className="mt-3">
            <FormRol catalogo={catalogo} onListo={listo} />
          </div>
        </details>
      )}
      <section className="card mb-4 text-sm text-muted">
        <p className="font-semibold text-ink">Reglas que siempre se aplican</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Nadie puede otorgar ni asignar permisos que no tiene.</li>
          <li>Nadie puede modificar su propio rol ni inactivar o eliminar su propia cuenta.</li>
          <li>Siempre queda al menos una cuenta activa que puede gestionar roles.</li>
          <li>
            Un rol con usuarios no se inactiva ni se elimina; una cuenta con cursos, encuestas o
            informes no cambia de tipo ni se elimina.
          </li>
        </ul>
      </section>
      {aviso && (
        <p
          role={aviso.error ? 'alert' : 'status'}
          className={`mb-3 text-sm ${aviso.error ? 'text-err' : 'text-muted'}`}
        >
          {aviso.texto}
        </p>
      )}
      <Estado cargando={cargando && !datos} error={error}>
        <div className="grid gap-4 lg:grid-cols-2">
          {datos?.map((r) => (
            <article key={r.id} className={`card space-y-3 ${r.activo ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2>{r.nombre}</h2>
                  <p className="text-sm text-faint">
                    {TIPO[r.base]} · {r.usuarios} usuario(s)
                    {r.sistema ? ' · rol del sistema' : ''}
                    {r.activo ? '' : ' · inactivo'}
                  </p>
                </div>
                {r.editable && (
                  <span className="flex gap-2">
                    <button
                      className="btn"
                      aria-expanded={abierto === r.id}
                      onClick={() => setAbierto(abierto === r.id ? null : r.id)}
                    >
                      Editar
                    </button>
                    {!r.sistema && (
                      <button
                        className="btn"
                        onClick={() =>
                          void accion(
                            () => api(`/roles/${r.id}`, 'PATCH', { activo: !r.activo }),
                            r.activo ? 'Rol inactivado.' : 'Rol activado.',
                          )
                        }
                      >
                        {r.activo ? 'Inactivar' : 'Activar'}
                      </button>
                    )}
                    {!r.sistema && (
                      <button
                        className="btn"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar el rol ${r.nombre}?`))
                            void accion(() => api(`/roles/${r.id}`, 'DELETE'), 'Rol eliminado.');
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </span>
                )}
              </div>
              {r.descripcion && <p className="text-sm">{r.descripcion}</p>}
              {!r.editable && r.motivo && <p className="text-xs text-faint">{r.motivo}</p>}
              {r.base === 'ADMIN' ? (
                <ul className="flex flex-wrap gap-1.5">
                  {r.permisos.map((p) => (
                    <li key={p} className="chip text-xs">
                      {nombres[p] ?? p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Acceso a sus encuestas{r.base === 'DOCENTE' ? ' e informes docentes' : ''}; sin
                  permisos administrativos.
                </p>
              )}
              {abierto === r.id && catalogo && (
                <FormRol catalogo={catalogo} rol={r} onListo={listo} />
              )}
            </article>
          ))}
        </div>
      </Estado>
    </>
  );
}
