import { ACCIONES, LISTA_ACCIONES, type ComponentePermisos } from '@rae/shared';
import { Icono } from '@/components/Iconos';

/** Permisos de un rol por módulo: un icono por acción otorgada (ver, crear, editar, eliminar). */
export function ResumenPermisos({
  catalogo,
  permisos,
}: {
  catalogo: ComponentePermisos[];
  permisos: string[];
}) {
  const tiene = new Set(permisos);
  const modulos = catalogo
    .flatMap((c) => c.modulos)
    .map((m) => ({
      m,
      acciones: LISTA_ACCIONES.filter((a) => tiene.has(`${m.clave}.${a}`)),
      especiales: Object.entries(m.especiales ?? {}).filter(([p]) => tiene.has(p)),
    }))
    .filter((x) => x.acciones.length || x.especiales.length);
  if (!modulos.length) return <span className="text-faint">Sin permisos</span>;
  return (
    <dl className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
      {modulos.map(({ m, acciones, especiales }) => (
        <div key={m.clave} className="contents">
          <dt className="truncate font-semibold" title={m.descripcion}>
            {m.nombre}:
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5 text-muted">
            {acciones.map((a) => (
              <Icono key={a} nombre={a} titulo={`${ACCIONES[a]}: ${m.acciones[a] ?? ''}`} />
            ))}
            {especiales.map(([p, t]) => (
              <span key={p} className="chip text-[11px]">
                {t}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
