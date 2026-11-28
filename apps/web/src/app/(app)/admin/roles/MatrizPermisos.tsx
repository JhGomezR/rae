'use client';

import {
  ACCIONES,
  LISTA_ACCIONES,
  permisosDeModulo,
  type ComponentePermisos,
  type ModuloPermisos,
} from '@rae/shared';
import { useEffect, useRef } from 'react';
import { Icono } from '@/components/Iconos';

/** Casilla con estado intermedio (algunos marcados). */
function Casilla({
  marcada,
  parcial = false,
  deshabilitada,
  etiqueta,
  onCambio,
}: {
  marcada: boolean;
  parcial?: boolean;
  deshabilitada?: boolean;
  etiqueta: string;
  onCambio: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = parcial && !marcada;
  }, [parcial, marcada]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-[18px] cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
      checked={marcada}
      disabled={deshabilitada}
      aria-label={etiqueta}
      title={etiqueta}
      onChange={onCambio}
    />
  );
}

/**
 * Matriz de permisos: módulos por componente y las acciones Ver, Crear, Editar y Eliminar.
 * Marcar crear, editar o eliminar marca también ver; quitar ver quita las demás del módulo.
 * Solo se puede otorgar lo que uno mismo tiene (`propios`).
 */
export function MatrizPermisos({
  catalogo,
  valor,
  propios,
  onCambio,
}: {
  catalogo: ComponentePermisos[];
  valor: Set<string>;
  propios: Set<string>;
  onCambio: (v: Set<string>) => void;
}) {
  const todos = catalogo.flatMap((c) => c.modulos.flatMap(permisosDeModulo));
  const otorgables = todos.filter((p) => propios.has(p));
  const conjunto = (cambio: (n: Set<string>) => void) => {
    const n = new Set(valor);
    cambio(n);
    onCambio(n);
  };
  const deModulo = (m: ModuloPermisos) => permisosDeModulo(m).filter((p) => propios.has(p));

  const alternar = (m: ModuloPermisos, p: string) =>
    conjunto((n) => {
      const ver = `${m.clave}.ver`;
      if (n.has(p)) {
        n.delete(p);
        // Sin «ver» no tiene sentido lo demás del módulo.
        if (p === ver) permisosDeModulo(m).forEach((x) => n.delete(x));
      } else {
        n.add(p);
        if (p !== ver && m.acciones.ver && propios.has(ver)) n.add(ver);
      }
    });
  const fila = (m: ModuloPermisos) =>
    conjunto((n) => {
      const ps = deModulo(m);
      const llena = ps.every((p) => n.has(p));
      ps.forEach((p) => (llena ? n.delete(p) : n.add(p)));
    });
  const llenaTodo = otorgables.length > 0 && otorgables.every((p) => valor.has(p));

  return (
    <div className="tabla-wrap">
      <table className="tabla text-sm">
        <thead>
          <tr>
            <th className="min-w-64">Módulo</th>
            <th className="text-center">
              <span className="inline-flex items-center gap-2">
                Todos
                <Casilla
                  etiqueta="Marcar todos los permisos"
                  marcada={llenaTodo}
                  parcial={valor.size > 0}
                  deshabilitada={!otorgables.length}
                  onCambio={() => onCambio(new Set(llenaTodo ? [] : otorgables))}
                />
              </span>
            </th>
            {LISTA_ACCIONES.map((a) => (
              <th key={a} className="text-center">
                {ACCIONES[a]}
              </th>
            ))}
            <th>Especiales</th>
          </tr>
        </thead>
        {catalogo.map((c) => (
          <tbody key={c.componente}>
            <tr>
              <th
                colSpan={3 + LISTA_ACCIONES.length}
                className="bg-surface-2 text-xs tracking-wide text-faint uppercase"
              >
                {c.componente}
              </th>
            </tr>
            {c.modulos.map((m) => {
              const ps = permisosDeModulo(m);
              const marcados = ps.filter((p) => valor.has(p)).length;
              const propiosModulo = deModulo(m);
              return (
                <tr key={m.clave}>
                  <td>
                    <span className="flex items-start gap-3">
                      <Icono nombre={m.icono} className="mt-0.5 size-5 text-primary" />
                      <span>
                        <span className="block font-semibold">{m.nombre}</span>
                        <span className="block text-xs text-faint">{m.descripcion}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-center">
                    <Casilla
                      etiqueta={`Todos los permisos de ${m.nombre}`}
                      marcada={marcados === ps.length}
                      parcial={marcados > 0}
                      deshabilitada={!propiosModulo.length}
                      onCambio={() => fila(m)}
                    />
                  </td>
                  {LISTA_ACCIONES.map((a) => {
                    const p = `${m.clave}.${a}`;
                    const texto = m.acciones[a];
                    return (
                      <td key={a} className="text-center">
                        {texto ? (
                          <Casilla
                            etiqueta={`${m.nombre}: ${texto}${propios.has(p) ? '' : ' (no puedes otorgarlo)'}`}
                            marcada={valor.has(p)}
                            deshabilitada={!propios.has(p)}
                            onCambio={() => alternar(m, p)}
                          />
                        ) : (
                          <span className="text-faint" aria-label="No aplica">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    {m.especiales ? (
                      <span className="flex flex-col gap-1">
                        {Object.entries(m.especiales).map(([p, texto]) => (
                          <label
                            key={p}
                            className={`flex items-center gap-2 text-xs whitespace-nowrap ${propios.has(p) ? '' : 'text-faint'}`}
                          >
                            <Casilla
                              etiqueta={`${m.nombre}: ${texto}`}
                              marcada={valor.has(p)}
                              deshabilitada={!propios.has(p)}
                              onCambio={() => alternar(m, p)}
                            />
                            {texto}
                          </label>
                        ))}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
