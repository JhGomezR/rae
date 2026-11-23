'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Encabezado, Estado, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface Unidad {
  id: number;
  nombre: string;
  semestre: number;
  editado: boolean;
  conteo: { objetivos: number; genericas: number; especificas: number; rae: number };
}

const clave = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function CurriculoPage() {
  const { datos, error, cargando } = useDatos<Unidad[]>('/curriculo/unidades');
  const [q, setQ] = useState('');
  const lista = (datos ?? []).filter((u) => clave(u.nombre).includes(clave(q)));
  const semestres = [...new Set(lista.map((u) => u.semestre))];
  return (
    <>
      <Encabezado
        titulo="Base de conocimiento"
        texto="Objetivos, competencias, resultados y preguntas de cada unidad."
      />
      <label className="mb-4 block max-w-sm text-sm font-semibold">
        Buscar unidad
        <input
          className="input mt-1 font-normal"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
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
                    className="card block hover:border-primary"
                  >
                    <p className="font-semibold">{u.nombre}</p>
                    <p className="mt-1 text-sm text-muted">
                      {u.conteo.objetivos} objetivos · {u.conteo.genericas} genéricas ·{' '}
                      {u.conteo.especificas} específicas · {u.conteo.rae} RAE
                    </p>
                    {u.editado && <span className="chip mt-2">Editada</span>}
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </Estado>
    </>
  );
}
