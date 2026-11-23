'use client';

import { useState } from 'react';
import { Encabezado, Estado, pct, SinDatos } from '@/components/ui';
import { descargar, useDatos } from '@/lib/api';

interface Competencia {
  codigo: string;
  unidades: number;
  nivelPercibido: number | null;
  aciertos: number | null;
  logroDocente: number | null;
}
interface Caracteristica {
  id: number;
  numeros: string;
  nombre: string;
  aspecto: string;
  objetivo: string;
  meta: string;
  estado: string;
  indicadores: Record<string, unknown>;
}
interface Plan {
  periodo: { id: number; codigo: string } | null;
  caracteristicas: Caracteristica[];
}

const ESTADOS: Record<string, [string, string]> = {
  CUMPLE: ['Cumple', 'lv3'],
  EN_PROGRESO: ['En progreso', 'lv2'],
  NO_CUMPLE: ['No cumple', 'lv1'],
  SIN_DATOS: ['Sin datos', 'lv4'],
};
const ETIQUETAS: Record<string, [string, boolean?]> = {
  evaluacionesAplicadas: ['Evaluaciones aplicadas (de 2)'],
  pctCumplenPep: ['Docentes que cumplen el PEP', true],
  efectividadDocentes: ['Efectividad según docentes (1–5)'],
  efectividadEstudiantes: ['Efectividad según estudiantes (1–5)'],
  pctAcuerdoPedagogico: ['Estudiantes con acuerdo pedagógico', true],
  pctRecomendacionesAplicadas: ['Recomendaciones aplicadas (meta 70 %)', true],
  recomendacionesEvaluadas: ['Recomendaciones evaluadas'],
  coherenciaEvaluacion: ['Coherencia evaluación–RA (1–5)'],
  retroalimentacionEstudiantes: ['Retroalimentación a estudiantes (1–5)'],
  pctDocentesRetroalimentan: ['Docentes que retroalimentan RA', true],
  pctUnidadesConSeguimiento: ['Unidades con seguimiento de RA', true],
  metaAnio: ['Meta del año', true],
};

export default function PlanPage() {
  const { datos, error, cargando } = useDatos<Plan>('/plan-mejoramiento');
  const [aviso, setAviso] = useState('');

  const pdf = async () => {
    setAviso('Generando…');
    try {
      await descargar(
        '/reportes/plan-mejoramiento.pdf',
        `plan-mejoramiento-${datos?.periodo?.codigo}.pdf`,
      );
      setAviso('');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo generar el PDF.');
    }
  };

  return (
    <>
      <Encabezado
        titulo="Plan de mejoramiento"
        texto={
          datos?.periodo ? `Características 18 a 24 · Periodo ${datos.periodo.codigo}` : undefined
        }
      >
        {datos?.periodo && (
          <button className="btn" onClick={() => void pdf()}>
            Descargar PDF
          </button>
        )}
      </Encabezado>
      {aviso && (
        <p role="status" className="mb-3 text-sm text-muted">
          {aviso}
        </p>
      )}
      <Estado cargando={cargando} error={error}>
        {!datos?.caracteristicas.length ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <div className="space-y-4">
            {datos.caracteristicas.map((c) => {
              const [texto, clase] = ESTADOS[c.estado] ?? ['—', 'lv4'];
              const comp = c.indicadores.competencias as Competencia[] | undefined;
              const usadas = c.indicadores.estrategiasMasUsadas as
                { nombre: string; veces: number }[] | undefined;
              const aspectos = c.indicadores.aspectos as
                | { aspecto: string; diagnostico: number | null; posterior: number | null }[]
                | undefined;
              return (
                <article key={c.id} className="card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        Características {c.numeros.replaceAll(',', ', ')}
                      </p>
                      <h2>{c.nombre}</h2>
                    </div>
                    <span className={`chip chip-nivel ${clase}`}>{texto}</span>
                  </div>
                  <details className="text-sm text-muted">
                    <summary className="cursor-pointer">Aspecto, objetivo y meta</summary>
                    <p className="mt-2">{c.aspecto}</p>
                    <p className="mt-2">{c.objetivo}</p>
                    <p className="mt-2">{c.meta}</p>
                  </details>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {Object.entries(ETIQUETAS)
                      .filter(([k]) => k in c.indicadores)
                      .map(([k, [et, esPct]]) => {
                        const v = c.indicadores[k] as number | null;
                        return (
                          <div
                            key={k}
                            className="flex justify-between gap-3 border-b border-line pb-1 text-sm"
                          >
                            <dt className="text-muted">{et}</dt>
                            <dd className="font-semibold tabular-nums">
                              {esPct ? pct(v) : (v ?? '—')}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                  {aspectos && (
                    <div className="tabla-wrap">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Aspecto</th>
                            <th>Diagnóstico</th>
                            <th>Posterior</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aspectos.map((a) => (
                            <tr key={a.aspecto}>
                              <td className="capitalize">{a.aspecto}</td>
                              <td>{a.diagnostico ?? '—'}</td>
                              <td>{a.posterior ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!!usadas?.length && (
                    <p className="text-sm">
                      <strong>Más usadas:</strong>{' '}
                      {usadas.map((u) => `${u.nombre} (${u.veces})`).join(', ')}
                    </p>
                  )}
                  {!!comp?.length && (
                    <div className="tabla-wrap">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Competencia</th>
                            <th>Unidades</th>
                            <th>Nivel</th>
                            <th>Aciertos</th>
                            <th>Logro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comp.map((x) => (
                            <tr key={x.codigo}>
                              <td>{x.codigo}</td>
                              <td>{x.unidades}</td>
                              <td>{x.nivelPercibido ?? '—'}</td>
                              <td>{pct(x.aciertos)}</td>
                              <td>{pct(x.logroDocente)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Estado>
    </>
  );
}
