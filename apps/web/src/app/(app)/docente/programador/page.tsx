'use client';

import { ListaInformes } from '@/components/informes-docentes/ListaInformes';

export default function PaginaProgramador() {
  return (
    <ListaInformes
      tipo="PROGRAMADOR"
      base="/docente/programador"
      titulo="Programador de clases"
      texto="Formato F-DOC-052. Todos los docentes lo diligencian para cada curso del periodo académico: semana a semana, contenidos, didácticas, evidencias y recursos. Márcalo como entregado para su revisión."
    />
  );
}
