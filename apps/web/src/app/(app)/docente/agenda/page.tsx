'use client';

import { ListaInformes } from '@/components/informes-docentes/ListaInformes';

export default function PaginaAgendas() {
  return (
    <ListaInformes
      tipo="AGENDA"
      base="/docente/agenda"
      titulo="Agenda docente"
      texto="Agenda semanal docente (formato F-DOC-056) para profesores de planta, ocasionales y provisionales. Diligénciala por periodo y márcala como entregada para su revisión."
    />
  );
}
