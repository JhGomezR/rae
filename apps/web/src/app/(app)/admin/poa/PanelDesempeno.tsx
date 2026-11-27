'use client';

import { BarrasPct, Dona } from '@/components/graficos';
import { Kpi } from '@/components/ui';
import {
  CHIP_ESTADO,
  ESTADOS,
  MESES_LARGOS,
  pctPoa,
  pesos,
  SEMAFOROS,
  type Desempeno,
  type EstadoActividad,
  type Grupo,
} from './tipos';

const SERIES = ['Avance real', 'Avance esperado'];
const COLORES = ['var(--serie1)', 'var(--serie2)'];
const corto = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const grupos = (g: Grupo[]) =>
  g.map((x) => ({
    etiqueta: corto(x.clave),
    valores: [x.avance, x.esperado],
    nota: `${x.actividades} actividad${x.actividades === 1 ? '' : 'es'}`,
  }));

/** KPIs y gráficas del desempeño del POA al mes de corte. */
export function PanelDesempeno({ d, vigencia }: { d: Desempeno; vigencia: number }) {
  const s = SEMAFOROS[d.semaforo];
  const estados = Object.keys(ESTADOS) as EstadoActividad[];
  const corte = d.mesCorte ? `${MESES_LARGOS[d.mesCorte - 1]} de ${vigencia}` : 'antes de iniciar';
  const atrasadas = d.porActividad.filter((a) => a.estado === 'ATRASADA');
  if (!d.actividades) {
    return <p className="card text-muted">No existen datos para esta sección.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Corte: <strong>{corte}</strong>. El avance esperado sale de los meses programados en cada
        actividad; el real, del último seguimiento registrado.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Avance real promedio"
          valor={pctPoa(d.avance)}
          nota={`${d.actividades} actividades`}
        />
        <Kpi titulo="Avance esperado" valor={pctPoa(d.esperado)} nota="Según la programación" />
        <div className="card">
          <p className="text-sm text-muted">Índice de desempeño</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">{pctPoa(d.indice)}</p>
          <span className={`${s.clase} mt-2`}>
            {s.nombre} · {s.rango}
          </span>
        </div>
        <Kpi
          titulo="Presupuesto ejecutado"
          valor={pesos(d.ejecutado)}
          nota={`de ${pesos(d.presupuesto)} programado`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Dona
          titulo="Estado de las actividades"
          centro={`${d.estados.CUMPLIDA}/${d.actividades}`}
          nota="Cumplidas sobre el total"
          segmentos={estados.map((k) => ({
            etiqueta: ESTADOS[k].nombre,
            valor: d.estados[k],
            color: ESTADOS[k].color,
          }))}
        />
        <BarrasPct
          titulo="Curva de avance acumulado por mes"
          series={SERIES}
          colores={COLORES}
          filas={d.porMes.map((m) => ({
            etiqueta: MESES_LARGOS[m.mes - 1] ?? '',
            valores: [m.avance ?? 0, m.esperado],
            nota: `${m.programadas} programada${m.programadas === 1 ? '' : 's'}${m.avance === null ? ' · sin corte' : ''}`,
          }))}
        />
        <BarrasPct
          titulo="Avance por eje del plan de gobierno"
          series={SERIES}
          colores={COLORES}
          filas={grupos(d.porPilar)}
        />
        <BarrasPct
          titulo="Avance por tipo de indicador"
          series={SERIES}
          colores={COLORES}
          filas={grupos(d.porTipo)}
        />
        <BarrasPct
          titulo="Avance por responsable"
          series={SERIES}
          colores={COLORES}
          filas={grupos(d.porResponsable)}
        />
        <BarrasPct
          titulo="Avance por actividad"
          series={SERIES}
          colores={COLORES}
          filas={d.porActividad.map((a) => ({
            etiqueta: `${a.numero}. ${corto(a.actividad, 60)}`,
            valores: [a.avance, a.esperado],
            nota: ESTADOS[a.estado].nombre,
          }))}
        />
      </div>
      <section className="card">
        <h2 className="mb-3">Actividades que requieren atención</h2>
        {!atrasadas.length ? (
          <p className="text-muted">Ninguna actividad está atrasada frente a su programación.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Actividad</th>
                  <th>Real</th>
                  <th>Esperado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {atrasadas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.numero}</td>
                    <td className="min-w-72">{a.actividad}</td>
                    <td className="tabular-nums">{pctPoa(a.avance)}</td>
                    <td className="tabular-nums">{pctPoa(a.esperado)}</td>
                    <td>
                      <span className={CHIP_ESTADO[a.estado]}>{ESTADOS[a.estado].nombre}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
