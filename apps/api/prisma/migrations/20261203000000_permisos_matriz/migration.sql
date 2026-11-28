-- Permisos como matriz módulo × acción (ver, crear, editar, eliminar).
-- Convierte los permisos anteriores de cada rol a sus equivalentes, sin quitar acceso.
CREATE TEMP TABLE "_equivalencias" (antes TEXT, despues TEXT[]);
INSERT INTO "_equivalencias" VALUES
  ('resultados.ver', ARRAY['resultados.ver']),
  ('informes.gestionar', ARRAY['informes.ver', 'informes.editar']),
  ('curriculo.gestionar', ARRAY['curriculo.ver', 'curriculo.crear', 'curriculo.editar']),
  ('periodos.gestionar', ARRAY['periodos.ver', 'periodos.crear', 'periodos.editar']),
  ('cursos.gestionar', ARRAY['cursos.ver', 'cursos.crear', 'cursos.editar']),
  ('consolidado.importar', ARRAY['consolidado.ver', 'consolidado.crear']),
  ('poa.gestionar', ARRAY['poa.ver', 'poa.crear', 'poa.editar', 'poa.eliminar']),
  ('docentes.validar', ARRAY['validacion.ver', 'validacion.editar']),
  ('roles.gestionar', ARRAY['roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar']),
  ('correos.gestionar', ARRAY['correos.ver', 'correos.crear']);

UPDATE "RolSistema" r
SET "permisos" = COALESCE(
  (
    SELECT array_agg(DISTINCT n ORDER BY n)
    FROM unnest(r."permisos") AS p
    LEFT JOIN "_equivalencias" e ON e.antes = p
    CROSS JOIN LATERAL unnest(COALESCE(e.despues, ARRAY[p])) AS n
  ),
  '{}'
);

DROP TABLE "_equivalencias";
