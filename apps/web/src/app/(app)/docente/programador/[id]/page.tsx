'use client';

import type { DatosProgramador } from '@rae/shared';
import { useParams } from 'next/navigation';
import { EditorProgramador } from '@/components/informes-docentes/EditorProgramador';
import { PaginaInforme } from '@/components/informes-docentes/PaginaInforme';

export default function PaginaInformeProgramador() {
  const id = Number(useParams<{ id: string }>()?.id);
  return (
    <PaginaInforme<DatosProgramador>
      id={id}
      volver="/docente/programador"
      editor={({ d, onCambio, lectura, informe }) => (
        <EditorProgramador
          d={d}
          onCambio={onCambio}
          lectura={lectura}
          docente={{ nombre: informe.docente.nombreCompleto, periodo: informe.periodo.codigo }}
        />
      )}
    />
  );
}
