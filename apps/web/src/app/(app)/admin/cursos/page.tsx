'use client';

import { Fragment, useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormCurso, type Opciones } from './FormCurso';
import { Inscripciones } from './Inscripciones';

interface Curso {
  id: number;
  grupo: string;
  activo: boolean;
  semestreOferta: number;
  periodoId: number;
  unidad: { id: number; nombre: string; activo: boolean };
  sede: { codigo: string };
  programa: { nombre: string };
  docente: { id: number; nombreCompleto: string };
  _count: { inscripciones: number; encuestas: number };
}
interface Pagina {
  datos: Curso[];
  total: number;
  pagina: number;
  tamano: number;
}

export default function CursosPage() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<{ id: number; panel: 'editar' | 'estudiantes' } | null>(
    null,
  );
  const [aviso, setAviso] = useState('');
  const params = new URLSearchParams({ pagina: String(pagina), estado, ...(q ? { q } : {}) });
  const { datos, error, cargando, recargar } = useDatos<Pagina>(`/cursos?${params}`);
  const { datos: opciones } = useDatos<Opciones>('/cursos/opciones');

  const alternar = async (c: Curso) => {
    const accion = c.activo ? 'inactivar' : 'activar';
    if (
      c.activo &&
      !window.confirm(
        `¿Inactivar ${c.unidad.nombre} · grupo ${c.grupo}? Dejará de aparecer en encuestas y estadísticas; nada se borra.`,
      )
    )
      return;
    try {
      await api(`/cursos/${c.id}`, 'PATCH', { activo: !c.activo });
      setAviso(`Curso ${accion === 'activar' ? 'activado' : 'inactivado'}.`);
      await recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  const ver = (id: number, panel: 'editar' | 'estudiantes') =>
    setAbierto(abierto?.id === id && abierto.panel === panel ? null : { id, panel });

  return (
    <>
      <Encabezado
        titulo="Cursos"
        texto="Asignaciones por periodo: unidad, grupo, docente y estudiantes inscritos."
      />
      {opciones && (
        <details className="card mb-4">
          <summary className="cursor-pointer font-semibold">Nuevo curso</summary>
          <div className="mt-3">
            <FormCurso
              opciones={opciones}
              onListo={async () => {
                setAviso('Curso creado.');
                await recargar();
              }}
            />
          </div>
        </details>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-sm">
          Buscar por unidad, docente o grupo
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
          Estado
          <select
            className="input mt-1 font-normal"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPagina(1);
            }}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
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
                    <th>Unidad</th>
                    <th>Grupo</th>
                    <th>Sede</th>
                    <th>Docente</th>
                    <th>Estudiantes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((c) => (
                    <Fragment key={c.id}>
                      <tr className={c.activo ? '' : 'text-faint'}>
                        <td className="min-w-52">
                          {c.unidad.nombre}
                          {!c.unidad.activo && (
                            <span className="block text-xs">Unidad eliminada</span>
                          )}
                        </td>
                        <td>{c.grupo}</td>
                        <td>{c.sede.codigo}</td>
                        <td className="min-w-48">{c.docente.nombreCompleto}</td>
                        <td>{c._count.inscripciones}</td>
                        <td>
                          <span className={`chip ${c.activo ? '' : 'chip-nivel lv1'}`}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <span className="flex gap-2">
                            <button
                              className="btn"
                              aria-expanded={abierto?.id === c.id && abierto.panel === 'editar'}
                              onClick={() => ver(c.id, 'editar')}
                            >
                              Editar
                            </button>
                            <button
                              className="btn"
                              aria-expanded={
                                abierto?.id === c.id && abierto.panel === 'estudiantes'
                              }
                              onClick={() => ver(c.id, 'estudiantes')}
                            >
                              Estudiantes
                            </button>
                            <button
                              className="btn whitespace-nowrap"
                              onClick={() => void alternar(c)}
                            >
                              {c.activo ? 'Inactivar' : 'Activar'}
                            </button>
                          </span>
                        </td>
                      </tr>
                      {abierto?.id === c.id && (
                        <tr>
                          <td colSpan={7}>
                            {abierto.panel === 'editar' && opciones ? (
                              <FormCurso
                                opciones={opciones}
                                cursoId={c.id}
                                inicial={{
                                  periodoId: c.periodoId,
                                  unidadId: c.unidad.id,
                                  docenteId: c.docente.id,
                                  sede: c.sede.codigo,
                                  programa: c.programa.nombre,
                                  grupo: c.grupo,
                                  semestreOferta: c.semestreOferta,
                                }}
                                onListo={async () => {
                                  setAviso('Curso actualizado.');
                                  setAbierto(null);
                                  await recargar();
                                }}
                              />
                            ) : (
                              <Inscripciones cursoId={c.id} onCambio={recargar} />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
