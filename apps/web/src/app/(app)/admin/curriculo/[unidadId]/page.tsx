'use client';

import { SIN_DATOS } from '@rae/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Pregunta {
  nivel: 'ESTUDIANTE' | 'DOCENTE';
  enunciado: string;
  opciones: string[];
  indiceCorrecta: number;
}
interface Item {
  id: number;
  seccion: string;
  texto: string;
  capacidad: string;
  activo: boolean;
  competenciaUnidadId: number | null;
  preguntas: Pregunta[];
}
interface Unidad {
  id: number;
  nombre: string;
  semestre: number;
  editado: boolean;
  competencias: { id: number; codigo: string | null; tituloCorto: string }[];
  items: Item[];
}

const SECCIONES = [
  ['OBJETIVO', 'Objetivos'],
  ['GENERICA', 'Competencias genéricas'],
  ['ESPECIFICA', 'Competencias específicas'],
  ['RAE', 'Resultados del programa'],
];

function EditorPregunta({
  item,
  nivel,
  onAviso,
}: {
  item: Item;
  nivel: Pregunta['nivel'];
  onAviso: (t: string) => void;
}) {
  const base = item.preguntas.find((p) => p.nivel === nivel);
  const [enunciado, setEnunciado] = useState(base?.enunciado ?? '');
  const [opciones, setOpciones] = useState<string[]>(base?.opciones ?? ['', '', '', '']);
  const [correcta, setCorrecta] = useState(base?.indiceCorrecta ?? 0);
  const guardar = async () => {
    try {
      await api(`/curriculo/items/${item.id}/preguntas/${nivel}`, 'PUT', {
        enunciado,
        opciones: opciones.map((o) => o.trim()).filter(Boolean),
        indiceCorrecta: correcta,
      });
      onAviso('Pregunta guardada.');
    } catch (e) {
      onAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <fieldset className="space-y-2 rounded-lg bg-surface-2 p-3">
      <legend className="px-1 text-sm font-semibold">
        Pregunta para {nivel === 'DOCENTE' ? 'docentes' : 'estudiantes'}
      </legend>
      <textarea
        aria-label="Enunciado"
        className="input"
        rows={2}
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
      />
      {opciones.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            aria-label={`Opción ${i + 1} es la correcta`}
            name={`c-${item.id}-${nivel}`}
            checked={correcta === i}
            onChange={() => setCorrecta(i)}
          />
          <input
            aria-label={`Opción ${i + 1}`}
            className="input"
            value={o}
            onChange={(e) => setOpciones(opciones.map((x, j) => (j === i ? e.target.value : x)))}
          />
        </div>
      ))}
      <button type="button" className="btn" onClick={() => void guardar()}>
        Guardar pregunta
      </button>
    </fieldset>
  );
}

function EditorItem({ item, onAviso }: { item: Item; onAviso: (t: string) => void }) {
  const [capacidad, setCapacidad] = useState(item.capacidad);
  const [activo, setActivo] = useState(item.activo);
  const guardar = async (cambio: { capacidad?: string; activo?: boolean }) => {
    try {
      await api(`/curriculo/items/${item.id}`, 'PUT', cambio);
      onAviso('Cambios guardados.');
    } catch (e) {
      onAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <details className="border-t border-line py-3 first:border-t-0">
      <summary className={`cursor-pointer font-medium ${activo ? '' : 'text-faint line-through'}`}>
        {capacidad || item.texto}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-muted">
          <strong>Syllabus:</strong> {item.texto}
        </p>
        <label className="block text-sm font-semibold">
          Afirmación (en infinitivo)
          <textarea
            className="input mt-1 font-normal"
            rows={2}
            maxLength={500}
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => void guardar({ capacidad })}>
            Guardar afirmación
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setActivo(!activo);
              void guardar({ activo: !activo });
            }}
          >
            {activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <EditorPregunta item={item} nivel="ESTUDIANTE" onAviso={onAviso} />
          <EditorPregunta item={item} nivel="DOCENTE" onAviso={onAviso} />
        </div>
      </div>
    </details>
  );
}

export default function UnidadPage() {
  const { unidadId } = useParams<{ unidadId: string }>();
  const {
    datos: u,
    error,
    cargando,
    recargar,
  } = useDatos<Unidad>(`/curriculo/unidades/${unidadId}`);
  const [aviso, setAviso] = useState('');
  const [version, setVersion] = useState(0);

  const restaurar = async () => {
    if (
      !window.confirm(
        '¿Volver esta unidad al contenido original del syllabus? Se perderán sus ediciones.',
      )
    )
      return;
    await api(`/curriculo/unidades/${unidadId}/restaurar`, 'POST');
    await recargar();
    setVersion((v) => v + 1);
    setAviso('Unidad restaurada.');
  };

  return (
    <Estado cargando={cargando && !u} error={error}>
      {u && (
        <div key={version}>
          <Link href="/admin/curriculo" className="text-sm text-primary">
            ← Base de conocimiento
          </Link>
          <Encabezado titulo={u.nombre} texto={`Semestre ${u.semestre}`}>
            {u.editado && (
              <button className="btn" onClick={() => void restaurar()}>
                Restaurar original
              </button>
            )}
          </Encabezado>
          {aviso && (
            <p
              role="status"
              className="sticky top-14 z-10 mb-3 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary lg:top-2"
            >
              {aviso}
            </p>
          )}
          <div className="space-y-4">
            {SECCIONES.map(([clave, titulo]) => {
              const items = u.items.filter((i) => i.seccion === clave);
              const grupos = [...new Set(items.map((i) => i.competenciaUnidadId))];
              return (
                <section key={clave} className="card">
                  <h2 className="mb-2">{titulo}</h2>
                  {!items.length && <p className="text-muted">{SIN_DATOS}</p>}
                  {grupos.map((g) => {
                    const comp = u.competencias.find((c) => c.id === g);
                    return (
                      <div key={g ?? 'x'} className="mt-3">
                        {comp && (
                          <h3 className="mb-1 flex flex-wrap items-center gap-2">
                            {comp.codigo && <span className="chip">{comp.codigo}</span>}
                            {comp.tituloCorto}
                          </h3>
                        )}
                        {items
                          .filter((i) => i.competenciaUnidadId === g)
                          .map((i) => (
                            <EditorItem key={i.id} item={i} onAviso={setAviso} />
                          ))}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </Estado>
  );
}
