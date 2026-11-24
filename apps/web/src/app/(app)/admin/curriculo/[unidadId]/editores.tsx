'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export interface Pregunta {
  nivel: 'ESTUDIANTE' | 'DOCENTE';
  enunciado: string;
  opciones: string[];
  indiceCorrecta: number;
}
export interface Item {
  id: number;
  seccion: string;
  tipo: string;
  texto: string;
  capacidad: string;
  activo: boolean;
  competenciaUnidadId: number | null;
  preguntas: Pregunta[];
}
export interface Competencia {
  id: number;
  codigo: string | null;
  tipo: 'GENERICA' | 'ESPECIFICA';
  texto: string;
  tituloCorto: string;
  activo: boolean;
}
type Aviso = (t: string) => void;

async function correr(
  f: () => Promise<unknown>,
  ok: string,
  aviso: Aviso,
  despues?: () => Promise<void> | void,
) {
  try {
    await f();
    aviso(ok);
    await despues?.();
  } catch (e) {
    aviso(e instanceof Error ? e.message : 'No se pudo guardar.');
  }
}

function EditorPregunta({
  item,
  nivel,
  onAviso,
}: {
  item: Item;
  nivel: Pregunta['nivel'];
  onAviso: Aviso;
}) {
  const base = item.preguntas.find((p) => p.nivel === nivel);
  const [enunciado, setEnunciado] = useState(base?.enunciado ?? '');
  const [opciones, setOpciones] = useState<string[]>(base?.opciones ?? ['', '', '', '']);
  const [correcta, setCorrecta] = useState(base?.indiceCorrecta ?? 0);
  const guardar = () =>
    correr(
      () =>
        api(`/curriculo/items/${item.id}/preguntas/${nivel}`, 'PUT', {
          enunciado,
          opciones: opciones.map((o) => o.trim()).filter(Boolean),
          indiceCorrecta: correcta,
        }),
      'Pregunta guardada.',
      onAviso,
    );
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

export function EditorItem({
  item,
  onAviso,
  onCambio,
}: {
  item: Item;
  onAviso: Aviso;
  onCambio: () => Promise<void>;
}) {
  const [texto, setTexto] = useState(item.texto);
  const [capacidad, setCapacidad] = useState(item.capacidad);
  const guardar = (cambio: Partial<Pick<Item, 'texto' | 'capacidad' | 'activo'>>, ok: string) =>
    correr(() => api(`/curriculo/items/${item.id}`, 'PUT', cambio), ok, onAviso, onCambio);
  return (
    <details className="border-t border-line py-3 first:border-t-0">
      <summary
        className={`cursor-pointer font-medium ${item.activo ? '' : 'text-faint line-through'}`}
      >
        {item.capacidad || item.texto}
      </summary>
      <div className="mt-3 space-y-3">
        <label className="block text-sm font-semibold">
          Texto del syllabus
          <textarea
            className="input mt-1 font-normal"
            rows={2}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Afirmación (en infinitivo, por ejemplo «identificar los tipos de datos»)
          <textarea
            className="input mt-1 font-normal"
            rows={2}
            maxLength={500}
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => void guardar({ texto, capacidad }, 'Cambios guardados.')}
          >
            Guardar
          </button>
          {item.activo ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (
                  window.confirm(
                    '¿Eliminar este ítem? Dejará de preguntarse; las respuestas ya guardadas se conservan.',
                  )
                )
                  void guardar({ activo: false }, 'Ítem eliminado.');
              }}
            >
              Eliminar
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => void guardar({ activo: true }, 'Ítem restaurado.')}
            >
              Restaurar
            </button>
          )}
        </div>
        {item.activo && (
          <div className="grid gap-3 lg:grid-cols-2">
            <EditorPregunta item={item} nivel="ESTUDIANTE" onAviso={onAviso} />
            <EditorPregunta item={item} nivel="DOCENTE" onAviso={onAviso} />
          </div>
        )}
      </div>
    </details>
  );
}

