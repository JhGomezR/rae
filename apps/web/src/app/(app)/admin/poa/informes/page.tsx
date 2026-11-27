'use client';

import { Encabezado, Estado } from '@/components/ui';
import { Descargas, SelectorPoa, usePoaSeleccionado } from '../SelectorPoa';

export default function PaginaInformesPoa() {
  const sel = usePoaSeleccionado();
  const poa = sel.lista.datos?.find((p) => p.id === sel.id);
  return (
    <>
      <Encabezado
        titulo="Informes del POA"
        texto="Descarga el POA en el formato institucional F-PIN-001 (Excel) y el informe de seguimiento y desempeño con gráficos estadísticos en Word o PDF, al corte que elijas."
      />
      <Estado cargando={sel.lista.cargando && !sel.lista.datos} error={sel.lista.error}>
        <SelectorPoa {...sel} />
        {poa && <Descargas id={poa.id} vigencia={poa.vigencia} mes={sel.mes} />}
      </Estado>
    </>
  );
}
