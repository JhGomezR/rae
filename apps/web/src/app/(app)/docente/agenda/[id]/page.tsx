'use client';

import { VINCULACIONES, type DatosAgenda, type Vinculacion } from '@rae/shared';
import { useParams } from 'next/navigation';
import { EditorAgenda } from '@/components/informes-docentes/EditorAgenda';
import { PaginaInforme } from '@/components/informes-docentes/PaginaInforme';

export default function PaginaAgenda() {
  const id = Number(useParams<{ id: string }>()?.id);
  return (
    <PaginaInforme<DatosAgenda>
      id={id}
      volver="/docente/agenda"
      editor={({ d, onCambio, lectura, informe }) => (
        <EditorAgenda
          d={d}
          onCambio={onCambio}
          lectura={lectura}
          docente={{
            nombre: informe.docente.nombreCompleto,
            documento: informe.docente.documento,
            vinculacion: VINCULACIONES[informe.docente.vinculacion as Vinculacion] ?? '—',
            periodo: `${informe.periodo.numero === 1 ? 'A' : 'B'} (${informe.periodo.codigo})`,
          }}
        />
      )}
    />
  );
}
