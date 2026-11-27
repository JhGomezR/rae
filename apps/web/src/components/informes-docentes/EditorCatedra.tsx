'use client';

import type { DatosCatedra } from '@rae/shared';
import { Asistente, type Paso } from './Asistente';
import { cursoCompleto, PasoCurso } from './catedra/PasoCurso';
import { PasoSesiones } from './catedra/PasoSesiones';
import { aNumero, Campo } from './comun';

type Numerico =
  | 'horasSemana'
  | 'avancePeriodo'
  | 'avanceAcumulado'
  | 'horasOrientadas'
  | 'horasAusencias'
  | 'horasReposicion'
  | 'asistenciaPeriodo'
  | 'asistenciaAcumulada';

const lleno = (v: unknown) => v !== null && v !== undefined && v !== '';

/**
 * Informe de docencia de hora cátedra (F-DOC-047) como asistente por pasos: curso y periodo,
 * contenido programático, asistencia, estudiantes y notas, y un resumen de lo que falta.
 * Con `lectura` sirve para revisar (todo a la vista).
 */
export function EditorCatedra({
  d,
  onCambio,
  lectura,
  docente,
}: {
  d: DatosCatedra;
  onCambio: (d: DatosCatedra) => void;
  lectura?: boolean;
  docente: { nombre: string; documento: string };
}) {
  const set = <K extends keyof DatosCatedra>(k: K, v: DatosCatedra[K]) =>
    onCambio({ ...d, [k]: v });
  const numero = (k: Numerico, etiqueta: string, max: number) => (
    <label className="text-sm font-semibold">
      {etiqueta}
      <input
        className="input mt-1 font-normal"
        type="number"
        min={0}
        max={max}
        readOnly={lectura}
        value={d[k] ?? ''}
        onChange={(e) => set(k, aNumero(e.target.value, max))}
      />
    </label>
  );
  const texto = (
    k: 'asistenciaEstudiantes' | 'reporteNotas' | 'anexos',
    etiqueta: string,
    max: number,
  ) => (
    <Campo
      etiqueta={etiqueta}
      largo
      max={max}
      valor={d[k]}
      lectura={lectura}
      onCambio={(v) => set(k, v)}
    />
  );

  const sesionesListas = d.sesiones.length > 0 && d.sesiones.every((s) => s.tema.trim());
  const asistenciaLista = (
    ['horasOrientadas', 'asistenciaPeriodo', 'asistenciaAcumulada'] as const
  ).every((k) => lleno(d[k]));
  const estudiantesListo = !!(d.asistenciaEstudiantes.trim() && d.reporteNotas.trim());

  const pasos: Paso[] = [
    {
      id: 'curso',
      titulo: 'Curso y periodo',
      detalle: d.unidad ? d.unidad.slice(0, 18) : undefined,
      estado:
        d.desde && d.hasta && d.hasta < d.desde
          ? 'alerta'
          : cursoCompleto(d)
            ? 'listo'
            : 'pendiente',
      contenido: (
        <PasoCurso
          d={d}
          docente={docente}
          lectura={lectura}
          set={set}
          horas={numero('horasSemana', 'Horas semana', 60)}
        />
      ),
    },
    {
      id: 'sesiones',
      titulo: 'Contenido programático',
      detalle: `${d.sesiones.length} sesiones`,
      estado:
        sesionesListas && lleno(d.avancePeriodo)
          ? 'listo'
          : d.sesiones.length
            ? 'alerta'
            : 'pendiente',
      contenido: <PasoSesiones d={d} lectura={lectura} set={set} numero={numero} />,
    },
    {
      id: 'asistencia',
      titulo: 'Asistencia del docente',
      detalle: lleno(d.asistenciaPeriodo) ? `${d.asistenciaPeriodo}%` : undefined,
      estado: asistenciaLista ? 'listo' : 'pendiente',
      contenido: (
        <section className="card space-y-4">
          <h2>Asistencia del docente</h2>
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold text-muted">Horas del periodo</legend>
            {numero('horasOrientadas', 'Horas orientadas', 500)}
            {numero('horasAusencias', 'Horas de ausencia', 500)}
            {numero('horasReposicion', 'Horas de reposición de clase', 500)}
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-muted">
              Porcentaje de asistencia
            </legend>
            {numero('asistenciaPeriodo', 'Porcentaje del periodo (%)', 100)}
            {numero('asistenciaAcumulada', 'Porcentaje acumulado (%)', 100)}
          </fieldset>
        </section>
      ),
    },
    {
      id: 'estudiantes',
      titulo: 'Estudiantes y notas',
      estado: estudiantesListo ? 'listo' : 'pendiente',
      contenido: (
        <section className="card space-y-3">
          <h2>Estudiantes, notas y anexos</h2>
          {texto('asistenciaEstudiantes', 'Asistencia de estudiantes', 3000)}
          {texto('reporteNotas', 'Reporte de notas', 3000)}
          {texto('anexos', 'Anexos', 1000)}
        </section>
      ),
    },
  ];

  const resumen: Paso = {
    id: 'resumen',
    titulo: 'Resumen',
    estado: pasos.every((p) => p.estado === 'listo') ? 'listo' : 'pendiente',
    contenido: (irA) => (
      <section className="card space-y-3">
        <h2>Resumen del informe</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Unidad de formación', d.unidad || '—'],
            ['Periodo', d.desde && d.hasta ? `${d.desde} a ${d.hasta}` : '—'],
            ['Avance del periodo', lleno(d.avancePeriodo) ? `${d.avancePeriodo}%` : '—'],
            [
              'Asistencia del periodo',
              lleno(d.asistenciaPeriodo) ? `${d.asistenciaPeriodo}%` : '—',
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface-2 p-3">
              <dt className="text-faint">{k}</dt>
              <dd className="font-serif text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-1.5 text-sm">
          {pasos.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2">
              <span className={p.estado === 'listo' ? 'text-[var(--ok)]' : 'text-[var(--warn)]'}>
                {p.estado === 'listo' ? '✓' : '○'}
              </span>
              <span className="font-semibold">{p.titulo}</span>
              <span className="text-muted">
                {p.estado === 'listo'
                  ? 'completo'
                  : p.estado === 'alerta'
                    ? 'revisa los datos'
                    : 'faltan datos'}
              </span>
              {p.estado !== 'listo' && (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline"
                  onClick={() => irA(i)}
                >
                  {lectura ? 'Ver' : 'Completar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    ),
  };

  return <Asistente pasos={[...pasos, resumen]} lectura={lectura} />;
}
