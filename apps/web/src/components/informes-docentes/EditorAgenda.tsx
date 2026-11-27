'use client';

import {
  alertasAgenda,
  DEDICACIONES,
  ESCALAFONES,
  horasAgenda,
  SECCIONES_AGENDA,
  type DatosAgenda,
  type FilaAgenda,
  type SeccionAgenda,
} from '@rae/shared';
import { aNumero, Campo } from './comun';

const VACIA: FilaAgenda = {
  horas: null,
  fuente: '',
  descripcion: '',
  evidencias: '',
  observaciones: '',
};

function Seccion({
  s,
  d,
  lectura,
  onFila,
}: {
  s: SeccionAgenda;
  d: DatosAgenda;
  lectura?: boolean;
  onFila: (clave: string, f: FilaAgenda) => void;
}) {
  const { porSeccion } = horasAgenda(d);
  const subtotal = s.subtotal?.secciones.reduce((t, k) => t + (porSeccion[k] ?? 0), 0);
  return (
    <section className="card space-y-4">
      <div>
        <h2>{s.titulo}</h2>
        {s.texto && <p className="mt-1 text-sm text-muted">{s.texto}</p>}
      </div>
      {s.actividades.map((a) => {
        const f = d.actividades[a.clave] ?? {
          ...VACIA,
          fuente: a.fuente,
          evidencias: a.evidencias,
        };
        const cambiar = (k: keyof FilaAgenda, v: string | number | null) =>
          onFila(a.clave, { ...f, [k]: v });
        return (
          <fieldset key={a.clave} className="rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-semibold">{a.actividad}</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {s.conHoras && (
                <label className="text-sm font-semibold">
                  Horas semanales
                  <input
                    className="input mt-1 font-normal"
                    type="number"
                    min={0}
                    max={60}
                    step="0.5"
                    readOnly={lectura}
                    placeholder={a.horasTexto}
                    value={f.horas ?? ''}
                    onChange={(e) => cambiar('horas', aNumero(e.target.value, 60))}
                  />
                </label>
              )}
              <Campo
                etiqueta="Fuente / oficina de verificación"
                className={s.conHoras ? 'lg:col-span-3' : 'lg:col-span-4'}
                valor={f.fuente || a.fuente}
                lectura={lectura}
                onCambio={(v) => cambiar('fuente', v)}
              />
              <Campo
                etiqueta="Descripción de la actividad"
                className="sm:col-span-2"
                largo
                max={2000}
                valor={f.descripcion}
                lectura={lectura}
                onCambio={(v) => cambiar('descripcion', v)}
              />
              <Campo
                etiqueta="Evidencias y productos esperados"
                className="sm:col-span-2"
                largo
                max={1000}
                valor={f.evidencias || a.evidencias}
                lectura={lectura}
                onCambio={(v) => cambiar('evidencias', v)}
              />
              <Campo
                etiqueta="Observaciones"
                className="sm:col-span-2 lg:col-span-4"
                max={1000}
                valor={f.observaciones}
                lectura={lectura}
                onCambio={(v) => cambiar('observaciones', v)}
              />
            </div>
          </fieldset>
        );
      })}
      {s.nota && <p className="text-xs text-faint">{s.nota}</p>}
      {s.subtotal && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold">
          {s.subtotal.titulo}: {subtotal} horas
          {s.subtotal.maximo && (subtotal ?? 0) > s.subtotal.maximo ? ' · supera el máximo' : ''}
        </p>
      )}
    </section>
  );
}

/** Formulario de la agenda semanal docente (F-DOC-056). Con `lectura` sirve para revisar. */
export function EditorAgenda({
  d,
  onCambio,
  lectura,
  docente,
}: {
  d: DatosAgenda;
  onCambio: (d: DatosAgenda) => void;
  lectura?: boolean;
  docente: { nombre: string; documento: string; vinculacion: string; periodo: string };
}) {
  const set = <K extends keyof DatosAgenda>(k: K, v: DatosAgenda[K]) => onCambio({ ...d, [k]: v });
  const { total } = horasAgenda(d);
  const alertas = alertasAgenda(d);
  const radio = <T extends string>(
    nombre: string,
    opciones: Record<T, string>,
    valor: T | null,
    k: 'dedicacion' | 'escalafon',
  ) => (
    <fieldset className="text-sm">
      <legend className="font-semibold">{nombre}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(opciones) as T[]).map((o) => (
          <button
            key={o}
            type="button"
            disabled={lectura}
            aria-pressed={valor === o}
            className={`btn ${valor === o ? 'btn-primary' : ''}`}
            onClick={() => set(k, o as never)}
          >
            {valor === o ? '✓ ' : ''}
            {opciones[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <h2>1. Datos de identificación del profesor</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Nombres y apellidos', docente.nombre],
            ['Identificación', docente.documento],
            ['Tipo de vinculación', docente.vinculacion],
            ['Periodo académico', docente.periodo],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-faint">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            etiqueta="Fecha de diligenciamiento"
            valor={d.fechaDiligenciamiento}
            max={20}
            lectura={lectura}
            onCambio={(v) => set('fechaDiligenciamiento', v)}
          />
          <Campo
            etiqueta="Franja horaria"
            valor={d.franjaHoraria}
            max={60}
            lectura={lectura}
            onCambio={(v) => set('franjaHoraria', v)}
          />
          <Campo
            etiqueta="Facultad adscrita"
            valor={d.facultad}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('facultad', v)}
          />
          <Campo
            etiqueta="Programa adscrito"
            valor={d.programa}
            max={200}
            lectura={lectura}
            onCambio={(v) => set('programa', v)}
          />
        </div>
        {radio('Tipo de dedicación', DEDICACIONES, d.dedicacion, 'dedicacion')}
        {radio('Escalafón profesoral', ESCALAFONES, d.escalafon, 'escalafon')}
      </section>
      {SECCIONES_AGENDA.map((s) => (
        <Seccion
          key={s.clave}
          s={s}
          d={d}
          lectura={lectura}
          onFila={(clave, f) => set('actividades', { ...d.actividades, [clave]: f })}
        />
      ))}
      <section className="card space-y-3">
        <p className="font-serif text-xl font-semibold">
          Total de horas semanales: {total}
          <span className="ml-2 text-sm font-normal text-muted">(máximo 40 TC · 20 MT)</span>
        </p>
        {alertas.length > 0 && (
          <ul className="space-y-1 text-sm text-[var(--lv2)]">
            {alertas.map((a) => (
              <li key={a}>⚠ {a}</li>
            ))}
          </ul>
        )}
        <Campo
          etiqueta="Observaciones del profesor (planeación y desarrollo)"
          largo
          max={3000}
          valor={d.observacionesPlaneacion}
          lectura={lectura}
          onCambio={(v) => set('observacionesPlaneacion', v)}
        />
        <Campo
          etiqueta="Observaciones del profesor (evaluación académica)"
          largo
          max={3000}
          valor={d.observacionesEvaluacion}
          lectura={lectura}
          onCambio={(v) => set('observacionesEvaluacion', v)}
        />
      </section>
    </div>
  );
}
