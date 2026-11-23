'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Ajustes, Informe } from './tipos';

interface Props {
  informe: Informe;
  periodoId: number;
  onGuardado: (i: Informe) => void;
}

export function EditorInforme({ informe: i, periodoId, onGuardado }: Props) {
  const inicial: Ajustes = {
    programa: i.programa,
    lugar: i.lugar,
    fechaEntrega: i.fechaEntrega,
    presupuesto: i.presupuesto,
    anexos: i.anexos,
    analisis: i.ajustes.analisis ?? '',
    logros: i.ajustes.logros ?? '',
    impactos: i.ajustes.impactos ?? '',
  };
  const [f, setF] = useState(inicial);
  const [porcentaje, setPorcentaje] = useState(
    i.ajustes.porcentaje === undefined ? '' : String(i.ajustes.porcentaje),
  );
  const [aviso, setAviso] = useState('');
  const campo = (k: keyof Ajustes) => ({
    value: String(f[k] ?? ''),
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const n = await api<Informe>(`/informes/${i.clave}/ajustes?periodoId=${periodoId}`, 'PUT', {
        ...f,
        porcentaje: porcentaje === '' ? null : Number(porcentaje),
      });
      onGuardado(n);
      setAviso('Cambios guardados.');
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">Ajustar datos y redacción</summary>
      <form onSubmit={(e) => void guardar(e)} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Programa
            <input className="input mt-1 font-normal" maxLength={200} {...campo('programa')} />
          </label>
          <label className="text-sm font-semibold">
            Lugar de desarrollo
            <input className="input mt-1 font-normal" maxLength={200} {...campo('lugar')} />
          </label>
          <label className="text-sm font-semibold">
            Fecha de entrega
            <input className="input mt-1 font-normal" maxLength={200} {...campo('fechaEntrega')} />
          </label>
          <label className="text-sm font-semibold">
            Porcentaje de terminación (vacío = automático: {i.porcentaje}%)
            <input
              className="input mt-1 font-normal"
              type="number"
              min={0}
              max={100}
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Análisis adicional del programa
          <textarea
            className="input mt-1 font-normal"
            rows={3}
            maxLength={5000}
            {...campo('analisis')}
          />
        </label>
        <label className="block text-sm font-semibold">
          Logros, uno por línea (vacío = generados con los datos)
          <textarea
            className="input mt-1 font-normal"
            rows={4}
            maxLength={5000}
            placeholder={i.logros.join('\n')}
            {...campo('logros')}
          />
        </label>
        <label className="block text-sm font-semibold">
          Impactos, uno por línea (vacío = generados con los datos)
          <textarea
            className="input mt-1 font-normal"
            rows={4}
            maxLength={5000}
            placeholder={i.impactos.join('\n')}
            {...campo('impactos')}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Presupuesto invertido
            <input className="input mt-1 font-normal" maxLength={200} {...campo('presupuesto')} />
          </label>
          <label className="text-sm font-semibold">
            Anexos
            <textarea
              className="input mt-1 font-normal"
              rows={1}
              maxLength={1000}
              {...campo('anexos')}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary">Guardar cambios</button>
          {aviso && (
            <span role="status" className="text-sm text-muted">
              {aviso}
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
