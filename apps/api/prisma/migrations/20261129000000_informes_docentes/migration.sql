-- Informes docentes: agenda (F-DOC-056) e informe de hora cátedra (F-DOC-047) con entrega y validación.
-- CreateEnum
CREATE TYPE "VinculacionDocente" AS ENUM ('PLANTA', 'OCASIONAL', 'PROVISIONAL', 'CATEDRA');

-- CreateEnum
CREATE TYPE "TipoInformeDocente" AS ENUM ('AGENDA', 'CATEDRA');

-- CreateEnum
CREATE TYPE "EstadoInformeDocente" AS ENUM ('BORRADOR', 'ENTREGADO', 'AJUSTES', 'APROBADO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "vinculacion" "VinculacionDocente";

-- CreateTable
CREATE TABLE "InformeDocente" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoInformeDocente" NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "estado" "EstadoInformeDocente" NOT NULL DEFAULT 'BORRADOR',
    "datos" JSONB NOT NULL,
    "observacion" VARCHAR(3000),
    "entregadoEn" TIMESTAMP(3),
    "revisadoEn" TIMESTAMP(3),
    "revisorId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformeDocente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InformeDocenteEvento" (
    "id" SERIAL NOT NULL,
    "informeId" INTEGER NOT NULL,
    "accion" VARCHAR(20) NOT NULL,
    "usuarioId" INTEGER,
    "comentario" VARCHAR(3000),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InformeDocenteEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InformeDocente_docenteId_tipo_idx" ON "InformeDocente"("docenteId", "tipo");

-- CreateIndex
CREATE INDEX "InformeDocente_estado_tipo_idx" ON "InformeDocente"("estado", "tipo");

-- CreateIndex
CREATE INDEX "InformeDocente_periodoId_idx" ON "InformeDocente"("periodoId");

-- CreateIndex
CREATE INDEX "InformeDocenteEvento_informeId_idx" ON "InformeDocenteEvento"("informeId");

-- AddForeignKey
ALTER TABLE "InformeDocente" ADD CONSTRAINT "InformeDocente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformeDocente" ADD CONSTRAINT "InformeDocente_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformeDocente" ADD CONSTRAINT "InformeDocente_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformeDocenteEvento" ADD CONSTRAINT "InformeDocenteEvento_informeId_fkey" FOREIGN KEY ("informeId") REFERENCES "InformeDocente"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: sin acceso desde la API pública.
ALTER TABLE "InformeDocente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InformeDocenteEvento" ENABLE ROW LEVEL SECURITY;
