'use client';

import type { DatosCatedra } from '@rae/shared';
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

/** Formulario del informe de docencia de hora cátedra (F-DOC-047). Con `lectura` sirve para revisar. */
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
  const sesion = (i: number, cambio: Partial<DatosCatedra['sesiones'][number]>) =>
    set(
      'sesiones',
      d.sesiones.map((s, k) => (k === i ? { ...s, ...cambio } : s)),
    );
  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2>Datos del informe</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-faint">Docente</dt>
            <dd className="font-semibold">{docente.nombre}</dd>
          </div>
          <div>
            <dt className="text-faint">No. de identificación</dt>
            <dd className="font-semibold">{docente.documento}</dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            etiqueta="Programa"
            className="sm:col-span-2"
            valor={d.programa}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('programa', v)}
          />
          <Campo
            etiqueta="Unidad de formación"
            className="sm:col-span-2"
            valor={d.unidad}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('unidad', v)}
          />
          <Campo
            etiqueta="Semestre"
            valor={d.semestre}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('semestre', v)}
          />
          {numero('horasSemana', 'Horas semana', 60)}
          <Campo
            etiqueta="Jornada"
            valor={d.jornada}
            max={40}
            lectura={lectura}
            onCambio={(v) => set('jornada', v)}
          />
          <Campo
            etiqueta="Documento expedido en"
            valor={d.expedida}
            max={60}
            lectura={lectura}
            onCambio={(v) => set('expedida', v)}
          />
          <Campo
            etiqueta="Periodo: desde"
            tipo="date"
            valor={d.desde}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('desde', v)}
          />
          <Campo
            etiqueta="Periodo: hasta"
            tipo="date"
            valor={d.hasta}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('hasta', v)}
          />
          <Campo
            etiqueta="Fecha del informe"
            tipo="date"
            valor={d.fecha}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('fecha', v)}
          />
        </div>
      </section>

      <section className="card space-y-3">
        <h2>Avance del contenido programático</h2>
        {d.sesiones.length === 0 && (
          <p className="text-sm text-muted">Agrega las sesiones del periodo.</p>
        )}
        {d.sesiones.map((s, i) => (
          <fieldset
            key={i}
            className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[6rem_12rem_1fr_auto]"
          >
            <label className="text-sm font-semibold">
              Sesión
              <input
                className="input mt-1 font-normal"
                type="number"
                min={1}
                max={99}
                readOnly={lectura}
                value={s.numero ?? ''}
                onChange={(e) => sesion(i, { numero: aNumero(e.target.value, 99) })}
              />
            </label>
            <Campo
              etiqueta="Fecha"
              tipo="date"
              valor={s.fecha}
              max={40}
              lectura={lectura}
              onCambio={(v) => sesion(i, { fecha: v })}
            />
            <Campo
              etiqueta="Tema o actividad"
              largo
              max={1000}
              valor={s.tema}
              lectura={lectura}
              onCambio={(v) => sesion(i, { tema: v })}
            />
            {!lectura && (
              <button
                type="button"
                className="btn self-end"
                onClick={() =>
                  set(
                    'sesiones',
                    d.sesiones.filter((_, k) => k !== i),
                  )
                }
              >
                Quitar
              </button>
            )}
          </fieldset>
        ))}
        {!lectura && (
          <button
            type="button"
            className="btn"
            disabled={d.sesiones.length >= 40}
            onClick={() =>
              set('sesiones', [
                ...d.sesiones,
                { numero: (d.sesiones.at(-1)?.numero ?? 0) + 1, fecha: '', tema: '' },
              ])
            }
          >
            Agregar sesión
          </button>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {numero('avancePeriodo', 'Porcentaje del periodo (%)', 100)}
          {numero('avanceAcumulado', 'Porcentaje acumulado (%)', 100)}
        </div>
      </section>

      <section className="card space-y-3">
        <h2>Asistencia del docente</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {numero('horasOrientadas', 'Horas orientadas', 500)}
          {numero('horasAusencias', 'Horas de ausencia', 500)}
          {numero('horasReposicion', 'Horas de reposición de clase', 500)}
          {numero('asistenciaPeriodo', 'Porcentaje del periodo (%)', 100)}
          {numero('asistenciaAcumulada', 'Porcentaje acumulado (%)', 100)}
        </div>
      </section>

      <section className="card grid gap-3 lg:grid-cols-3">
        <Campo
          etiqueta="Asistencia de estudiantes"
          largo
          max={3000}
          valor={d.asistenciaEstudiantes}
          lectura={lectura}
          onCambio={(v) => set('asistenciaEstudiantes', v)}
        />
        <Campo
          etiqueta="Reporte de notas"
          largo
          max={3000}
          valor={d.reporteNotas}
          lectura={lectura}
          onCambio={(v) => set('reporteNotas', v)}
        />
        <Campo
          etiqueta="Anexos"
          largo
          max={1000}
          valor={d.anexos}
          lectura={lectura}
          onCambio={(v) => set('anexos', v)}
        />
      </section>
    </div>
  );
}
