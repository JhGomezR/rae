-- Bitácora de sesiones: navegador y motivo de cada evento, y búsqueda por usuario.
ALTER TABLE "Auditoria" ADD COLUMN "detalle" VARCHAR(300);
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");
CREATE INDEX "Auditoria_accion_idx" ON "Auditoria"("accion");
