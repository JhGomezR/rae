'use client';

import { Encabezado, Estado } from '@/components/ui';
import { useDatos } from '@/lib/api';
import { PanelDesempeno } from '../PanelDesempeno';
import { Descargas, SelectorPoa, usePoaSeleccionado } from '../SelectorPoa';
import type { DetallePoa } from '../tipos';

export default function PaginaDesempenoPoa() {
  const sel = usePoaSeleccionado();
  const { datos, error, cargando } = useDatos<DetallePoa>(
    sel.id ? `/poa/${sel.id}${sel.mes ? `?mes=${sel.mes}` : ''}` : null,
  );
  return (
    <>
      <Encabezado
        titulo="Desempeño del POA"
        texto="Avance real frente al programado, por estado, mes, eje del plan de gobierno, tipo de indicador, responsable y actividad."
      >
        {datos && <Descargas compacto id={datos.id} vigencia={datos.vigencia} mes={sel.mes} />}
      </Encabezado>
      <Estado cargando={sel.lista.cargando && !sel.lista.datos} error={sel.lista.error}>
        <SelectorPoa {...sel} />
        {sel.id && (
          <Estado cargando={cargando && !datos} error={error}>
            {datos && <PanelDesempeno d={datos.desempeno} vigencia={datos.vigencia} />}
          </Estado>
        )}
      </Estado>
    </>
  );
}
