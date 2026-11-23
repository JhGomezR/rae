'use client';

import { useState, type FormEvent } from 'react';
import { Encabezado, Estado, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Periodo {
  id: number;
  codigo: string;
  activo: boolean;
  apreciacionAbierta: boolean;
  alcanceAbierto: boolean;
  apreciacionCierra: string | null;
  alcanceCierra: string | null;
}

const aFecha = (v: string | null) => (v ? v.slice(0, 10) : '');

export default function PeriodosPage() {
  const { datos, error, cargando, recargar } = useDatos<Periodo[]>('/periodos');
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState('');

  const accion = async (f: () => Promise<unknown>) => {
    try {
      await f();
      setAviso('');
      await recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  const crear = (e: FormEvent) => {
    e.preventDefault();
    void accion(async () => {
      await api('/periodos', 'POST', { codigo });
      setCodigo('');
    });
  };
  const editar = (id: number, d: Record<string, unknown>) =>
    void accion(() => api(`/periodos/${id}`, 'PATCH', d));

  return (
    <>
      <Encabezado
        titulo="Periodos"
        texto="Solo un periodo está activo. Al abrir un momento se avisa por correo."
      />
      <form onSubmit={crear} className="card mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          Nuevo periodo
          <input
            className="input mt-1 font-normal"
            placeholder="2027-1"
            pattern="\d{4}-[12]"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>
        <button className="btn btn-primary">Crear</button>
      </form>
      {aviso && (
        <p role="alert" className="mb-3 text-sm text-err">
          {aviso}
        </p>
      )}
      <Estado cargando={cargando && !datos} error={error}>
        {!datos?.length ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {datos.map((p) => (
              <article key={p.id} className="card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2>{p.codigo}</h2>
                  {p.activo ? (
                    <span className="chip">Activo</span>
                  ) : (
                    <button className="btn" onClick={() => editar(p.id, { activo: true })}>
                      Activar
                    </button>
                  )}
                </div>
                {p.activo && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['apreciacionAbierta', 'apreciacionCierra', 'Apreciación'],
                        ['alcanceAbierto', 'alcanceCierra', 'Alcance'],
                      ] as const
                    ).map(([abierto, cierra, nombre]) => (
                      <div key={abierto} className="space-y-2 rounded-lg bg-surface-2 p-3">
                        <button
                          className={`btn w-full ${p[abierto] ? 'btn-primary' : ''}`}
                          aria-pressed={p[abierto]}
                          onClick={() => editar(p.id, { [abierto]: !p[abierto] })}
                        >
                          {nombre}: {p[abierto] ? 'abierto' : 'cerrado'}
                        </button>
                        <label className="block text-sm font-semibold">
                          Fecha de cierre
                          <input
                            type="date"
                            className="input mt-1 font-normal"
                            value={aFecha(p[cierra])}
                            onChange={(e) =>
                              editar(p.id, {
                                [cierra]: e.target.value
                                  ? `${e.target.value}T23:59:59-05:00`
                                  : null,
                              })
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Estado>
    </>
  );
}
