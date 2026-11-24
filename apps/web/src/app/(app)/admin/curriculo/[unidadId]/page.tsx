'use client';

import { SIN_DATOS } from '@rae/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import {
  type Competencia,
  EditorCompetencia,
  EditorItem,
  type Item,
  NuevaCompetencia,
  NuevoItem,
} from './editores';

interface Unidad {
  id: number;
  nombre: string;
  semestre: number;
  ciclo: 'TECNOLOGICO' | 'PROFESIONAL';
  editado: boolean;
  activo: boolean;
  competencias: Competencia[];
  items: Item[];
}

function DatosUnidad({
  u,
  onAviso,
  onCambio,
}: {
  u: Unidad;
  onAviso: (t: string) => void;
  onCambio: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(u.nombre);
  const [semestre, setSemestre] = useState(String(u.semestre));
  const [ciclo, setCiclo] = useState(u.ciclo);
  const guardar = async (cambio: Record<string, unknown>, ok: string) => {
    try {
      await api(`/curriculo/unidades/${u.id}`, 'PATCH', cambio);
      onAviso(ok);
      await onCambio();
    } catch (e) {
      onAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  const restaurar = async () => {
    if (
      !window.confirm(
        '¿Volver esta unidad al contenido original del syllabus? Se perderán sus ediciones.',
      )
    )
      return;
    try {
      await api(`/curriculo/unidades/${u.id}/restaurar`, 'POST');
      onAviso('Unidad restaurada.');
      await onCambio();
    } catch (e) {
      onAviso(e instanceof Error ? e.message : 'No se pudo restaurar.');
    }
  };
  return (
    <details className="card mb-4">
      <summary className="cursor-pointer font-semibold">Datos de la unidad</summary>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Nombre
          <input
            className="input mt-1 font-normal"
            maxLength={150}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Semestre
          <select
            className="input mt-1 font-normal"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1}>{i + 1}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Ciclo
          <select
            className="input mt-1 font-normal"
            value={ciclo}
            onChange={(e) => setCiclo(e.target.value as Unidad['ciclo'])}
          >
            <option value="TECNOLOGICO">Tecnológico</option>
            <option value="PROFESIONAL">Profesional</option>
          </select>
        </label>
        <button
          className="btn btn-primary"
          onClick={() =>
            void guardar({ nombre, semestre: Number(semestre), ciclo }, 'Unidad guardada.')
          }
        >
          Guardar
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {u.activo ? (
          <button
            className="btn"
            onClick={() => {
              if (
                window.confirm(
                  '¿Eliminar esta unidad? Sus cursos dejarán de aparecer en encuestas y estadísticas; nada se borra.',
                )
              )
                void guardar({ activo: false }, 'Unidad eliminada.');
            }}
          >
            Eliminar unidad
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => void guardar({ activo: true }, 'Unidad restaurada.')}
          >
            Restaurar unidad
          </button>
        )}
        {u.editado && (
          <button className="btn" onClick={() => void restaurar()}>
            Volver al syllabus original
          </button>
        )}
      </div>
    </details>
  );
}

export default function UnidadPage() {
  const { unidadId } = useParams<{ unidadId: string }>() as { unidadId: string };
  const {
    datos: u,
    error,
    cargando,
    recargar,
  } = useDatos<Unidad>(`/curriculo/unidades/${unidadId}`);
  const [aviso, setAviso] = useState('');
  const [eliminados, setEliminados] = useState(false);

  return (
    <Estado cargando={cargando && !u} error={error}>
      {u && (
        <div>
          <Link href="/admin/curriculo" className="text-sm text-primary">
            ← Base de conocimiento
          </Link>
          <Encabezado
            titulo={u.nombre}
            texto={`Semestre ${u.semestre}${u.activo ? '' : ' · Eliminada'}`}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={eliminados}
                onChange={(e) => setEliminados(e.target.checked)}
              />
              Mostrar eliminados
            </label>
          </Encabezado>
          {aviso && (
            <p
              role="status"
              className="sticky top-14 z-10 mb-3 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary lg:top-2"
            >
              {aviso}
            </p>
          )}
          <DatosUnidad
            key={`${u.nombre}-${u.activo}`}
            u={u}
            onAviso={setAviso}
            onCambio={recargar}
          />
          <div className="space-y-4">
            {(['OBJETIVO', 'GENERICA', 'ESPECIFICA', 'RAE'] as const).map((s) => {
              const titulo = {
                OBJETIVO: 'Objetivos',
                GENERICA: 'Competencias genéricas',
                ESPECIFICA: 'Competencias específicas',
                RAE: 'Resultados del programa',
              }[s];
              const visibles = u.items.filter((i) => i.seccion === s && (eliminados || i.activo));
              const comps = u.competencias.filter((c) => c.tipo === s && (eliminados || c.activo));
              const esCompetencia = s === 'GENERICA' || s === 'ESPECIFICA';
              return (
                <section key={s} className="card">
                  <h2 className="mb-2">{titulo}</h2>
                  {!esCompetencia && (
                    <>
                      {!visibles.length && <p className="text-muted">{SIN_DATOS}</p>}
                      {visibles.map((i) => (
                        <EditorItem
                          key={`${i.id}-${i.activo}`}
                          item={i}
                          onAviso={setAviso}
                          onCambio={recargar}
                        />
                      ))}
                      <NuevoItem
                        unidadId={u.id}
                        tipo={s === 'RAE' ? 'RAE' : 'OBJETIVO'}
                        etiqueta={
                          s === 'RAE' ? 'Agregar resultado del programa' : 'Agregar objetivo'
                        }
                        onAviso={setAviso}
                        onCambio={recargar}
                      />
                    </>
                  )}
                  {esCompetencia && (
                    <>
                      {!comps.length && <p className="text-muted">{SIN_DATOS}</p>}
                      {comps.map((c) => (
                        <div
                          key={c.id}
                          className={`mt-4 first:mt-0 ${c.activo ? '' : 'opacity-60'}`}
                        >
                          <h3 className="mb-1 flex flex-wrap items-center gap-2">
                            {c.codigo && <span className="chip">{c.codigo}</span>}
                            {c.tituloCorto}
                            {!c.activo && <span className="chip chip-nivel lv1">Eliminada</span>}
                          </h3>
                          <EditorCompetencia
                            key={`${c.id}-${c.activo}`}
                            c={c}
                            onAviso={setAviso}
                            onCambio={recargar}
                          />
                          {visibles
                            .filter((i) => i.competenciaUnidadId === c.id)
                            .map((i) => (
                              <EditorItem
                                key={`${i.id}-${i.activo}`}
                                item={i}
                                onAviso={setAviso}
                                onCambio={recargar}
                              />
                            ))}
                          {c.activo && (
                            <NuevoItem
                              unidadId={u.id}
                              tipo="RA"
                              competenciaId={c.id}
                              etiqueta="Agregar resultado de aprendizaje"
                              onAviso={setAviso}
                              onCambio={recargar}
                            />
                          )}
                        </div>
                      ))}
                      <NuevaCompetencia
                        unidadId={u.id}
                        tipo={s}
                        onAviso={setAviso}
                        onCambio={recargar}
                      />
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </Estado>
  );
}
