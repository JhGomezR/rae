-- Borrado lógico: se desactiva en lugar de eliminar, para no perder respuestas.
ALTER TABLE "UnidadFormacion" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CompetenciaUnidad" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Curso" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
