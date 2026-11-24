'use client';

import { NIVELES } from '@rae/shared';
import Link from 'next/link';
import { useState } from 'react';
import { BarraApilada, BarrasPct, Dona } from '@/components/graficos';
import { ChipNivel, Encabezado, Estado, Kpi, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Avance {
  esperadas: number;
  enviadas: number;
  borrador: number;
  pendientes: number;
  pct: number;
}
interface Personas {
  total: number;
  completaron: number;
  parcial: number;
  ninguna: number;
}
interface PorGrupo<K> {
  clave: K;
  estudiantes: number;
  docentes: number;
}
interface DatosMomento {
  estudiantes: Avance;
  docentes: Avance;
  personasEstudiantes: Personas;
  personasDocentes: Personas;
  porSemestre: PorGrupo<number>[];
  porSede: PorGrupo<string>[];
  menorParticipacion: (Avance & { unidad: string })[];
  nivelesEstudiantes: number[];
  nivelesDocentes: number[];
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
  semestres?: { semestre: number; apreciacion: number | null; alcance: number | null }[];
  brechas?: { id: number; nombre: string; brecha: number }[];
  estadisticas: {
    ingreso: Record<'estudiantes' | 'docentes', { ingresaron: number; pendientes: number }>;
    momentos: Record<'APRECIACION' | 'ALCANCE', DatosMomento>;
  } | null;
}

const C = { enviada: 'var(--serie1)', borrador: 'var(--serie2)', pendiente: 'var(--pendiente)' };
const COLOR_NIVEL = ['var(--lv1)', 'var(--lv2)', 'var(--lv3)', 'var(--lv4)'];

const avance = (a: Avance) => [
  { etiqueta: 'Enviadas', valor: a.enviadas, color: C.enviada },
  { etiqueta: 'En borrador', valor: a.borrador, color: C.borrador },
  { etiqueta: 'Pendientes', valor: a.pendientes, color: C.pendiente },
];
const personas = (p: Personas) => [
  { etiqueta: 'Completaron todo', valor: p.completaron, color: C.enviada },
  { etiqueta: 'Van a medias', valor: p.parcial, color: C.borrador },
  { etiqueta: 'Sin empezar', valor: p.ninguna, color: C.pendiente },
];
const niveles = (conteo: number[]) => {
  const total = conteo.reduce((s, n) => s + n, 0);
  return NIVELES.map((n, i) => ({
    etiqueta: n.nombre,
    valores: [total ? Number((((conteo[i] ?? 0) / total) * 100).toFixed(1)) : 0],
    nota: `${conteo[i] ?? 0} respuestas`,
  }));
};

function Momentos({
  d,
  onCambio,
}: {
  d: NonNullable<Panel['periodo']>;
  onCambio: () => Promise<void>;
}) {
  const alternar = async (campo: 'apreciacionAbierta' | 'alcanceAbierto') => {
    await api(`/periodos/${d.id}`, 'PATCH', { [campo]: !d[campo] });
    await onCambio();
  };
  return (
    <section className="card flex flex-wrap items-center gap-3">
      <h2 className="mr-auto">Momentos</h2>
      {(['apreciacionAbierta', 'alcanceAbierto'] as const).map((k) => (
        <button
          key={k}
          className={`btn ${d[k] ? 'btn-primary' : ''}`}
          aria-pressed={d[k]}
          onClick={() => void alternar(k)}
        >
          {k === 'apreciacionAbierta' ? 'Apreciación' : 'Alcance'}: {d[k] ? 'abierto' : 'cerrado'}
        </button>
      ))}
    </section>
  );
}

function Graficas({
  e,
  ingreso,
}: {
  e: DatosMomento;
  ingreso: NonNullable<Panel['estadisticas']>['ingreso'];
}) {
  const pctNota = (a: Avance) => `${a.pct} % de ${a.esperadas} encuestas esperadas`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Dona
          titulo="Encuestas de estudiantes"
          segmentos={avance(e.estudiantes)}
          centro={`${Math.round(e.estudiantes.pct)}%`}
          nota={pctNota(e.estudiantes)}
        />
        <Dona
          titulo="Encuestas de docentes"
          segmentos={avance(e.docentes)}
          centro={`${Math.round(e.docentes.pct)}%`}
          nota={pctNota(e.docentes)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarraApilada
          titulo={`Estudiantes (${e.personasEstudiantes.total})`}
          segmentos={personas(e.personasEstudiantes)}
          nota="Cada estudiante responde una encuesta por unidad que cursa."
        />
        <BarraApilada
          titulo={`Docentes (${e.personasDocentes.total})`}
          segmentos={personas(e.personasDocentes)}
          nota="Cada docente responde una encuesta por curso asignado."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarrasPct
          titulo="Participación por semestre"
          series={['Estudiantes', 'Docentes']}
          colores={[C.enviada, C.borrador]}
          filas={e.porSemestre.map((s) => ({
            etiqueta: `Semestre ${s.clave}`,
            valores: [s.estudiantes, s.docentes],
          }))}
        />
        <BarrasPct
          titulo="Participación por sede"
          series={['Estudiantes', 'Docentes']}
          colores={[C.enviada, C.borrador]}
          filas={e.porSede.map((s) => ({
            etiqueta: s.clave,
            valores: [s.estudiantes, s.docentes],
          }))}
        />
      </div>
      <BarrasPct
        titulo="Unidades con menor participación de estudiantes"
        series={['Enviadas']}
        colores={[C.enviada]}
        filas={e.menorParticipacion.map((u) => ({
          etiqueta: u.unidad,
          valores: [u.pct],
          nota: `${u.enviadas} de ${u.esperadas} · faltan ${u.esperadas - u.enviadas}`,
        }))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {(['nivelesEstudiantes', 'nivelesDocentes'] as const).map((k) => (
          <figure key={k} className="card space-y-3">
            <figcaption className="font-semibold">
              Niveles reportados por {k === 'nivelesEstudiantes' ? 'estudiantes' : 'docentes'}
            </figcaption>
            {e[k].every((n) => n === 0) ? (
              <SinDatos />
            ) : (
              niveles(e[k]).map((f, i) => (
                <div
                  key={f.etiqueta}
                  className="grid grid-cols-[72px_1fr_58px] items-center gap-2 text-sm"
                  title={`${f.etiqueta}: ${f.nota}`}
                >
                  <span>{f.etiqueta}</span>
                  <div className="h-3 rounded-r bg-surface-2">
                    <div
                      className="h-3 rounded-r"
                      style={{ width: `${f.valores[0]}%`, background: COLOR_NIVEL[i] }}
                    />
                  </div>
                  <span className="text-right tabular-nums text-muted">{f.valores[0]} %</span>
                </div>
              ))
            )}
          </figure>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['estudiantes', 'docentes'] as const).map((k) => (
          <Dona
            key={k}
            titulo={`Ingreso a la plataforma: ${k}`}
            segmentos={[
              { etiqueta: 'Ya ingresaron', valor: ingreso[k].ingresaron, color: C.enviada },
              { etiqueta: 'Aún no ingresan', valor: ingreso[k].pendientes, color: C.pendiente },
            ]}
            nota="Quien ya cambió su contraseña inicial."
          />
        ))}
      </div>
    </div>
  );
}

export default function PanelPage() {
  const { datos: d, error, cargando, recargar } = useDatos<Panel>('/resultados/panel');
  const [momento, setMomento] = useState<'APRECIACION' | 'ALCANCE' | null>(null);
  const activo =
    momento ??
    (d?.periodo?.alcanceAbierto && !d.periodo.apreciacionAbierta ? 'ALCANCE' : 'APRECIACION');
  const e = d?.estadisticas?.momentos[activo];

  return (
    <>
      <Encabezado titulo="Panel" texto={d?.periodo ? `Periodo ${d.periodo.codigo}` : undefined} />
      <Estado cargando={cargando && !d} error={error}>
        {!d?.periodo || !e || !d.estadisticas ? (
          <div className="card space-y-3">
            <SinDatos />
            <Link className="btn btn-primary" href="/admin/importar">
              Importar consolidado
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi titulo="Cursos activos" valor={String(d.cursos)} />
              <Kpi titulo="Inscripciones" valor={String(d.inscripciones)} />
              <Kpi
                titulo="Estudiantes que faltan"
                valor={String(e.personasEstudiantes.total - e.personasEstudiantes.completaron)}
                nota={`de ${e.personasEstudiantes.total} estudiantes`}
              />
              <Kpi
                titulo="Docentes que faltan"
                valor={String(e.personasDocentes.total - e.personasDocentes.completaron)}
                nota={`de ${e.personasDocentes.total} docentes`}
              />
            </div>
            <Momentos d={d.periodo} onCambio={recargar} />
            <div role="tablist" aria-label="Momento" className="flex gap-2">
              {(['APRECIACION', 'ALCANCE'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={activo === m}
                  className={`btn ${activo === m ? 'btn-primary' : ''}`}
                  onClick={() => setMomento(m)}
                >
                  {m === 'APRECIACION' ? 'Apreciación' : 'Alcance'}
                </button>
              ))}
            </div>
            <Graficas e={e} ingreso={d.estadisticas.ingreso} />
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
