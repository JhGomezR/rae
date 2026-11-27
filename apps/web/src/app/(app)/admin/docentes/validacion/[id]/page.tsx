'use client';

import {
  VINCULACIONES,
  type DatosAgenda,
  type DatosCatedra,
  type DatosEjecucion,
  type DatosProgramador,
  type Vinculacion,
} from '@rae/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  ChipEstado,
  DescargarInforme,
  fechaHora,
  Revision,
  type InformeDetalle,
} from '@/components/informes-docentes/comun';
import { EditorAgenda } from '@/components/informes-docentes/EditorAgenda';
import { EditorCatedra } from '@/components/informes-docentes/EditorCatedra';
import { EditorEjecucion } from '@/components/informes-docentes/EditorEjecucion';
import { EditorProgramador } from '@/components/informes-docentes/EditorProgramador';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

const nombreVinculacion = (v: string | null) =>
  v ? (VINCULACIONES[v as Vinculacion] ?? v) : 'sin vinculación';

export default function PaginaRevision() {
  const id = Number(useParams<{ id: string }>()?.id);
  const {
    datos: i,
    error,
    cargando,
    recargar,
  } = useDatos<InformeDetalle<DatosAgenda | DatosCatedra | DatosEjecucion | DatosProgramador>>(
    id ? `/validacion-informes/${id}` : null,
  );
  const [observacion, setObservacion] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const revisar = async (decision: 'APROBAR' | 'AJUSTES') => {
    setOcupado(true);
    setAviso(null);
    try {
      await api(`/validacion-informes/${id}/revisar`, 'POST', { decision, observacion });
      setAviso({
        texto:
          decision === 'APROBAR'
            ? 'Informe aprobado.'
            : 'Se enviaron los ajustes al docente; el informe quedó habilitado para que lo corrija.',
      });
      setObservacion('');
      await recargar();
    } catch (e) {
      setAviso({
        texto: e instanceof Error ? e.message : 'No se pudo registrar la revisión.',
        error: true,
      });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Estado cargando={cargando && !i} error={error}>
      {i && (
        <>
          <Encabezado
            titulo={i.titulo}
            texto={`${i.docente.nombreCompleto} · ${nombreVinculacion(i.docente.vinculacion)} · periodo ${i.periodo.codigo} · entregado ${fechaHora(i.entregadoEn)}`}
          >
            <Link className="btn" href="/admin/docentes/validacion">
              Volver
            </Link>
          </Encabezado>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <section className="card space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="mr-auto">Decisión</h2>
                <ChipEstado estado={i.estado} />
                <DescargarInforme
                  ruta={`/validacion-informes/${id}`}
                  tipo={i.tipo}
                  nombre={`${i.titulo} - ${i.docente.nombreCompleto}`}
                />
              </div>
              {i.estado === 'ENTREGADO' || i.estado === 'APROBADO' ? (
                <>
                  <label className="block text-sm font-semibold">
                    Observaciones, ajustes o cambios
                    <textarea
                      className="input mt-1 min-h-28 font-normal"
                      maxLength={3000}
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      placeholder={
                        i.tipo === 'AGENDA'
                          ? 'Aparecen en «Observaciones decano facultad» de la agenda.'
                          : 'Indica qué debe corregir el docente.'
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {i.estado === 'ENTREGADO' && (
                      <button
                        className="btn btn-primary"
                        disabled={ocupado}
                        onClick={() => void revisar('APROBAR')}
                      >
                        ✓ Aprobar
                      </button>
                    )}
                    <button
                      className="btn"
                      disabled={ocupado || observacion.trim().length < 5}
                      onClick={() => void revisar('AJUSTES')}
                    >
                      {i.estado === 'APROBADO' ? 'Reabrir y pedir ajustes' : 'Solicitar ajustes'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  {i.estado === 'AJUSTES'
                    ? 'Esperando que el docente haga los ajustes y lo entregue de nuevo.'
                    : 'El docente aún no lo ha entregado.'}
                </p>
              )}
              {aviso && (
                <p
                  role={aviso.error ? 'alert' : 'status'}
                  className={`text-sm ${aviso.error ? 'text-err' : 'text-muted'}`}
                >
                  {aviso.texto}
                </p>
              )}
            </section>
            <Revision informe={i as InformeDetalle<unknown>} />
          </div>
          {i.tipo === 'PROGRAMADOR' ? (
            <EditorProgramador
              lectura
              d={i.datos as DatosProgramador}
              onCambio={() => undefined}
              docente={{ nombre: i.docente.nombreCompleto, periodo: i.periodo.codigo }}
            />
          ) : i.tipo === 'EJECUCION' ? (
            <EditorEjecucion
              lectura
              d={i.datos as DatosEjecucion}
              onCambio={() => undefined}
              docente={{ nombre: i.docente.nombreCompleto, periodo: i.periodo.codigo }}
            />
          ) : i.tipo === 'AGENDA' ? (
            <EditorAgenda
              lectura
              d={i.datos as DatosAgenda}
              onCambio={() => undefined}
              docente={{
                nombre: i.docente.nombreCompleto,
                documento: i.docente.documento,
                vinculacion: nombreVinculacion(i.docente.vinculacion),
                periodo: `${i.periodo.numero === 1 ? 'A' : 'B'} (${i.periodo.codigo})`,
              }}
            />
          ) : (
            <EditorCatedra
              lectura
              d={i.datos as DatosCatedra}
              onCambio={() => undefined}
              docente={{ nombre: i.docente.nombreCompleto, documento: i.docente.documento }}
            />
          )}
        </>
      )}
    </Estado>
  );
}
