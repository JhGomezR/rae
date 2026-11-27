'use client';

import { ESTADOS_INFORME_DOCENTE, type EstadoInformeDocente } from '@rae/shared';
import { useState } from 'react';
import { descargar } from '@/lib/api';

export type TipoInforme = 'AGENDA' | 'CATEDRA';

export interface EventoInforme {
  id: number;
  accion: string;
  comentario: string | null;
  creadoEn: string;
}

export interface InformeDetalle<T> {
  id: number;
  tipo: TipoInforme;
  titulo: string;
  estado: EstadoInformeDocente;
  datos: T;
  observacion: string | null;
  entregadoEn: string | null;
  revisadoEn: string | null;
  docente: { nombreCompleto: string; documento: string; vinculacion: string | null };
  periodo: { id: number; codigo: string; numero: number };
  revisor: { nombreCompleto: string } | null;
  eventos: EventoInforme[];
}

const CLASE: Record<EstadoInformeDocente, string> = {
  BORRADOR: 'chip',
  ENTREGADO: 'chip chip-nivel lv4',
  AJUSTES: 'chip chip-nivel lv2',
  APROBADO: 'chip chip-nivel lv3',
};

export function ChipEstado({ estado }: { estado: EstadoInformeDocente }) {
  return <span className={CLASE[estado]}>{ESTADOS_INFORME_DOCENTE[estado]}</span>;
}

const ACCIONES: Record<string, string> = {
  CREADO: 'Creado',
  ENTREGADO: 'Entregado para revisión',
  AJUSTES: 'Se solicitaron ajustes',
  APROBADO: 'Aprobado',
};

export const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Observación del revisor e historial del informe. */
export function Revision({ informe }: { informe: InformeDetalle<unknown> }) {
  return (
    <section className="card space-y-3">
      <h2>Revisión</h2>
      {informe.observacion && (informe.estado === 'AJUSTES' || informe.estado === 'APROBADO') ? (
        <div
          className={`rounded-lg border p-3 ${informe.estado === 'AJUSTES' ? 'border-[var(--lv2)] bg-[var(--lv2-bg)]' : 'border-line'}`}
        >
          <p className="text-sm font-semibold">
            {informe.estado === 'AJUSTES' ? 'Ajustes o cambios solicitados' : 'Observación'}
            {informe.revisor ? ` · ${informe.revisor.nombreCompleto}` : ''}
          </p>
          <p className="mt-1 whitespace-pre-line">{informe.observacion}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">Sin observaciones.</p>
      )}
      <ol className="space-y-1 text-sm">
        {informe.eventos.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-x-2">
            <span className="text-faint tabular-nums">{fechaHora(e.creadoEn)}</span>
            <span>{ACCIONES[e.accion] ?? e.accion}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Botones para descargar el informe en Word o PDF. */
export function DescargarInforme({ ruta, nombre }: { ruta: string; nombre: string }) {
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const bajar = async (formato: 'docx' | 'pdf') => {
    setOcupado(formato);
    setError('');
    try {
      await descargar(`${ruta}/descargar?formato=${formato}`, `${nombre}.${formato}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo.');
    } finally {
      setOcupado('');
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button className="btn" disabled={!!ocupado} onClick={() => void bajar('docx')}>
        {ocupado === 'docx' ? 'Generando…' : 'Word'}
      </button>
      <button className="btn" disabled={!!ocupado} onClick={() => void bajar('pdf')}>
        {ocupado === 'pdf' ? 'Generando…' : 'PDF'}
      </button>
      {error && <span className="text-sm text-err">{error}</span>}
    </span>
  );
}

/** Campo de texto con etiqueta, usado en los editores. */
export function Campo({
  etiqueta,
  valor,
  onCambio,
  lectura,
  largo = false,
  max = 300,
  tipo = 'text',
  className = '',
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  lectura?: boolean;
  largo?: boolean;
  max?: number;
  tipo?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm font-semibold ${className}`}>
      {etiqueta}
      {largo ? (
        <textarea
          className="input mt-1 min-h-20 font-normal"
          maxLength={max}
          readOnly={lectura}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
        />
      ) : (
        <input
          className="input mt-1 font-normal"
          type={tipo}
          maxLength={max}
          readOnly={lectura}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
        />
      )}
    </label>
  );
}

export const aNumero = (v: string, max: number) => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : null;
};
