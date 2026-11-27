'use client';

import {
  campoCorte,
  CORTES,
  cumplimientoEjecucion,
  type Corte,
  LABORES_EJECUCION,
  type DatosEjecucion,
  type FilaEjecucion,
} from '@rae/shared';
import { aNumero, Campo } from './comun';

const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const nueva = (actividad: string): FilaEjecucion => ({
  actividad,
  tarea: '',
  meta: '',
  indicador: '',
  horas: null,
  corte1: null,
  corte2: null,
  corte3: null,
  evidencias: '',
  meses: [],
  observaciones: '',
});

function Fila({
  f,
  corte,
  lectura,
  onCambio,
  onQuitar,
}: {
  f: FilaEjecucion;
  corte: Corte;
  lectura?: boolean;
  onCambio: (f: FilaEjecucion) => void;
  onQuitar: () => void;
}) {
  const set = <K extends keyof FilaEjecucion>(k: K, v: FilaEjecucion[K]) =>
    onCambio({ ...f, [k]: v });
  const pct = (n: Corte) => {
    const k = campoCorte(n);
    // Cada corte se diligencia en su propio informe; los anteriores siguen editables.
    const bloqueado = n > corte;
    return (
      <label key={k} className="text-sm font-semibold">
        Cumplimiento corte {n} (%)
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          max={100}
          step="any"
          readOnly={lectura || bloqueado}
          title={bloqueado ? `Se diligencia en el informe del corte ${n}` : undefined}
          value={f[k] ?? ''}
          onChange={(e) => set(k, aNumero(e.target.value, 100))}
        />
      </label>
    );
  };
  return (
    <div className="grid items-end gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-6">
      <Campo
        etiqueta="Tareas y/o acciones para cumplir"
        className="sm:col-span-2 lg:col-span-3"
        largo
        max={2000}
        valor={f.tarea}
        lectura={lectura}
        onCambio={(v) => set('tarea', v)}
      />
      <Campo
        etiqueta="Meta"
        className="lg:col-span-3"
        largo
        max={1000}
        valor={f.meta}
        lectura={lectura}
        onCambio={(v) => set('meta', v)}
      />
      <Campo
        etiqueta="Indicador"
        className="sm:col-span-2 lg:col-span-2"
        max={1000}
        valor={f.indicador}
        lectura={lectura}
        onCambio={(v) => set('indicador', v)}
      />
      <label className="text-sm font-semibold">
        Horas
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          max={2000}
          step="any"
          readOnly={lectura}
          value={f.horas ?? ''}
          onChange={(e) => set('horas', aNumero(e.target.value, 2000))}
        />
      </label>
      {CORTES.map(pct)}
      <Campo
        etiqueta="Evidencias"
        className="sm:col-span-2 lg:col-span-3"
        max={1000}
        valor={f.evidencias}
        lectura={lectura}
        onCambio={(v) => set('evidencias', v)}
      />
      <Campo
        etiqueta="Observaciones"
        className="sm:col-span-2 lg:col-span-3"
        max={1000}
        valor={f.observaciones}
        lectura={lectura}
        onCambio={(v) => set('observaciones', v)}
      />
      <fieldset className="sm:col-span-2 lg:col-span-6">
        <legend className="text-sm font-semibold">Tiempo (meses de ejecución)</legend>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {MESES.map((m, i) => {
            const activo = f.meses.includes(i + 1);
            return (
              <button
                key={i}
                type="button"
                disabled={lectura}
                aria-pressed={activo}
                aria-label={`Mes ${i + 1}`}
                className={`btn min-w-9 px-2 ${activo ? 'btn-primary' : ''}`}
                onClick={() =>
                  set('meses', activo ? f.meses.filter((x) => x !== i + 1) : [...f.meses, i + 1])
                }
              >
                {i + 1}
                <span className="sr-only">{m}</span>
              </button>
            );
          })}
          {!lectura && (
            <button type="button" className="btn ml-auto" onClick={onQuitar}>
              Quitar tarea
            </button>
          )}
        </div>
      </fieldset>
    </div>
  );
}

/** Informe de ejecución de la agenda (F-DOC-004). Con `lectura` sirve para revisar. */
export function EditorEjecucion({
  d,
  onCambio,
  lectura,
  docente,
}: {
  d: DatosEjecucion;
  onCambio: (d: DatosEjecucion) => void;
  lectura?: boolean;
  docente: { nombre: string; periodo: string };
}) {
  const set = <K extends keyof DatosEjecucion>(k: K, v: DatosEjecucion[K]) =>
    onCambio({ ...d, [k]: v });
  const resumen = cumplimientoEjecucion(d, d.corte);
  const filas = (clave: string) =>
    d.filas.map((f, i) => ({ f, i })).filter((x) => x.f.actividad === clave);
  const cambiarFila = (i: number, f: FilaEjecucion) =>
    set(
      'filas',
      d.filas.map((x, k) => (k === i ? f : x)),
    );
  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2>Datos del informe</h2>
          <span className="chip">Corte {d.corte}</span>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-faint">Docente</dt>
            <dd className="font-semibold">{docente.nombre}</dd>
          </div>
          <div>
            <dt className="text-faint">Periodo</dt>
            <dd className="font-semibold">{docente.periodo}</dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Facultad"
            valor={d.facultad}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('facultad', v)}
          />
          <Campo
            etiqueta="Escalafón"
            valor={d.escalafon}
            max={100}
            lectura={lectura}
            onCambio={(v) => set('escalafon', v)}
          />
          <Campo
            etiqueta="Fecha de elaboración"
            tipo="date"
            valor={d.fechaElaboracion}
            max={10}
            lectura={lectura}
            onCambio={(v) => set('fechaElaboracion', v)}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3">Cumplimiento del corte {d.corte}</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-sm text-muted">Promedio general</p>
            <p className="font-serif text-2xl font-semibold tabular-nums">
              {resumen.total === null ? '—' : `${resumen.total} %`}
            </p>
            <p className="text-xs text-faint">{resumen.tareas} tareas</p>
          </div>
          {resumen.porLabor.map((l) => (
            <div key={l.clave} className="rounded-lg border border-line p-3">
              <p className="text-xs text-muted">{l.titulo}</p>
              <p className="text-xl font-semibold tabular-nums">
                {l.cumplimiento === null ? '—' : `${l.cumplimiento} %`}
              </p>
              <p className="text-xs text-faint">{l.tareas} tareas</p>
            </div>
          ))}
        </div>
      </section>

      {LABORES_EJECUCION.map((l) => (
        <section key={l.clave} className="card space-y-4">
          <h2>{l.titulo}</h2>
          {l.actividades.map((a) => {
            const lista = filas(a.clave);
            return (
              <div key={a.clave} className="space-y-2">
                <p className="text-sm font-semibold">{a.actividad}</p>
                {lista.length === 0 && (
                  <p className="text-sm text-faint">Sin tareas registradas.</p>
                )}
                {lista.map(({ f, i }) => (
                  <Fila
                    key={i}
                    f={f}
                    corte={d.corte}
                    lectura={lectura}
                    onCambio={(n) => cambiarFila(i, n)}
                    onQuitar={() =>
                      set(
                        'filas',
                        d.filas.filter((_, k) => k !== i),
                      )
                    }
                  />
                ))}
                {!lectura && (
                  <button
                    type="button"
                    className="btn"
                    disabled={d.filas.length >= 120}
                    onClick={() => set('filas', [...d.filas, nueva(a.clave)])}
                  >
                    Agregar tarea
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
