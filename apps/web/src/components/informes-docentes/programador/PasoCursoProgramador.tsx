'use client';

import type { DatosProgramador } from '@rae/shared';
import { aNumero, Campo } from '../comun';

type Set = <K extends keyof DatosProgramador>(k: K, v: DatosProgramador[K]) => void;

/** Paso 1: encabezado del F-DOC-052 (facultad, programa, unidad, créditos, horas y objetivo). */
export function PasoCursoProgramador({
  d,
  docente,
  lectura,
  set,
}: {
  d: DatosProgramador;
  docente: { nombre: string; periodo: string };
  lectura?: boolean;
  set: Set;
}) {
  const numero = (k: 'creditos' | 'horasSemana', etiqueta: string, max: number) => (
    <label className="text-sm font-semibold">
      {etiqueta}
      <input
        className="input mt-1 font-normal"
        type="number"
        min={0}
        max={max}
        readOnly={lectura}
        value={d[k] ?? ''}
        onChange={(e) => set(k, aNumero(e.target.value, max))}
      />
    </label>
  );
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <section className="card space-y-4">
      <h2>Curso y objetivo de aprendizaje</h2>
      <dl className="grid gap-2 rounded-lg bg-surface-2 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-faint">Docente</dt>
          <dd className="font-semibold">{docente.nombre}</dd>
        </div>
        <div>
          <dt className="text-faint">Periodo académico</dt>
          <dd className="font-semibold">{docente.periodo}</dd>
        </div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-6">
        <Campo
          etiqueta="Facultad"
          className="sm:col-span-3"
          valor={d.facultad}
          max={200}
          lectura={lectura}
          onCambio={(v) => set('facultad', v)}
        />
        <Campo
          etiqueta="Programa académico"
          className="sm:col-span-3"
          valor={d.programa}
          max={200}
          lectura={lectura}
          onCambio={(v) => set('programa', v)}
        />
        <Campo
          etiqueta="Unidad de formación"
          className="sm:col-span-3"
          valor={d.unidad}
          max={200}
          lectura={lectura}
          onCambio={(v) => set('unidad', v)}
        />
        <Campo
          etiqueta="Grupo"
          valor={d.grupo}
          max={10}
          lectura={lectura}
          onCambio={(v) => set('grupo', v.toUpperCase())}
        />
        {numero('creditos', 'No. créditos', 20)}
        {numero('horasSemana', 'Horas semanales', 60)}
      </div>
      <Campo
        etiqueta="Objetivo de aprendizaje"
        largo
        max={3000}
        valor={d.objetivo}
        lectura={lectura}
        onCambio={(v) => set('objetivo', v)}
      />
      {!lectura && (
        <p className="text-xs text-faint">
          El objetivo viene de la base de conocimiento de la unidad. Ajústalo si el syllabus vigente
          dice otra cosa.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Fecha de elaboración"
          tipo="date"
          valor={d.fecha}
          max={10}
          lectura={lectura}
          onCambio={(v) => set('fecha', v)}
        />
        {!lectura && d.fecha !== hoy && (
          <button type="button" className="btn" onClick={() => set('fecha', hoy)}>
            Usar la fecha de hoy
          </button>
        )}
      </div>
    </section>
  );
}
