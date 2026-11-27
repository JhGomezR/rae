'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { descargar, useDatos } from '@/lib/api';
import { MESES_LARGOS, type ResumenPoa } from './tipos';

/** POA elegido (por defecto el de la vigencia más reciente) y mes de corte ('' = automático). */
export function usePoaSeleccionado() {
  const lista = useDatos<ResumenPoa[]>('/poa');
  const [id, setId] = useState<number | null>(null);
  const [mes, setMes] = useState('');
  useEffect(() => {
    if (id === null && lista.datos?.length) {
      setId((lista.datos.find((p) => p.activo) ?? lista.datos[0])?.id ?? null);
    }
  }, [id, lista.datos]);
  return { lista, id, setId, mes, setMes };
}

export function SelectorPoa({
  lista,
  id,
  setId,
  mes,
  setMes,
}: ReturnType<typeof usePoaSeleccionado>) {
  if (!lista.datos?.length) {
    return (
      <p className="card text-muted">
        No existen datos para esta sección.{' '}
        <Link className="font-semibold text-primary underline" href="/admin/poa">
          Crear o importar un POA
        </Link>
      </p>
    );
  }
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-sm font-semibold">
        Plan operativo
        <select
          className="input mt-1 font-normal"
          value={id ?? ''}
          onChange={(e) => setId(Number(e.target.value))}
        >
          {lista.datos.map((p) => (
            <option key={p.id} value={p.id}>
              POA {p.vigencia}
              {p.activo ? '' : ' (inactivo)'}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Corte del seguimiento
        <select
          className="input mt-1 font-normal"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        >
          <option value="">Mes actual</option>
          {MESES_LARGOS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const FORMATOS = [
  {
    formato: 'xlsx',
    titulo: 'Excel F-PIN-001',
    texto: 'El formato institucional diligenciado y una hoja de seguimiento con el avance mensual.',
  },
  {
    formato: 'docx',
    titulo: 'Informe en Word',
    texto: 'Informe de desempeño con gráficos estadísticos, análisis y logros, editable.',
  },
  {
    formato: 'pdf',
    titulo: 'Informe en PDF',
    texto: 'El mismo informe de desempeño, listo para firmar y enviar.',
  },
] as const;

export function Descargas({
  id,
  vigencia,
  mes,
  compacto = false,
}: {
  id: number;
  vigencia: number;
  mes: string;
  compacto?: boolean;
}) {
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const bajar = async (formato: string) => {
    setOcupado(formato);
    setError('');
    try {
      const nombre =
        formato === 'xlsx'
          ? `F-PIN-001 POA ${vigencia}.xlsx`
          : `Informe de desempeño POA ${vigencia}.${formato}`;
      await descargar(`/poa/${id}/descargar?formato=${formato}${mes ? `&mes=${mes}` : ''}`, nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo.');
    } finally {
      setOcupado('');
    }
  };
  if (compacto) {
    return (
      <span className="flex flex-wrap gap-2">
        {FORMATOS.map((f) => (
          <button
            key={f.formato}
            className="btn"
            disabled={!!ocupado}
            onClick={() => void bajar(f.formato)}
          >
            {ocupado === f.formato ? 'Generando…' : f.titulo}
          </button>
        ))}
        {error && <span className="text-sm text-err">{error}</span>}
      </span>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {FORMATOS.map((f) => (
        <div key={f.formato} className="card flex flex-col gap-3">
          <h2>{f.titulo}</h2>
          <p className="flex-1 text-sm text-muted">{f.texto}</p>
          <button
            className="btn btn-primary"
            disabled={!!ocupado}
            onClick={() => void bajar(f.formato)}
          >
            {ocupado === f.formato ? 'Generando…' : `Descargar .${f.formato}`}
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-err md:col-span-3">
          {error}
        </p>
      )}
    </div>
  );
}
