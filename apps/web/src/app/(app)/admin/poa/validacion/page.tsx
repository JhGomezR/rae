'use client';

import {
  ESTADOS_INFORME_DOCENTE,
  TIPOS_INFORME_DOCENTE,
  type TipoInformeDocente,
  VINCULACIONES,
  type EstadoInformeDocente,
  type Vinculacion,
} from '@rae/shared';
import Link from 'next/link';
import { useState } from 'react';
import { ChipEstado, fechaHora } from '@/components/informes-docentes/comun';
import { Encabezado, Estado, Kpi, Paginador } from '@/components/ui';
import { useDatos } from '@/lib/api';
import { Firmantes } from './Firmantes';

interface Fila {
  id: number;
  tipo: TipoInformeDocente;
  titulo: string;
  estado: EstadoInformeDocente;
  entregadoEn: string | null;
  periodo: { codigo: string };
  docente: { nombreCompleto: string; documento: string; vinculacion: Vinculacion | null };
}
interface Resumen {
  periodo: { id: number; codigo: string } | null;
  conteos: { tipo: string; estado: EstadoInformeDocente; total: number }[];
  pendientes: { id: number; nombreCompleto: string; documento: string; vinculacion: Vinculacion }[];
  sinVinculacion: number;
}
const TIPO = TIPOS_INFORME_DOCENTE;

export default function PaginaValidacion() {
  const periodos = useDatos<{ id: number; codigo: string; activo: boolean }[]>('/periodos');
  const [periodoId, setPeriodoId] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('ENTREGADO');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const resumen = useDatos<Resumen>(
    `/validacion-informes/resumen${periodoId ? `?periodoId=${periodoId}` : ''}`,
  );
  const params = new URLSearchParams({
    pagina: String(pagina),
    ...(tipo ? { tipo } : {}),
    ...(estado ? { estado } : {}),
    ...(q ? { q } : {}),
    ...(periodoId ? { periodoId } : {}),
  });
  const lista = useDatos<{ datos: Fila[]; total: number; tamano: number }>(
    `/validacion-informes?${params}`,
  );
  const cuenta = (e: EstadoInformeDocente) =>
    resumen.datos?.conteos.filter((c) => c.estado === e).reduce((s, c) => s + c.total, 0) ?? 0;
  const filtro = (f: () => void) => {
    f();
    setPagina(1);
  };

  return (
    <>
      <Encabezado
        titulo="Validación de informes"
        texto="Revisa las agendas e informes de hora cátedra entregados: apruébalos o pide ajustes. Mientras están en revisión, el docente no puede modificarlos."
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Por revisar"
          valor={String(cuenta('ENTREGADO'))}
          nota={resumen.datos?.periodo ? `Periodo ${resumen.datos.periodo.codigo}` : undefined}
        />
        <Kpi titulo="Con ajustes pendientes" valor={String(cuenta('AJUSTES'))} />
        <Kpi titulo="Aprobados" valor={String(cuenta('APROBADO'))} />
        <Kpi
          titulo="Docentes sin entregar"
          valor={String(resumen.datos?.pendientes.length ?? 0)}
          nota={
            resumen.datos?.sinVinculacion
              ? `${resumen.datos.sinVinculacion} docentes sin vinculación definida`
              : undefined
          }
        />
      </div>
      {resumen.datos &&
        (resumen.datos.pendientes.length > 0 || resumen.datos.sinVinculacion > 0) && (
          <details className="card mb-4">
            <summary className="cursor-pointer font-semibold">
              Docentes que no han entregado ({resumen.datos.pendientes.length})
            </summary>
            {resumen.datos.sinVinculacion > 0 && (
              <p className="mt-2 text-sm text-muted">
                Hay {resumen.datos.sinVinculacion} docentes sin vinculación: defínela en{' '}
                <Link className="font-semibold text-primary underline" href="/admin/usuarios">
                  Usuarios
                </Link>{' '}
                para que vean su informe.
              </p>
            )}
            <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {resumen.datos.pendientes.map((p) => (
                <li key={p.id}>
                  {p.nombreCompleto}{' '}
                  <span className="text-faint">· {VINCULACIONES[p.vinculacion]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-xs">
          Buscar docente o informe
          <input
            className="input mt-1 font-normal"
            value={q}
            onChange={(e) => filtro(() => setQ(e.target.value))}
          />
        </label>
        <label className="text-sm font-semibold">
          Periodo
          <select
            className="input mt-1 font-normal"
            value={periodoId}
            onChange={(e) => filtro(() => setPeriodoId(e.target.value))}
          >
            <option value="">Activo / todos</option>
            {periodos.datos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Tipo
          <select
            className="input mt-1 font-normal"
            value={tipo}
            onChange={(e) => filtro(() => setTipo(e.target.value))}
          >
            <option value="">Todos</option>
            <option value="AGENDA">Agenda</option>
            <option value="EJECUCION">Ejecución de la agenda</option>
            <option value="CATEDRA">H. Cátedra</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Estado
          <select
            className="input mt-1 font-normal"
            value={estado}
            onChange={(e) => filtro(() => setEstado(e.target.value))}
          >
            <option value="">Entregados, ajustes y aprobados</option>
            {(['ENTREGADO', 'AJUSTES', 'APROBADO', 'BORRADOR'] as EstadoInformeDocente[]).map(
              (k) => (
                <option key={k} value={k}>
                  {ESTADOS_INFORME_DOCENTE[k]}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <Estado cargando={lista.cargando && !lista.datos} error={lista.error}>
        {!lista.datos?.datos.length ? (
          <p className="card text-muted">No existen datos para esta sección.</p>
        ) : (
          <>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Docente</th>
                    <th>Tipo</th>
                    <th>Informe</th>
                    <th>Periodo</th>
                    <th>Estado</th>
                    <th>Entregado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.datos.datos.map((i) => (
                    <tr key={i.id}>
                      <td className="min-w-52">
                        {i.docente.nombreCompleto}
                        <span className="block text-xs text-faint">
                          {i.docente.documento}
                          {i.docente.vinculacion
                            ? ` · ${VINCULACIONES[i.docente.vinculacion]}`
                            : ''}
                        </span>
                      </td>
                      <td>{TIPO[i.tipo]}</td>
                      <td className="min-w-48">{i.titulo}</td>
                      <td>{i.periodo.codigo}</td>
                      <td>
                        <ChipEstado estado={i.estado} />
                      </td>
                      <td className="whitespace-nowrap">{fechaHora(i.entregadoEn)}</td>
                      <td>
                        <Link className="btn btn-primary" href={`/admin/poa/validacion/${i.id}`}>
                          {i.estado === 'ENTREGADO' ? 'Revisar' : 'Ver'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador
              pagina={pagina}
              tamano={lista.datos.tamano}
              total={lista.datos.total}
              onCambio={setPagina}
            />
          </>
        )}
      </Estado>
      <div className="mt-6">
        <Firmantes />
      </div>
    </>
  );
}
