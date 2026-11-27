'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormEncabezado } from '../FormEncabezado';
import { PanelDesempeno } from '../PanelDesempeno';
import { Descargas } from '../SelectorPoa';
import {
  CHIP_ESTADO,
  ESTADOS,
  MESES,
  pctPoa,
  TIPOS,
  type Actividad,
  type DetallePoa,
} from '../tipos';
import { FormActividad } from './FormActividad';
import { Seguimiento } from './Seguimiento';

type Pestana = 'actividades' | 'desempeno' | 'datos';
type Panel = { id: number; tipo: 'editar' | 'seguimiento' } | null;

function MesesMini({ meses }: { meses: number[] }) {
  return (
    <span
      className="grid grid-cols-12 gap-px"
      aria-label={`Meses: ${meses.map((m) => MESES[m - 1]).join(', ')}`}
    >
      {MESES.map((m, i) => (
        <span
          key={m}
          title={m}
          className={`h-4 w-3 rounded-sm ${meses.includes(i + 1) ? 'bg-primary' : 'bg-surface-2 border border-line'}`}
        />
      ))}
    </span>
  );
}

export default function PaginaDetallePoa() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { datos: p, error, cargando, recargar } = useDatos<DetallePoa>(id ? `/poa/${id}` : null);
  const [pestana, setPestana] = useState<Pestana>('actividades');
  const [panel, setPanel] = useState<Panel>(null);
  const [aviso, setAviso] = useState('');

  const abrir = (a: Actividad, tipo: 'editar' | 'seguimiento') =>
    setPanel(panel?.id === a.id && panel.tipo === tipo ? null : { id: a.id, tipo });
  const activar = async (actividadId: number, activo: boolean) => {
    await api(`/poa/actividades/${actividadId}`, 'PUT', { activo });
    setAviso(
      activo ? 'Actividad activada.' : 'Actividad inactivada: ya no cuenta en el desempeño.',
    );
    await recargar();
  };

  return (
    <Estado cargando={cargando && !p} error={error}>
      {p && (
        <>
          <Encabezado
            titulo={`POA ${p.vigencia}`}
            texto={`${p.dependencia} · Responsable: ${p.responsable}`}
          >
            <Link className="btn" href="/admin/poa">
              Volver
            </Link>
          </Encabezado>
          <div role="tablist" className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ['actividades', `Actividades (${p.actividades.length})`],
                ['desempeno', 'Desempeño'],
                ['datos', 'Información básica e informes'],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                role="tab"
                aria-selected={pestana === k}
                className={`btn ${pestana === k ? 'btn-primary' : ''}`}
                onClick={() => setPestana(k)}
              >
                {t}
              </button>
            ))}
          </div>
          {aviso && (
            <p role="status" className="mb-3 text-sm text-muted">
              {aviso}
            </p>
          )}

          {pestana === 'actividades' && (
            <div className="space-y-4">
              <details className="card">
                <summary className="cursor-pointer font-semibold">Nueva actividad</summary>
                <div className="mt-3">
                  <FormActividad
                    poaId={p.id}
                    siguienteNumero={Math.max(0, ...p.actividades.map((a) => a.numero)) + 1}
                    onListo={async () => {
                      setAviso('Actividad agregada.');
                      await recargar();
                    }}
                  />
                </div>
              </details>
              {!p.actividades.length ? (
                <p className="card text-muted">No existen datos para esta sección.</p>
              ) : (
                <div className="tabla-wrap">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Actividad</th>
                        <th>Indicador</th>
                        <th>Meses</th>
                        <th>Avance</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.actividades.map((a) => {
                        const d = p.desempeno.porActividad.find((x) => x.id === a.id);
                        return (
                          <Fragment key={a.id}>
                            <tr>
                              <td>{a.numero}</td>
                              <td className="min-w-72">
                                {a.actividad}
                                <span className="block text-xs text-faint">{a.proyecto}</span>
                              </td>
                              <td className="min-w-48">
                                {a.indicadorActividad || '—'}
                                {a.tipoIndicador && (
                                  <span className="block text-xs text-faint">
                                    {TIPOS[a.tipoIndicador]}
                                  </span>
                                )}
                              </td>
                              <td>
                                <MesesMini meses={a.meses} />
                              </td>
                              <td className="min-w-32">
                                {d && (
                                  <>
                                    <span className="tabular-nums">
                                      {pctPoa(d.avance)}{' '}
                                      <span className="text-faint">/ {pctPoa(d.esperado)}</span>
                                    </span>
                                    <span className={`${CHIP_ESTADO[d.estado]} mt-1`}>
                                      {ESTADOS[d.estado].nombre}
                                    </span>
                                  </>
                                )}
                              </td>
                              <td>
                                <span className="flex gap-2">
                                  <button
                                    className="btn btn-primary"
                                    aria-expanded={
                                      panel?.id === a.id && panel.tipo === 'seguimiento'
                                    }
                                    onClick={() => abrir(a, 'seguimiento')}
                                  >
                                    Seguimiento
                                  </button>
                                  <button
                                    className="btn"
                                    aria-expanded={panel?.id === a.id && panel.tipo === 'editar'}
                                    onClick={() => abrir(a, 'editar')}
                                  >
                                    Editar
                                  </button>
                                  <button className="btn" onClick={() => void activar(a.id, false)}>
                                    Inactivar
                                  </button>
                                </span>
                              </td>
                            </tr>
                            {panel?.id === a.id && (
                              <tr>
                                <td colSpan={6}>
                                  {panel.tipo === 'editar' ? (
                                    <FormActividad
                                      poaId={p.id}
                                      actividad={a}
                                      onListo={async () => {
                                        setAviso('Actividad actualizada.');
                                        setPanel(null);
                                        await recargar();
                                      }}
                                    />
                                  ) : (
                                    <Seguimiento
                                      actividad={a}
                                      mesSugerido={p.desempeno.mesCorte || 1}
                                      onListo={recargar}
                                    />
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {p.inactivas.length > 0 && (
                <details className="card">
                  <summary className="cursor-pointer font-semibold">
                    Actividades inactivas ({p.inactivas.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {p.inactivas.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          {a.numero}. {a.actividad}
                        </span>
                        <button className="btn" onClick={() => void activar(a.id, true)}>
                          Activar
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {pestana === 'desempeno' && <PanelDesempeno d={p.desempeno} vigencia={p.vigencia} />}

          {pestana === 'datos' && (
            <div className="space-y-4">
              <section className="card">
                <h2 className="mb-3">Información básica (F-PIN-001)</h2>
                <FormEncabezado
                  poaId={p.id}
                  inicial={{
                    vigencia: p.vigencia,
                    fechaElaboracion: p.fechaElaboracion.slice(0, 10),
                    dependencia: p.dependencia,
                    areaFacultad: p.areaFacultad,
                    responsable: p.responsable,
                    cargo: p.cargo,
                  }}
                  onListo={async () => {
                    setAviso('Información básica actualizada.');
                    await recargar();
                  }}
                />
              </section>
              <section>
                <h2 className="mb-3">Informes (corte del mes actual)</h2>
                <Descargas id={p.id} vigencia={p.vigencia} mes="" />
              </section>
            </div>
          )}
        </>
      )}
    </Estado>
  );
}
