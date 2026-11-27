'use client';

import { EDITABLE } from '@rae/shared';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { ChipEstado, DescargarInforme, Revision, type InformeDetalle } from './comun';

/** Diligenciar, guardar y entregar un informe; queda bloqueado mientras se revisa. */
export function PaginaInforme<T>({
  id,
  volver,
  editor,
}: {
  id: number;
  volver: string;
  editor: (p: {
    d: T;
    onCambio: (d: T) => void;
    lectura: boolean;
    informe: InformeDetalle<T>;
  }) => ReactNode;
}) {
  const {
    datos: informe,
    error,
    cargando,
    recargar,
  } = useDatos<InformeDetalle<T>>(id ? `/mis-informes/${id}` : null);
  const [d, setD] = useState<T | null>(null);
  const [cambios, setCambios] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (informe) {
      setD(informe.datos);
      setCambios(false);
    }
  }, [informe]);

  useEffect(() => {
    if (!cambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [cambios]);

  const editable = !!informe && EDITABLE.includes(informe.estado);

  const guardar = async (silencioso = false) => {
    if (!d) return;
    setOcupado(true);
    try {
      await api(`/mis-informes/${id}`, 'PUT', { datos: d });
      setCambios(false);
      if (!silencioso) setAviso({ texto: 'Cambios guardados.' });
      return true;
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo guardar.', error: true });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const entregar = async () => {
    if (
      !window.confirm(
        '¿Entregar el informe? Quedará bloqueado hasta que lo revisen; si piden ajustes podrás editarlo de nuevo.',
      )
    )
      return;
    if (!(await guardar(true))) return;
    setOcupado(true);
    try {
      await api(`/mis-informes/${id}/entregar`, 'POST');
      setAviso({ texto: 'Informe entregado. Quedó bloqueado hasta su revisión.' });
      await recargar();
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo entregar.', error: true });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Estado cargando={cargando && !informe} error={error}>
      {informe && d && (
        <>
          <Encabezado titulo={informe.titulo} texto={`Periodo ${informe.periodo.codigo}`}>
            <Link className="btn" href={volver}>
              Volver
            </Link>
          </Encabezado>
          <div className="sticky top-12 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm lg:top-2">
            <ChipEstado estado={informe.estado} />
            {editable ? (
              <>
                <button
                  className="btn"
                  disabled={ocupado || !cambios}
                  onClick={() => void guardar()}
                >
                  {cambios ? 'Guardar' : 'Guardado'}
                </button>
                <button
                  className="btn btn-primary"
                  disabled={ocupado}
                  onClick={() => void entregar()}
                >
                  ✓ Marcar como entregado
                </button>
              </>
            ) : (
              <span className="text-sm text-muted">
                {informe.estado === 'APROBADO'
                  ? 'Aprobado: ya no se puede modificar.'
                  : 'Entregado: bloqueado hasta la revisión.'}
              </span>
            )}
            <span className="ml-auto">
              <DescargarInforme
                ruta={`/mis-informes/${id}`}
                tipo={informe.tipo}
                nombre={`${informe.titulo} - ${informe.docente.nombreCompleto}`}
              />
            </span>
            {aviso && (
              <p
                role={aviso.error ? 'alert' : 'status'}
                className={`w-full text-sm ${aviso.error ? 'text-err' : 'text-muted'}`}
              >
                {aviso.texto}
              </p>
            )}
          </div>
          {(informe.estado !== 'BORRADOR' || informe.eventos.length > 1) && (
            <div className="mb-4">
              <Revision informe={informe as InformeDetalle<unknown>} />
            </div>
          )}
          {editor({
            d,
            lectura: !editable,
            informe,
            onCambio: (n) => {
              setD(n);
              setCambios(true);
            },
          })}
        </>
      )}
    </Estado>
  );
}
