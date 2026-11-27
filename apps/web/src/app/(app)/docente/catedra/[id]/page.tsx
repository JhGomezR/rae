'use client';

import type { DatosCatedra } from '@rae/shared';
import { useParams } from 'next/navigation';
import { EditorCatedra } from '@/components/informes-docentes/EditorCatedra';
import { PaginaInforme } from '@/components/informes-docentes/PaginaInforme';

export default function PaginaInformeCatedra() {
  const id = Number(useParams<{ id: string }>()?.id);
  return (
    <PaginaInforme<DatosCatedra>
      id={id}
      volver="/docente/catedra"
      editor={({ d, onCambio, lectura, informe }) => (
        <EditorCatedra
          d={d}
          onCambio={onCambio}
          lectura={lectura}
          docente={{ nombre: informe.docente.nombreCompleto, documento: informe.docente.documento }}
        />
      )}
    />
  );
}
