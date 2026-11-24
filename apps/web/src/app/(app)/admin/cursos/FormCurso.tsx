'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export interface Opciones {
  periodos: { id: number; codigo: string; activo: boolean }[];
  sedes: { id: number; codigo: string }[];
  programas: { id: number; nombre: string }[];
  unidades: { id: number; nombre: string; semestre: number }[];
  docentes: { id: number; nombreCompleto: string; documento: string }[];
}
export interface ValoresCurso {
  periodoId: number;
  unidadId: number;
  docenteId: number;
  sede: string;
  programa: string;
  grupo: string;
  semestreOferta: number;
}

/** Crea un curso o edita uno existente (sin cambiar su periodo). */
export function FormCurso({
  opciones,
  inicial,
  cursoId,
  onListo,
}: {
  opciones: Opciones;
  inicial?: ValoresCurso;
  cursoId?: number;
  onListo: () => Promise<void>;
}) {
  const activo = opciones.periodos.find((p) => p.activo) ?? opciones.periodos[0];
  const [v, setV] = useState<ValoresCurso>(
    inicial ?? {
      periodoId: activo?.id ?? 0,
      unidadId: opciones.unidades[0]?.id ?? 0,
      docenteId: opciones.docentes[0]?.id ?? 0,
      sede: opciones.sedes[0]?.codigo ?? '',
      programa: opciones.programas[0]?.nombre ?? '',
      grupo: 'A',
      semestreOferta: opciones.unidades[0]?.semestre ?? 1,
    },
  );
  const [error, setError] = useState('');
  const cambiar = <K extends keyof ValoresCurso>(k: K, valor: ValoresCurso[K]) =>
    setV({ ...v, [k]: valor });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (cursoId) {
        const { periodoId: _p, ...resto } = v;
        void _p;
        await api(`/cursos/${cursoId}`, 'PATCH', resto);
      } else {
        await api('/cursos', 'POST', v);
      }
      await onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  return (
    <form onSubmit={(e) => void guardar(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {!cursoId && (
        <label className="text-sm font-semibold">
          Periodo
          <select
            className="input mt-1 font-normal"
            value={v.periodoId}
            onChange={(e) => cambiar('periodoId', Number(e.target.value))}
          >
            {opciones.periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm font-semibold sm:col-span-2">
        Unidad de formación
        <select
          className="input mt-1 font-normal"
          value={v.unidadId}
          onChange={(e) => {
            const u = opciones.unidades.find((x) => x.id === Number(e.target.value));
            setV({
              ...v,
              unidadId: Number(e.target.value),
              semestreOferta: u?.semestre ?? v.semestreOferta,
            });
          }}
        >
          {opciones.unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.semestre} · {u.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Docente
        <select
          className="input mt-1 font-normal"
          value={v.docenteId}
          onChange={(e) => cambiar('docenteId', Number(e.target.value))}
        >
          {opciones.docentes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombreCompleto} · {d.documento}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Grupo
        <input
          className="input mt-1 font-normal"
          required
          maxLength={5}
          value={v.grupo}
          onChange={(e) => cambiar('grupo', e.target.value.toUpperCase())}
        />
      </label>
      <label className="text-sm font-semibold">
        Sede
        <input
          className="input mt-1 font-normal"
          list="sedes"
          required
          minLength={2}
          maxLength={40}
          value={v.sede}
          onChange={(e) => cambiar('sede', e.target.value)}
        />
        <datalist id="sedes">
          {opciones.sedes.map((s) => (
            <option key={s.id} value={s.codigo} />
          ))}
        </datalist>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Programa
        <input
          className="input mt-1 font-normal"
          list="programas"
          required
          minLength={3}
          maxLength={120}
          value={v.programa}
          onChange={(e) => cambiar('programa', e.target.value)}
        />
        <datalist id="programas">
          {opciones.programas.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>
      </label>
      <label className="text-sm font-semibold">
        Semestre de oferta
        <select
          className="input mt-1 font-normal"
          value={v.semestreOferta}
          onChange={(e) => cambiar('semestreOferta', Number(e.target.value))}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button className="btn btn-primary">{cursoId ? 'Guardar cambios' : 'Crear curso'}</button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-err sm:col-span-2 lg:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}
