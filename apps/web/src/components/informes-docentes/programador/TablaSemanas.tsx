import type { SemanaProgramador } from '@rae/shared';

/** Semanas del programador como en el formato F-DOC-052 (lectura y resumen). */
export function TablaSemanas({ semanas }: { semanas: SemanaProgramador[] }) {
  if (!semanas.length) return <p className="text-muted">No existen datos para esta sección.</p>;
  return (
    <div className="tabla-wrap">
      <table className="tabla text-sm">
        <thead>
          <tr>
            <th rowSpan={2}>Semana</th>
            <th rowSpan={2}>Contenidos del syllabus</th>
            <th rowSpan={2}>Didácticas en aula</th>
            <th colSpan={2} className="text-center">
              Actividades / evidencias
            </th>
            <th rowSpan={2}>Recursos</th>
            <th rowSpan={2}>Observaciones</th>
          </tr>
          <tr>
            <th>Individuales</th>
            <th>Grupales</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((s) => (
            <tr key={s.semana} className="align-top">
              <td className="text-center font-semibold">{s.semana}</td>
              {(
                [
                  s.contenidos,
                  s.didacticas,
                  s.individuales,
                  s.grupales,
                  s.recursos,
                  s.observaciones,
                ] as string[]
              ).map((t, k) => (
                <td key={k} className="min-w-36 whitespace-pre-line">
                  {t || <span className="text-faint">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
