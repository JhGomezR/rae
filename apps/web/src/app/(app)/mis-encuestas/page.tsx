'use client';

import Link from 'next/link';
import { Encabezado, Estado, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface EstadoMomento {
  abierto: boolean;
  estado: 'PENDIENTE' | 'BORRADOR' | 'ENVIADA';
}
interface Curso {
  id: number;
  periodo: string;
  unidad: string;
  semestre: number;
  grupo: string;
  sede: string;
  docente: string;
  apreciacion: EstadoMomento;
  alcance: EstadoMomento;
}

function Momento({
  curso,
  clave,
  nombre,
}: {
  curso: Curso;
  clave: 'apreciacion' | 'alcance';
  nombre: string;
}) {
  const m = curso[clave];
  const enviada = m.estado === 'ENVIADA';
  const etiqueta = enviada
    ? 'Enviada'
    : !m.abierto
      ? 'Cerrada'
      : m.estado === 'BORRADOR'
        ? 'En borrador'
        : 'Pendiente';
  const accion = m.abierto
    ? enviada
      ? 'Revisar'
      : m.estado === 'BORRADOR'
        ? 'Continuar'
        : 'Responder'
    : enviada
      ? 'Ver'
      : null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-3">
      <div>
        <p className="text-sm font-semibold">{nombre}</p>
        <p className="text-sm text-muted">{etiqueta}</p>
      </div>
      {accion && (
        <Link
          className={`btn ${m.abierto && !enviada ? 'btn-primary' : ''}`}
          href={`/encuesta/${curso.id}/${clave}`}
        >
          {accion}
        </Link>
      )}
    </div>
  );
}

export default function MisEncuestasPage() {
  const { datos, error, cargando } = useDatos<Curso[]>('/mis-cursos');
  return (
    <>
      <Encabezado
        titulo="Mis encuestas"
        texto="Responde por cada unidad de formación que tienes asignada."
      />
      <Estado cargando={cargando} error={error}>
        {datos?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {datos.map((c) => (
              <article key={c.id} className="card flex flex-col gap-3">
                <div>
                  <h3>{c.unidad}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Semestre {c.semestre} · Grupo {c.grupo} · {c.sede}
                  </p>
                  <p className="text-sm text-faint">{c.docente}</p>
                </div>
                <Momento curso={c} clave="apreciacion" nombre="Apreciación" />
                <Momento curso={c} clave="alcance" nombre="Alcance" />
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <SinDatos />
          </div>
        )}
      </Estado>
    </>
  );
}
