'use client';

import { CORTES, type Corte, type EstadoInformeDocente } from '@rae/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { ChipEstado, fechaHora, type TipoInforme } from './comun';

interface Mios {
  vinculacion: string | null;
  permitido: boolean;
  informes: {
    id: number;
    titulo: string;
    estado: EstadoInformeDocente;
    entregadoEn: string | null;
    actualizadoEn: string;
    periodo: { codigo: string };
  }[];
  periodos: { id: number; codigo: string; activo: boolean }[];
  cursos: {
    id: number;
    grupo: string;
    semestreOferta: number;
    periodoId: number;
    unidad: { nombre: string };
  }[];
}

/** Lista de informes del docente y creación de uno nuevo. */
export function ListaInformes({
  tipo,
  titulo,
  texto,
  base,
}: {
  tipo: TipoInforme;
  titulo: string;
  texto: string;
  base: string;
}) {
  const router = useRouter();
  const { datos, error, cargando } = useDatos<Mios>(`/mis-informes?tipo=${tipo}`);
  const [periodoId, setPeriodoId] = useState<number | ''>('');
  const [cursoId, setCursoId] = useState<number | ''>('');
  const [corte, setCorte] = useState<Corte>(1);
  const [aviso, setAviso] = useState('');
  const periodo = periodoId || datos?.periodos.find((p) => p.activo)?.id || datos?.periodos[0]?.id;
  const cursos = datos?.cursos.filter((c) => c.periodoId === periodo) ?? [];

  const crear = async () => {
    setAviso('');
    try {
      const r = await api<{ id: number }>('/mis-informes', 'POST', {
        tipo,
        periodoId: periodo,
        ...(cursoId ? { cursoId } : {}),
        ...(tipo === 'EJECUCION' ? { corte } : {}),
      });
      router.push(`${base}/${r.id}`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo crear.');
    }
  };

  return (
    <>
      <Encabezado titulo={titulo} texto={texto} />
      <Estado cargando={cargando && !datos} error={error}>
        {datos && !datos.permitido ? (
          <p className="card text-muted">
            Este informe es para docentes con otra vinculación. Si tu vinculación no es la correcta,
            pide al administrador que la actualice.
          </p>
        ) : (
          datos && (
            <div className="space-y-4">
              <section className="card flex flex-wrap items-end gap-3">
                <label className="text-sm font-semibold">
                  Periodo
                  <select
                    className="input mt-1 font-normal"
                    value={periodo ?? ''}
                    onChange={(e) => {
                      setPeriodoId(Number(e.target.value));
                      setCursoId('');
                    }}
                  >
                    {datos.periodos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo}
                        {p.activo ? ' (activo)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {tipo === 'EJECUCION' && (
                  <label className="text-sm font-semibold">
                    Corte
                    <select
                      className="input mt-1 font-normal"
                      value={corte}
                      onChange={(e) =>
                        setCorte(CORTES.find((n) => String(n) === e.target.value) ?? 1)
                      }
                    >
                      {CORTES.map((n) => (
                        <option key={n} value={n}>
                          Corte {n}
                          {n === CORTES[CORTES.length - 1] ? ' (cierre del semestre)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {tipo === 'CATEDRA' && (
                  <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-md">
                    Unidad de formación (opcional, llena los datos)
                    <select
                      className="input mt-1 font-normal"
                      value={cursoId}
                      onChange={(e) => setCursoId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Escribirla a mano</option>
                      {cursos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.unidad.nombre} · semestre {c.semestreOferta} · grupo {c.grupo}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  className="btn btn-primary"
                  disabled={!periodo}
                  onClick={() => void crear()}
                >
                  {tipo === 'AGENDA'
                    ? 'Crear agenda'
                    : tipo === 'EJECUCION'
                      ? 'Crear informe del corte'
                      : 'Nuevo informe'}
                </button>
                {aviso && (
                  <p role="alert" className="w-full text-sm text-err">
                    {aviso}
                  </p>
                )}
              </section>
              {!datos.informes.length ? (
                <p className="card text-muted">No existen datos para esta sección.</p>
              ) : (
                <div className="tabla-wrap">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Informe</th>
                        <th>Periodo</th>
                        <th>Estado</th>
                        <th>Entregado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.informes.map((i) => (
                        <tr key={i.id}>
                          <td className="min-w-56">{i.titulo}</td>
                          <td>{i.periodo.codigo}</td>
                          <td>
                            <ChipEstado estado={i.estado} />
                          </td>
                          <td className="whitespace-nowrap">{fechaHora(i.entregadoEn)}</td>
                          <td>
                            <Link className="btn btn-primary" href={`${base}/${i.id}`}>
                              {i.estado === 'BORRADOR' || i.estado === 'AJUSTES'
                                ? 'Diligenciar'
                                : 'Ver'}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </Estado>
    </>
  );
}
