'use client';

import Link from 'next/link';
import { ChipNivel, Encabezado, Estado, Kpi, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Participacion {
  enviadas: number;
  esperadas: number;
  pct: number;
}
interface Panel {
  periodo: {
    id: number;
    codigo: string;
    apreciacionAbierta: boolean;
    alcanceAbierto: boolean;
  } | null;
  cursos?: number;
  inscripciones?: number;
  apreciacion?: Participacion;
  alcance?: Participacion;
  semestres?: { semestre: number; apreciacion: number | null; alcance: number | null }[];
  brechas?: { id: number; nombre: string; brecha: number }[];
}

export default function PanelPage() {
  const { datos: d, error, cargando, recargar } = useDatos<Panel>('/resultados/panel');

  const alternar = async (campo: 'apreciacionAbierta' | 'alcanceAbierto') => {
    if (!d?.periodo) return;
    await api(`/periodos/${d.periodo.id}`, 'PATCH', { [campo]: !d.periodo[campo] });
    await recargar();
  };

  return (
    <>
      <Encabezado titulo="Panel" texto={d?.periodo ? `Periodo ${d.periodo.codigo}` : undefined} />
      <Estado cargando={cargando && !d} error={error}>
        {!d?.periodo ? (
          <div className="card space-y-3">
            <SinDatos />
            <Link className="btn btn-primary" href="/admin/importar">
              Importar consolidado
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi titulo="Cursos" valor={String(d.cursos)} />
              <Kpi titulo="Inscripciones" valor={String(d.inscripciones)} />
              <Kpi
                titulo="Participación apreciación"
                valor={`${d.apreciacion?.pct} %`}
                nota={`${d.apreciacion?.enviadas} de ${d.apreciacion?.esperadas}`}
              />
              <Kpi
                titulo="Participación alcance"
                valor={`${d.alcance?.pct} %`}
                nota={`${d.alcance?.enviadas} de ${d.alcance?.esperadas}`}
              />
            </div>
            <section className="card flex flex-wrap items-center gap-3">
              <h2 className="mr-auto">Momentos</h2>
              <button
                className={`btn ${d.periodo.apreciacionAbierta ? 'btn-primary' : ''}`}
                aria-pressed={d.periodo.apreciacionAbierta}
                onClick={() => void alternar('apreciacionAbierta')}
              >
                Apreciación: {d.periodo.apreciacionAbierta ? 'abierta' : 'cerrada'}
              </button>
              <button
                className={`btn ${d.periodo.alcanceAbierto ? 'btn-primary' : ''}`}
                aria-pressed={d.periodo.alcanceAbierto}
                onClick={() => void alternar('alcanceAbierto')}
              >
                Alcance: {d.periodo.alcanceAbierto ? 'abierto' : 'cerrado'}
              </button>
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <section>
                <h2 className="mb-3">Nivel por semestre</h2>
                <div className="tabla-wrap">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Semestre</th>
                        <th>Apreciación</th>
                        <th>Alcance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.semestres?.map((s) => (
                        <tr key={s.semestre}>
                          <td>{s.semestre}</td>
                          <td>
                            <ChipNivel valor={s.apreciacion} />
                          </td>
                          <td>
                            <ChipNivel valor={s.alcance} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section>
                <h2 className="mb-3">Mayores brechas</h2>
                <div className="card">
                  {d.brechas?.length ? (
                    <ul className="space-y-2">
                      {d.brechas.map((b) => (
                        <li key={b.id} className="flex justify-between gap-3">
                          <span>{b.nombre}</span>
                          <strong className="tabular-nums">
                            {b.brecha > 0 ? '+' : ''}
                            {b.brecha}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <SinDatos />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </Estado>
    </>
  );
}
