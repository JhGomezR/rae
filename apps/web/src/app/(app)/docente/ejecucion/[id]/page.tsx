'use client';

import type { DatosEjecucion } from '@rae/shared';
import { useParams } from 'next/navigation';
import { EditorEjecucion } from '@/components/informes-docentes/EditorEjecucion';
import { PaginaInforme } from '@/components/informes-docentes/PaginaInforme';

export default function PaginaEjecucion() {
  const id = Number(useParams<{ id: string }>()?.id);
  return (
    <PaginaInforme<DatosEjecucion>
      id={id}
      volver="/docente/ejecucion"
      editor={({ d, onCambio, lectura, informe }) => (
        <EditorEjecucion
          d={d}
          onCambio={onCambio}
          lectura={lectura}
          docente={{ nombre: informe.docente.nombreCompleto, periodo: informe.periodo.codigo }}
        />
      )}
    />
  );
}
