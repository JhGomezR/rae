'use client';

import type { EstadoInformeDocente } from '@rae/shared';
import Link from 'next/link';
import { ChipEstado } from '../comun';

interface Curso {
  id: number;
  grupo: string;
  semestreOferta: number;
  unidad: { nombre: string };
}
interface Informe {
  id: number;
  estado: EstadoInformeDocente;
  cursoId: number | null;
}

/** Cursos del periodo con su programador: cada curso necesita el suyo. */
export function CursosProgramador({
  cursos,
  informes,
  base,
  onCrear,
}: {
  cursos: Curso[];
  informes: Informe[];
  base: string;
  onCrear: (cursoId: number) => void;
}) {
  if (!cursos.length) return null;
  const de = (c: Curso) => informes.find((i) => i.cursoId === c.id);
  const entregados = cursos.filter((c) => {
    const i = de(c);
    return i && i.estado !== 'BORRADOR';
  }).length;
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>Tus cursos del periodo</h2>
        <span className={`chip text-sm ${entregados === cursos.length ? 'chip-nivel lv3' : ''}`}>
          {entregados} de {cursos.length} entregados
        </span>
      </div>
      <p className="text-sm text-muted">
        Cada curso que orientas necesita su programador de clases. Si ya programaste esa unidad en
        otro periodo, se copian sus semanas para que solo las ajustes.
      </p>
      <ul className="divide-y divide-[var(--line)]">
        {cursos.map((c) => {
          const i = de(c);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{c.unidad.nombre}</span>
                <span className="block text-xs text-faint">
                  Semestre {c.semestreOferta} · grupo {c.grupo}
                </span>
              </span>
              {i ? (
                <>
                  <ChipEstado estado={i.estado} />
                  <Link className="btn" href={`${base}/${i.id}`}>
                    {i.estado === 'BORRADOR' || i.estado === 'AJUSTES' ? 'Diligenciar' : 'Ver'}
                  </Link>
                </>
              ) : (
                <>
                  <span className="chip text-xs">Sin programador</span>
                  <button className="btn btn-primary" onClick={() => onCrear(c.id)}>
                    Crear programador
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
