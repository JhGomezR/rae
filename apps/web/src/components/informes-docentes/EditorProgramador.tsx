'use client';

import {
  cursoProgramadorCompleto,
  semanaCompleta,
  semanaConDatos,
  type DatosProgramador,
} from '@rae/shared';
import { Asistente, type EstadoPaso, type Paso } from './Asistente';
import { PasoCursoProgramador } from './programador/PasoCursoProgramador';
import { PasoSemanas } from './programador/PasoSemanas';

/** Semanas por paso del asistente. */
const BLOQUE = 8;

/**
 * Programador de clases (F-DOC-052) como asistente: curso y objetivo, las semanas en bloques
 * de ocho y un resumen. Con `lectura` sirve para revisar (todo a la vista).
 */
export function EditorProgramador({
  d,
  onCambio,
  lectura,
  docente,
}: {
  d: DatosProgramador;
  onCambio: (d: DatosProgramador) => void;
  lectura?: boolean;
  docente: { nombre: string; periodo: string };
}) {
  const set = <K extends keyof DatosProgramador>(k: K, v: DatosProgramador[K]) =>
    onCambio({ ...d, [k]: v });
  const bloques = Math.max(1, Math.ceil(d.semanas.length / BLOQUE));

  const pasosSemanas: Paso[] = Array.from({ length: bloques }, (_, b) => {
    const desde = b * BLOQUE;
    const hasta = desde + BLOQUE;
    const rango = d.semanas.slice(desde, hasta);
    const completas = rango.filter(semanaCompleta).length;
    const estado: EstadoPaso =
      rango.length && completas === rango.length
        ? 'listo'
        : rango.some(semanaConDatos)
          ? 'alerta'
          : 'pendiente';
    return {
      id: `semanas-${b}`,
      titulo: `Semanas ${desde + 1}–${Math.max(desde + 1, Math.min(hasta, d.semanas.length))}`,
      detalle: `${completas} de ${rango.length}`,
      estado,
      contenido: (
        <PasoSemanas
          key={desde}
          d={d}
          lectura={lectura}
          set={set}
          desde={desde}
          hasta={hasta}
          ultimo={b === bloques - 1}
        />
      ),
    };
  });

  const pasos: Paso[] = [
    {
      id: 'curso',
      titulo: 'Curso y objetivo',
      detalle: d.grupo ? `grupo ${d.grupo}` : undefined,
      estado: cursoProgramadorCompleto(d) ? 'listo' : 'pendiente',
      contenido: <PasoCursoProgramador d={d} docente={docente} lectura={lectura} set={set} />,
    },
    ...pasosSemanas,
  ];
  const incompletas = d.semanas.filter((s) => !semanaCompleta(s));
  const resumen: Paso = {
    id: 'resumen',
    titulo: 'Resumen',
    estado: pasos.every((p) => p.estado === 'listo') ? 'listo' : 'pendiente',
    contenido: (irA) => (
      <section className="card space-y-4">
        <h2>Resumen del programador</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              'Unidad de formación',
              d.unidad ? `${d.unidad}${d.grupo ? ` · ${d.grupo}` : ''}` : '—',
            ],
            ['Horas semanales', d.horasSemana ?? '—'],
            ['Semanas programadas', d.semanas.length],
            [
              'Semanas completas',
              `${d.semanas.length - incompletas.length} de ${d.semanas.length}`,
            ],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-lg bg-surface-2 p-3">
              <dt className="text-faint">{k}</dt>
              <dd className="font-serif text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {!cursoProgramadorCompleto(d) && (
          <p className="text-sm text-[var(--warn)]">
            Faltan datos del curso (facultad, programa, unidad, horas semanales u objetivo).{' '}
            <button type="button" className="font-semibold underline" onClick={() => irA(0)}>
              {lectura ? 'Ver' : 'Completar'}
            </button>
          </p>
        )}
        {incompletas.length > 0 ? (
          <div className="text-sm">
            <p className="text-muted">
              Semanas sin completar (cada una necesita contenidos, didáctica, una actividad
              individual o grupal y recursos):
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {incompletas.map((s) => (
                <button
                  key={s.semana}
                  type="button"
                  className="chip text-xs"
                  onClick={() => irA(1 + Math.floor((s.semana - 1) / BLOQUE))}
                >
                  Semana {s.semana}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--ok)]">✓ Todas las semanas están programadas.</p>
        )}
      </section>
    ),
  };

  return <Asistente pasos={[...pasos, resumen]} lectura={lectura} />;
}
