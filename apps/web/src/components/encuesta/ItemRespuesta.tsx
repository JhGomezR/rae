'use client';

import { INSTRUMENTOS, NIVELES, nivelDePct } from '@rae/shared';
import type { ItemEncuesta, Respuesta } from './tipos';

interface Props {
  item: ItemEncuesta;
  valor: Respuesta;
  rol: 'DOCENTE' | 'ESTUDIANTE';
  alcance: boolean;
  soloLectura: boolean;
  onCambio: (cambio: Partial<Respuesta>) => void;
}

export function EscalaNivel({
  etiqueta,
  valor,
  disabled,
  onCambio,
}: {
  etiqueta: string;
  valor?: number;
  disabled: boolean;
  onCambio: (v: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {NIVELES.map((n) => (
        <button
          key={n.valor}
          type="button"
          role="radio"
          aria-checked={valor === n.valor}
          disabled={disabled}
          className={`escala-btn lv${n.valor}`}
          onClick={() => onCambio(n.valor)}
        >
          {valor === n.valor ? '✓ ' : ''}
          {n.nombre}
        </button>
      ))}
    </div>
  );
}

function PreguntaPractica({
  item,
  valor,
  disabled,
  onCambio,
}: {
  item: ItemEncuesta;
  valor?: number;
  disabled: boolean;
  onCambio: (v: number) => void;
}) {
  if (!item.pregunta) return null;
  return (
    <div className="mt-3 rounded-lg border-l-4 border-accent bg-surface-2 p-3">
      <p className="mb-2 text-sm font-semibold text-accent">Pregunta práctica</p>
      <p className="mb-3">{item.pregunta.enunciado}</p>
      <div role="radiogroup" aria-label="Opciones de respuesta" className="grid gap-2">
        {item.pregunta.opciones.map((o, i) => (
          <button
            key={o.indice}
            type="button"
            role="radio"
            aria-checked={valor === o.indice}
            disabled={disabled}
            className="opcion"
            onClick={() => onCambio(o.indice)}
          >
            <strong>{String.fromCharCode(65 + i)}.</strong>
            <span>{o.texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CamposDocente({
  valor,
  soloLectura,
  onCambio,
}: Pick<Props, 'valor' | 'soloLectura' | 'onCambio'>) {
  const logro = valor.evaluados
    ? Math.round(((valor.alcanzan ?? 0) / valor.evaluados) * 100)
    : null;
  const numero = (t: string) => (t === '' ? undefined : Math.max(0, Number.parseInt(t, 10) || 0));
  const excede = (valor.alcanzan ?? 0) > (valor.evaluados ?? 0);
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Evidencia / actividad
        <input
          className="input mt-1 font-normal"
          maxLength={500}
          disabled={soloLectura}
          value={valor.evidencia ?? ''}
          onChange={(e) => onCambio({ evidencia: e.target.value })}
        />
      </label>
      <label className="text-sm font-semibold">
        Instrumento
        <select
          className="input mt-1 font-normal"
          disabled={soloLectura}
          value={valor.instrumento ?? ''}
          onChange={(e) => onCambio({ instrumento: e.target.value || undefined })}
        >
          <option value="">Selecciona</option>
          {INSTRUMENTOS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Nº evaluados
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          disabled={soloLectura}
          value={valor.evaluados ?? ''}
          onChange={(e) => onCambio({ evaluados: numero(e.target.value) })}
        />
      </label>
      <label className="text-sm font-semibold">
        Nº que alcanzan el resultado
        <input
          className="input mt-1 font-normal"
          type="number"
          min={0}
          disabled={soloLectura}
          value={valor.alcanzan ?? ''}
          onChange={(e) => onCambio({ alcanzan: numero(e.target.value) })}
        />
      </label>
      {excede ? (
        <p role="alert" className="text-sm text-err sm:col-span-2">
          No pueden alcanzar más estudiantes de los evaluados.
        </p>
      ) : logro !== null ? (
        <p className="text-sm sm:col-span-2">
          Logro: <strong>{logro} %</strong>{' '}
          <span className={`chip chip-nivel lv${nivelDePct(logro).valor}`}>
            {nivelDePct(logro).nombre}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function ItemRespuesta({ item, valor, rol, alcance, soloLectura, onCambio }: Props) {
  const docenteAlcance = alcance && rol === 'DOCENTE';
  return (
    <div id={`item-${item.id}`} className="border-t border-line py-4 first:border-t-0">
      <p className="mb-2 font-medium">{item.frase}</p>
      <details className="mb-3 text-sm text-muted">
        <summary className="cursor-pointer">Texto del syllabus</summary>
        <p className="mt-1">{item.textoSyllabus}</p>
      </details>
      {docenteAlcance ? (
        <CamposDocente valor={valor} soloLectura={soloLectura} onCambio={onCambio} />
      ) : (
        <EscalaNivel
          etiqueta={item.frase}
          valor={valor.nivel}
          disabled={soloLectura}
          onCambio={(nivel) => onCambio({ nivel })}
        />
      )}
      {alcance && (
        <PreguntaPractica
          item={item}
          valor={valor.opcionElegida}
          disabled={soloLectura}
          onCambio={(opcionElegida) => onCambio({ opcionElegida })}
        />
      )}
    </div>
  );
}
