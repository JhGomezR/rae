'use client';

import { ListaInformes } from '@/components/informes-docentes/ListaInformes';

export default function PaginaEjecuciones() {
  return (
    <ListaInformes
      tipo="EJECUCION"
      base="/docente/ejecucion"
      titulo="Ejecución de la agenda"
      texto="Informe de ejecución de la agenda semanal docente (formato F-DOC-004): seguimiento de tus actividades, metas e indicadores al cierre de cada corte. El corte 1 parte de tu agenda y el corte 2 continúa el corte 1."
    />
  );
}
