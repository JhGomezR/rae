-- Programador de clases (F-DOC-052): nuevo tipo de informe docente, ligado a un curso.
ALTER TYPE "TipoInformeDocente" ADD VALUE IF NOT EXISTS 'PROGRAMADOR';

ALTER TABLE "InformeDocente" ADD COLUMN "cursoId" INTEGER;

ALTER TABLE "InformeDocente" ADD CONSTRAINT "InformeDocente_cursoId_fkey"
  FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "InformeDocente_cursoId_idx" ON "InformeDocente"("cursoId");
