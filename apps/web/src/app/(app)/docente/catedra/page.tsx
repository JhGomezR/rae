'use client';

import { ListaInformes } from '@/components/informes-docentes/ListaInformes';

export default function PaginaCatedra() {
  return (
    <ListaInformes
      tipo="CATEDRA"
      base="/docente/catedra"
      titulo="Informes de hora cátedra"
      texto="Informe de docencia (formato F-DOC-047) por unidad de formación y periodo de pago. Diligéncialo y márcalo como entregado para su revisión."
    />
  );
}