export function NuevoItem({
  unidadId,
  tipo,
  competenciaId,
  etiqueta,
  onAviso,
  onCambio,
}: {
  unidadId: number;
  tipo: 'OBJETIVO' | 'RA' | 'RAE';
  competenciaId?: number;
  etiqueta: string;
  onAviso: Aviso;
  onCambio: () => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const crear = (e: FormEvent) => {
    e.preventDefault();
    void correr(
      () =>
        api(`/curriculo/unidades/${unidadId}/items`, 'POST', {
          tipo,
          competenciaUnidadId: competenciaId,
          texto,
          capacidad,
        }),
      'Agregado. Recuerda escribir sus preguntas prácticas.',
      onAviso,
      async () => {
        setTexto('');
        setCapacidad('');
        await onCambio();
      },
    );
  };
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-semibold text-primary">+ {etiqueta}</summary>
      <form onSubmit={crear} className="mt-2 space-y-2 rounded-lg bg-surface-2 p-3">
        <textarea
          aria-label="Texto del syllabus"
          placeholder="Texto del syllabus"
          className="input"
          rows={2}
          required
          minLength={5}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <textarea
          aria-label="Afirmación"
          placeholder="Afirmación en infinitivo"
          className="input"
          rows={2}
          required
          minLength={3}
          maxLength={500}
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
        />
        <button className="btn btn-primary">Agregar</button>
      </form>
    </details>
  );
}

export function EditorCompetencia({
  c,
  onAviso,
  onCambio,
}: {
  c: Competencia;
  onAviso: Aviso;
  onCambio: () => Promise<void>;
}) {
  const [codigo, setCodigo] = useState(c.codigo ?? '');
  const [titulo, setTitulo] = useState(c.tituloCorto);
  const [texto, setTexto] = useState(c.texto);
  const guardar = (cambio: Record<string, unknown>, ok: string) =>
    correr(() => api(`/curriculo/competencias/${c.id}`, 'PUT', cambio), ok, onAviso, onCambio);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary">Editar competencia</summary>
      <div className="mt-2 grid gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-[120px_1fr]">
        <input
          aria-label="Código"
          placeholder="CG01 o CE01"
          className="input"
          maxLength={4}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        />
        <input
          aria-label="Título corto"
          className="input"
          maxLength={200}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          aria-label="Enunciado"
          className="input sm:col-span-2"
          rows={2}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="button"
            className="btn"
            onClick={() =>
              void guardar(
                { codigo: codigo || null, tituloCorto: titulo, texto },
                'Competencia guardada.',
              )
            }
          >
            Guardar
          </button>
          {c.activo ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (
                  window.confirm(
                    '¿Eliminar la competencia y todos sus resultados de las encuestas? Las respuestas guardadas se conservan.',
                  )
                )
                  void guardar({ activo: false }, 'Competencia eliminada.');
              }}
            >
              Eliminar
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => void guardar({ activo: true }, 'Competencia restaurada.')}
            >
              Restaurar
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

export function NuevaCompetencia({
  unidadId,
  tipo,
  onAviso,
  onCambio,
}: {
  unidadId: number;
  tipo: Competencia['tipo'];
  onAviso: Aviso;
  onCambio: () => Promise<void>;
}) {
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const crear = (e: FormEvent) => {
    e.preventDefault();
    void correr(
      () =>
        api(`/curriculo/unidades/${unidadId}/competencias`, 'POST', {
          codigo: codigo || undefined,
          tipo,
          tituloCorto: titulo,
          texto,
          capacidad,
        }),
      'Competencia creada. Agrégale sus resultados de aprendizaje.',
      onAviso,
      async () => {
        setCodigo('');
        setTitulo('');
        setTexto('');
        setCapacidad('');
        await onCambio();
      },
    );
  };
  const prefijo = tipo === 'GENERICA' ? 'CG' : 'CE';
  return (
    <details className="mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        + Nueva competencia {tipo === 'GENERICA' ? 'genérica' : 'específica'}
      </summary>
      <form
        onSubmit={crear}
        className="mt-2 grid gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-[120px_1fr]"
      >
        <input
          aria-label="Código"
          placeholder={`${prefijo}01`}
          className="input"
          pattern={`${prefijo}\\d{2}`}
          title={`Formato ${prefijo}01`}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        />
        <input
          aria-label="Título corto"
          placeholder="Título corto"
          className="input"
          required
          minLength={3}
          maxLength={200}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          aria-label="Enunciado"
          placeholder="Enunciado de la competencia"
          className="input sm:col-span-2"
          rows={2}
          required
          minLength={5}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <textarea
          aria-label="Afirmación"
          placeholder="Afirmación en infinitivo (se pregunta mientras no tenga resultados)"
          className="input sm:col-span-2"
          rows={2}
          required
          minLength={3}
          maxLength={500}
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
        />
        <button className="btn btn-primary sm:col-span-2 sm:justify-self-start">
          Crear competencia
        </button>
      </form>
    </details>
  );
}
