-- Plan Operativo Anual (formato F-PIN-001): plan por vigencia, actividades y seguimiento mensual.
-- CreateEnum
CREATE TYPE "TipoIndicadorPoa" AS ENUM ('EFICIENCIA', 'CALIDAD', 'GESTION', 'IMPACTO', 'LOGRO');

-- CreateTable
CREATE TABLE "Poa" (
    "id" SERIAL NOT NULL,
    "vigencia" INTEGER NOT NULL,
    "fechaElaboracion" DATE NOT NULL,
    "dependencia" VARCHAR(300) NOT NULL,
    "areaFacultad" VARCHAR(150) NOT NULL,
    "responsable" VARCHAR(150) NOT NULL,
    "cargo" VARCHAR(150) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoaActividad" (
    "id" SERIAL NOT NULL,
    "poaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "ejePgr" VARCHAR(300) NOT NULL,
    "ejePdi" VARCHAR(500) NOT NULL,
    "programaPdi" VARCHAR(300) NOT NULL,
    "subprograma" VARCHAR(300) NOT NULL,
    "proyecto" VARCHAR(1000) NOT NULL,
    "metaVigencia" DECIMAL(12,2),
    "indicadorPdi" VARCHAR(500) NOT NULL,
    "actividad" VARCHAR(2000) NOT NULL,
    "tipoIndicador" "TipoIndicadorPoa",
    "indicadorActividad" VARCHAR(1000) NOT NULL,
    "interpretacion" VARCHAR(1000),
    "responsableEjecucion" VARCHAR(300) NOT NULL,
    "meses" INTEGER[],
    "presupuesto" DECIMAL(16,2),
    "observaciones" VARCHAR(2000),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoaActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoaSeguimiento" (
    "id" SERIAL NOT NULL,
    "actividadId" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "avance" INTEGER NOT NULL,
    "logro" VARCHAR(2000) NOT NULL,
    "evidencia" VARCHAR(500),
    "ejecutado" DECIMAL(16,2),
    "usuarioId" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoaSeguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poa_vigencia_key" ON "Poa"("vigencia");

-- CreateIndex
CREATE INDEX "PoaActividad_poaId_orden_idx" ON "PoaActividad"("poaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "PoaSeguimiento_actividadId_mes_key" ON "PoaSeguimiento"("actividadId", "mes");

-- AddForeignKey
ALTER TABLE "PoaActividad" ADD CONSTRAINT "PoaActividad_poaId_fkey" FOREIGN KEY ("poaId") REFERENCES "Poa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoaSeguimiento" ADD CONSTRAINT "PoaSeguimiento_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "PoaActividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: sin acceso desde la API pública.
ALTER TABLE "Poa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoaActividad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoaSeguimiento" ENABLE ROW LEVEL SECURITY;
