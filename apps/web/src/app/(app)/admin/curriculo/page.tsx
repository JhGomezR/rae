'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Encabezado, Estado, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Unidad {
  id: number;
  nombre: string;
  semestre: number;
  editado: boolean;
  activo: boolean;
  conteo: { objetivos: number; genericas: number; especificas: number; rae: number };
}

const clave = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function NuevaUnidad({ onCreada }: { onCreada: (id: number) => void }) {
  const [nombre, setNombre] = useState('');
  const [semestre, setSemestre] = useState('1');
  const [ciclo, setCiclo] = useState('TECNOLOGICO');
  const [error, setError] = useState('');
  const crear = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const u = await api<{ id: number }>('/curriculo/unidades', 'POST', {
        nombre,
        semestre: Number(semestre),
        ciclo,
      });
      onCreada(u.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.');
    }
  };
  return (
    <details className="card mb-4">
      <summary className="cursor-pointer font-semibold">Nueva unidad de formación</summary>
      <form onSubmit={(e) => void crear(e)} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Nombre
          <input
            className="input mt-1 font-normal"
            required
            minLength={3}
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
            onChange={(e) => setCiclo(e.target.value)}
          >
            <option value="TECNOLOGICO">Tecnológico</option>
            <option value="PROFESIONAL">Profesional</option>
          </select>
        </label>
        <button className="btn btn-primary">Crear</button>
        {error && (
          <p role="alert" className="w-full text-sm text-err">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}

export default function CurriculoPage() {
  const { datos, error, cargando } = useDatos<Unidad[]>('/curriculo/unidades');
  const [q, setQ] = useState('');
  const [inactivas, setInactivas] = useState(false);
  const lista = (datos ?? []).filter(
    (u) => (inactivas || u.activo) && clave(u.nombre).includes(clave(q)),
  );
  const semestres = [...new Set(lista.map((u) => u.semestre))];
  const nInactivas = (datos ?? []).filter((u) => !u.activo).length;
  return (
    <>
      <Encabezado
        titulo="Base de conocimiento"
        texto="Objetivos, competencias, resultados y preguntas de cada unidad."
      />
      <NuevaUnidad onCreada={(id) => (window.location.href = `/admin/curriculo/${id}`)} />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="block max-w-sm min-w-0 flex-1 text-sm font-semibold">
          Buscar unidad
          <input
            className="input mt-1 font-normal"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inactivas}
            onChange={(e) => setInactivas(e.target.checked)}
          />
          Mostrar eliminadas ({nInactivas})
        </label>
      </div>
      <Estado cargando={cargando} error={error}>
        {!lista.length && (
          <div className="card">
            <SinDatos />
          </div>
        )}
        {semestres.map((s) => (
          <section key={s} className="mb-6">
            <h2 className="mb-3">Semestre {s}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lista
                .filter((u) => u.semestre === s)
                .map((u) => (
                  <Link
                    key={u.id}
                    href={`/admin/curriculo/${u.id}`}
                    className={`card block hover:border-primary ${u.activo ? '' : 'opacity-60'}`}
                  >
                    <p className="font-semibold">{u.nombre}</p>
                    <p className="mt-1 text-sm text-muted">
                      {u.conteo.objetivos} objetivos · {u.conteo.genericas} genéricas ·{' '}
                      {u.conteo.especificas} específicas · {u.conteo.rae} RAE
                    </p>
                    <span className="mt-2 flex gap-2">
                      {!u.activo && <span className="chip chip-nivel lv1">Eliminada</span>}
                      {u.editado && <span className="chip">Editada</span>}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </Estado>
    </>
  );
}
