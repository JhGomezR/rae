'use client';

import { useEffect, useState } from 'react';
import { Encabezado, Estado, Kpi, SinDatos } from '@/components/ui';
import { descargar, useDatos } from '@/lib/api';
import { BloqueInforme } from './BloqueInforme';
import { EditorInforme } from './EditorInforme';
import { FirmaInforme } from './FirmaInforme';
import type { Configuracion, Informe } from './tipos';

interface Periodo {
  id: number;
  codigo: string;
  activo: boolean;
}
interface Listado {
  periodo: { id: number; codigo: string } | null;
  informes: Informe[];
}

const NOMBRES: Record<Informe['clave'], string> = {
  '021': '021 · Integralidad, flexibilidad e interdisciplinariedad',
  '022': '022 · Estrategias pedagógicas',
  '023': '023 · RA y competencias',
};
const ARCHIVOS: Record<Informe['clave'], string> = {
  '021': '021 - Integralidad, Flexibilidad e Interdisciplinariedad',
  '022': '022 - Evaluación estrategias pedagógicas',
  '023': '023 - RA y Competencias',
};

export default function InformesPage() {
  const { datos: periodos } = useDatos<Periodo[]>('/periodos');
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const q = periodoId ? `?periodoId=${periodoId}` : '';
  const { datos, error, cargando, setDatos } = useDatos<Listado>(`/informes${q}`);
  const { datos: config, setDatos: setConfig } = useDatos<Configuracion>('/informes/configuracion');
  const [clave, setClave] = useState<Informe['clave']>('021');
  const [conFirma, setConFirma] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!config?.tieneFirma) setConFirma(false);
  }, [config?.tieneFirma]);

  const informe = datos?.informes.find((i) => i.clave === clave);

  const bajar = async (formato: 'docx' | 'pdf') => {
    if (!informe || !datos?.periodo) return;
    setAviso(`Generando ${formato === 'docx' ? 'Word' : 'PDF'}…`);
    try {
      await descargar(
        `/informes/${clave}/descargar?formato=${formato}&firma=${conFirma ? 1 : 0}&periodoId=${datos.periodo.id}`,
        `${ARCHIVOS[clave]} - ${informe.periodo}.${formato}`,
      );
      setAviso('');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo generar el archivo.');
    }
  };

  return (
    <>
      <Encabezado
        titulo="Informes"
        texto="Formatos del plan de mejoramiento, diligenciados con los resultados de cada periodo."
      >
        <label className="text-sm font-semibold">
          Periodo
          <select
            className="input mt-1 font-normal"
            value={periodoId ?? datos?.periodo?.id ?? ''}
            onChange={(e) => setPeriodoId(Number(e.target.value))}
          >
            {periodos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo}
                {p.activo ? ' (activo)' : ''}
              </option>
            ))}
          </select>
        </label>
      </Encabezado>
      <Estado cargando={cargando && !datos} error={error}>
        {!datos?.periodo || !informe ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <div className="space-y-5">
            <div role="tablist" aria-label="Informes" className="flex flex-wrap gap-2">
              {datos.informes.map((i) => (
                <button
                  key={i.clave}
                  role="tab"
                  aria-selected={i.clave === clave}
                  className={`btn ${i.clave === clave ? 'btn-primary' : ''}`}
                  onClick={() => setClave(i.clave)}
                >
                  {NOMBRES[i.clave]}
                </button>
              ))}
            </div>

            <section className="card flex flex-wrap items-center gap-3">
              <div className="mr-auto min-w-0">
                <h2>Descargar informe</h2>
                <p className="text-sm text-muted">
                  {informe.porcentaje}% de terminación · Fecha {informe.fechaEntrega}
                </p>
              </div>
              <label
                className={`flex items-center gap-2 text-sm ${config?.tieneFirma ? '' : 'text-faint'}`}
              >
                <input
                  type="checkbox"
                  disabled={!config?.tieneFirma}
                  checked={conFirma}
                  onChange={(e) => setConFirma(e.target.checked)}
                />
                Incluir firma
              </label>
              <button className="btn btn-primary" onClick={() => void bajar('docx')}>
                Descargar Word
              </button>
              <button className="btn" onClick={() => void bajar('pdf')}>
                Descargar PDF
              </button>
              {aviso && (
                <p role="status" className="w-full text-sm text-muted">
                  {aviso}
                </p>
              )}
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {informe.kpis.map((k) => (
                <Kpi key={k.titulo} titulo={k.titulo} valor={k.valor} nota={k.nota} />
              ))}
            </div>

            <section className="card space-y-5">
              <div>
                <p className="text-sm font-semibold text-primary">{informe.caracteristicas}</p>
                <h2 className="mt-1">Estadísticas del informe</h2>
              </div>
              {informe.bloques.map((b, n) => (
                <BloqueInforme key={n} b={b} />
              ))}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="card">
                <h2 className="mb-2">Logros</h2>
                <ul className="list-disc space-y-1 pl-5">
                  {informe.logros.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
              <section className="card">
                <h2 className="mb-2">Impactos</h2>
                <ul className="list-disc space-y-1 pl-5">
                  {informe.impactos.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            </div>

            <EditorInforme
              key={`${informe.clave}-${informe.periodo}`}
              informe={informe}
              periodoId={datos.periodo.id}
              onGuardado={(n) =>
                setDatos({
                  ...datos,
                  informes: datos.informes.map((i) => (i.clave === n.clave ? n : i)),
                })
              }
            />
            {config && <FirmaInforme config={config} onCambio={setConfig} />}
          </div>
        )}
      </Estado>
    </>
  );
}
