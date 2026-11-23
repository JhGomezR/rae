'use client';

import { SIN_DATOS } from '@rae/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ItemRespuesta } from '@/components/encuesta/ItemRespuesta';
import { PreguntasGenerales } from '@/components/encuesta/PreguntasGenerales';
import type {
  Encuesta,
  EstadoSeguimiento,
  General,
  ItemEncuesta,
  Respuesta,
} from '@/components/encuesta/tipos';
import { Estado } from '@/components/ui';
import { api, ErrorApi, useDatos } from '@/lib/api';

const TITULOS = {
  OBJETIVO: 'Objetivos de aprendizaje',
  GENERICA: 'Competencias genéricas',
  ESPECIFICA: 'Competencias específicas',
  RAE: 'Resultados de aprendizaje del programa',
};

function completo(it: ItemEncuesta, r: Respuesta | undefined, alcance: boolean, docente: boolean) {
  if (!r) return false;
  const opcion = !it.pregunta || r.opcionElegida !== undefined;
  if (!alcance) return r.nivel !== undefined;
  if (docente) {
    return (
      r.evaluados !== undefined && r.alcanzan !== undefined && r.alcanzan <= r.evaluados && opcion
    );
  }
  return r.nivel !== undefined && opcion;
}

function Formulario({ e }: { e: Encuesta }) {
  const router = useRouter();
  const alcance = e.momento === 'ALCANCE';
  const docente = e.rol === 'DOCENTE';
  const soloLectura = !e.abierto;
  const [respuestas, setRespuestas] = useState(e.respuestas);
  const [general, setGeneral] = useState<General>(e.general);
  const [estrategias, setEstrategias] = useState(e.estrategias);
  const [recomendaciones, setRecomendaciones] = useState(e.recomendaciones.join('\n'));
  const [previas, setPrevias] = useState<EstadoSeguimiento[]>(e.recomendacionesPrevias);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const sucio = useRef(false);

  const items = useMemo(() => e.secciones.flatMap((s) => s.grupos.flatMap((g) => g.items)), [e]);
  const hechos = items.filter((i) => completo(i, respuestas[i.id], alcance, docente)).length;

  const cuerpo = useCallback(() => {
    const limpio = Object.fromEntries(
      Object.entries(general).filter(([, v]) => v !== undefined && v !== ''),
    );
    return {
      general: limpio,
      items: respuestas,
      estrategias,
      recomendaciones: recomendaciones
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
      seguimiento: previas
        .filter((p) => p.estado)
        .map((p) => ({ recomendacionId: p.id, estado: p.estado })),
    };
  }, [general, respuestas, estrategias, recomendaciones, previas]);

  const ruta = `/encuestas/${e.curso.id}/${e.momento.toLowerCase()}`;
  const puedeBorrador = e.abierto && e.estado !== 'ENVIADA';

  const guardar = useCallback(async () => {
    if (!puedeBorrador) return;
    try {
      await api(`${ruta}/borrador`, 'PUT', cuerpo());
      sucio.current = false;
      setAviso(
        `Guardado a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
      );
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }, [cuerpo, puedeBorrador, ruta]);

  useEffect(() => {
    const t = setInterval(() => {
      if (sucio.current) void guardar();
    }, 20_000);
    return () => clearInterval(t);
  }, [guardar]);

  const marcar = () => {
    sucio.current = true;
    setError('');
  };
  const cambiarItem = (id: number, cambio: Partial<Respuesta>) => {
    marcar();
    setRespuestas((r) => ({ ...r, [id]: { ...r[id], ...cambio } }));
  };
  const aplicarATodos = () => {
    const evaluados = general.evaluados;
    if (typeof evaluados !== 'number') return;
    marcar();
    setRespuestas((r) => Object.fromEntries(items.map((i) => [i.id, { ...r[i.id], evaluados }])));
  };

  const enviar = async () => {
    const faltante = items.find((i) => !completo(i, respuestas[i.id], alcance, docente));
    if (faltante) {
      setError(`Faltan ${items.length - hechos} respuestas.`);
      document
        .getElementById(`item-${faltante.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    try {
      await api(`${ruta}/enviar`, 'POST', cuerpo());
      sucio.current = false;
      router.push('/mis-encuestas');
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo enviar.');
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <header>
        <Link href="/mis-encuestas" className="text-sm text-primary">
          ← Mis encuestas
        </Link>
        <p className={`mt-2 text-sm font-semibold ${alcance ? 'text-accent' : 'text-primary'}`}>
          {alcance ? 'Nivel de alcance · lo aprendido' : 'Nivel de apreciación · lo que se espera'}
        </p>
        <h1>{e.curso.unidad}</h1>
        <p className="mt-1 text-muted">
          Semestre {e.curso.semestre} · Grupo {e.curso.grupo} · {e.curso.sede} · {e.curso.periodo}
        </p>
        {docente && (
          <p className="mt-2 text-muted">Cada afirmación se refiere a tus estudiantes.</p>
        )}
        {soloLectura && <p className="chip mt-2">Solo lectura: este momento está cerrado</p>}
      </header>

      {alcance && docente && !soloLectura && (
        <section className="card flex flex-wrap items-end gap-3">
          <label className="block font-medium">
            Nº de estudiantes evaluados
            <input
              className="input mt-1 max-w-40 font-normal"
              type="number"
              min={0}
              value={general.evaluados ?? ''}
              onChange={(ev) => {
                marcar();
                setGeneral((g) => ({
                  ...g,
                  evaluados:
                    ev.target.value === '' ? undefined : Math.max(0, Number(ev.target.value)),
                }));
              }}
            />
          </label>
          <button type="button" className="btn" onClick={aplicarATodos}>
            Aplicar a todos
          </button>
        </section>
      )}

      {e.secciones.map((s) => (
        <section key={s.seccion} className="card">
          <h2 className="mb-3">{TITULOS[s.seccion]}</h2>
          {s.grupos.length === 0 && <p className="text-muted">{SIN_DATOS}</p>}
          {s.grupos.map((g, i) => (
            <div key={i} className="mt-3 first:mt-0">
              <h3 className="flex flex-wrap items-center gap-2">
                {g.codigo && <span className="chip">{g.codigo}</span>}
                {g.titulo}
              </h3>
              {g.items.map((it) => (
                <ItemRespuesta
                  key={it.id}
                  item={it}
                  valor={respuestas[it.id] ?? {}}
                  rol={e.rol}
                  alcance={alcance}
                  soloLectura={soloLectura}
                  onCambio={(c) => cambiarItem(it.id, c)}
                />
              ))}
            </div>
          ))}
        </section>
      ))}

      <PreguntasGenerales
        encuesta={e}
        general={general}
        estrategias={estrategias}
        recomendaciones={recomendaciones}
        previas={previas}
        soloLectura={soloLectura}
        onGeneral={(k, v) => {
          marcar();
          setGeneral((g) => ({ ...g, [k]: v }));
        }}
        onEstrategias={(v) => {
          marcar();
          setEstrategias(v);
        }}
        onRecomendaciones={(v) => {
          marcar();
          setRecomendaciones(v);
        }}
        onPrevia={(id, estado) => {
          marcar();
          setPrevias((l) => l.map((p) => (p.id === id ? { ...p, estado } : p)));
        }}
      />

      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-line bg-surface px-4 py-3 lg:left-[260px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <strong className="tabular-nums">
              {hechos} de {items.length}
            </strong>{' '}
            respondidas
            {aviso && <span className="ml-2 text-faint">{aviso}</span>}
            {error && (
              <span role="alert" className="ml-2 text-err">
                {error}
              </span>
            )}
          </div>
          {!soloLectura && (
            <div className="flex gap-2">
              {puedeBorrador && (
                <button type="button" className="btn" onClick={() => void guardar()}>
                  Guardar
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={enviando}
                onClick={() => void enviar()}
              >
                {enviando ? 'Enviando…' : e.estado === 'ENVIADA' ? 'Actualizar' : 'Enviar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EncuestaPage() {
  const { cursoId, momento } = useParams<{ cursoId: string; momento: string }>();
  const { datos, error, cargando } = useDatos<Encuesta>(`/encuestas/${cursoId}/${momento}`);
  return (
    <Estado cargando={cargando && !datos} error={error}>
      {datos && <Formulario e={datos} />}
    </Estado>
  );
}
