'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Encabezado, Estado } from '@/components/ui';
import { api, useDatos } from '@/lib/api';
import { FormEncabezado } from './FormEncabezado';
import { pctPoa, SEMAFOROS, type ResumenPoa } from './tipos';

function Importar({ onListo }: { onListo: (msg: string) => Promise<void> }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const subir = async () => {
    if (!archivo) return;
    setOcupado(true);
    setError('');
    try {
      const f = new FormData();
      f.append('archivo', archivo);
      const r = await api<{ vigencia: number; actividades: number; reemplazado: boolean }>(
        '/poa/importar',
        'POST',
        f,
      );
      await onListo(
        `POA ${r.vigencia} ${r.reemplazado ? 'actualizado' : 'importado'}: ${r.actividades} actividades.`,
      );
      setArchivo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar.');
    } finally {
      setOcupado(false);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Sube el Excel del POA en el formato institucional F-PIN-001. Se leen la información básica y
        todas las actividades con sus meses, indicadores y presupuesto. Si el POA de esa vigencia ya
        existe y aún no tiene seguimiento, se reemplaza.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="input max-w-md"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <button
          className="btn btn-primary"
          disabled={!archivo || ocupado}
          onClick={() => void subir()}
        >
          {ocupado ? 'Importando…' : 'Importar'}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
    </div>
  );
}

export default function PaginaPoa() {
  const router = useRouter();
  const { datos, error, cargando, recargar } = useDatos<ResumenPoa[]>('/poa');
  const [aviso, setAviso] = useState('');

  const alternar = async (p: ResumenPoa) => {
    await api(`/poa/${p.id}`, 'PATCH', { activo: !p.activo });
    setAviso(`POA ${p.vigencia} ${p.activo ? 'inactivado' : 'activado'}.`);
    await recargar();
  };

  return (
    <>
      <Encabezado
        titulo="Plan Operativo Anual"
        texto="Planeación anual del programa en el formato F-PIN-001: actividades del PDI, indicadores, meses de ejecución, presupuesto y su seguimiento mensual."
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <details className="card">
          <summary className="cursor-pointer font-semibold">Importar Excel F-PIN-001</summary>
          <div className="mt-3">
            <Importar
              onListo={async (m) => {
                setAviso(m);
                await recargar();
              }}
            />
          </div>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-semibold">Nuevo POA</summary>
          <div className="mt-3">
            <FormEncabezado onListo={(id) => router.push(`/admin/poa/${id}`)} />
          </div>
        </details>
      </div>
      {aviso && (
        <p role="status" className="mb-3 text-sm text-muted">
          {aviso}
        </p>
      )}
      <Estado cargando={cargando && !datos} error={error}>
        {!datos?.length ? (
          <p className="card text-muted">No existen datos para esta sección.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Vigencia</th>
                  <th>Responsable</th>
                  <th>Actividades</th>
                  <th>Avance</th>
                  <th>Desempeño</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((p) => (
                  <tr key={p.id} className={p.activo ? '' : 'text-faint'}>
                    <td className="font-semibold">{p.vigencia}</td>
                    <td className="min-w-48">
                      {p.responsable}
                      <span className="block text-xs text-faint">{p.cargo}</span>
                    </td>
                    <td>{p.actividades}</td>
                    <td className="tabular-nums">{pctPoa(p.avance)}</td>
                    <td>
                      <span className={SEMAFOROS[p.semaforo].clase}>
                        {SEMAFOROS[p.semaforo].nombre} · {pctPoa(p.indice)}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${p.activo ? '' : 'chip-nivel lv1'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <span className="flex gap-2">
                        <Link className="btn btn-primary" href={`/admin/poa/${p.id}`}>
                          Abrir
                        </Link>
                        <button className="btn whitespace-nowrap" onClick={() => void alternar(p)}>
                          {p.activo ? 'Inactivar' : 'Activar'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </>
  );
}
