'use client';

import { DEDICACIONES, ESCALAFONES, type DatosAgenda } from '@rae/shared';
import { Campo } from '../comun';

export interface DocenteAgenda {
  nombre: string;
  documento: string;
  vinculacion: string;
  periodo: string;
}

/** Campos de identificación que deben estar diligenciados. */
export const identificacionCompleta = (d: DatosAgenda) =>
  !!(d.fechaDiligenciamiento && d.facultad && d.programa && d.dedicacion && d.escalafon);

function Opciones<T extends string>({
  nombre,
  opciones,
  valor,
  lectura,
  onCambio,
}: {
  nombre: string;
  opciones: Record<T, string>;
  valor: T | null;
  lectura?: boolean;
  onCambio: (v: T) => void;
}) {
  return (
    <fieldset className="text-sm">
      <legend className="font-semibold">{nombre}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(opciones) as T[]).map((o) => (
          <button
            key={o}
            type="button"
            disabled={lectura}
            aria-pressed={valor === o}
            className={`btn ${valor === o ? 'btn-primary' : ''}`}
            onClick={() => onCambio(o)}
          >
            {valor === o ? '✓ ' : ''}
            {opciones[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Paso 1 de la agenda: datos del profesor, dedicación y escalafón. */
export function PasoIdentificacion({
  d,
  docente,
  lectura,
  set,
}: {
  d: DatosAgenda;
  docente: DocenteAgenda;
  lectura?: boolean;
  set: <K extends keyof DatosAgenda>(k: K, v: DatosAgenda[K]) => void;
}) {
  const hoy = new Date().toLocaleDateString('es-CO');
  return (
    <section className="card space-y-4">
      <h2>1. Datos de identificación del profesor</h2>
      <dl className="grid gap-2 rounded-lg bg-surface-2 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Nombres y apellidos', docente.nombre],
          ['Identificación', docente.documento],
          ['Tipo de vinculación', docente.vinculacion],
          ['Periodo académico', docente.periodo],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-faint">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 md:grid-cols-2">
        <Opciones
          nombre="Tipo de dedicación"
          opciones={DEDICACIONES}
          valor={d.dedicacion}
          lectura={lectura}
          onCambio={(v) => set('dedicacion', v)}
        />
        <Opciones
          nombre="Escalafón profesoral"
          opciones={ESCALAFONES}
          valor={d.escalafon}
          lectura={lectura}
          onCambio={(v) => set('escalafon', v)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Campo
            etiqueta="Fecha de diligenciamiento"
            className="block"
            valor={d.fechaDiligenciamiento}
            max={20}
            lectura={lectura}
            onCambio={(v) => set('fechaDiligenciamiento', v)}
          />
          {!lectura && !d.fechaDiligenciamiento && (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-primary underline"
              onClick={() => set('fechaDiligenciamiento', hoy)}
            >
              Usar la fecha de hoy ({hoy})
            </button>
          )}
        </div>
        <Campo
          etiqueta="Franja horaria"
          valor={d.franjaHoraria}
          max={60}
          lectura={lectura}
          onCambio={(v) => set('franjaHoraria', v)}
        />
        <Campo
          etiqueta="Facultad adscrita"
          valor={d.facultad}
          max={200}
          lectura={lectura}
          onCambio={(v) => set('facultad', v)}
        />
        <Campo
          etiqueta="Programa adscrito"
          valor={d.programa}
          max={200}
          lectura={lectura}
          onCambio={(v) => set('programa', v)}
        />
      </div>
    </section>
  );
}
