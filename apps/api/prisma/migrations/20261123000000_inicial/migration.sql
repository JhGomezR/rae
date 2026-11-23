-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'DOCENTE', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "Momento" AS ENUM ('APRECIACION', 'ALCANCE');

-- CreateEnum
CREATE TYPE "EstadoEncuesta" AS ENUM ('BORRADOR', 'ENVIADA');

-- CreateEnum
CREATE TYPE "TipoCompetencia" AS ENUM ('GENERICA', 'ESPECIFICA');

-- CreateEnum
CREATE TYPE "Seccion" AS ENUM ('OBJETIVO', 'GENERICA', 'ESPECIFICA', 'RAE');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('OBJETIVO', 'RA', 'COMPETENCIA', 'RAE');

-- CreateEnum
CREATE TYPE "NivelPregunta" AS ENUM ('ESTUDIANTE', 'DOCENTE');

-- CreateEnum
CREATE TYPE "Ciclo" AS ENUM ('TECNOLOGICO', 'PROFESIONAL');

-- CreateEnum
CREATE TYPE "TipoEstrategia" AS ENUM ('DIDACTICA', 'ACTIVA');

-- CreateEnum
CREATE TYPE "EstadoRecomendacion" AS ENUM ('APLICADA', 'PARCIAL', 'NO_APLICADA');

-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('PREVISUALIZADA', 'APLICADA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('AVISO_APERTURA', 'RECORDATORIO');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "documento" VARCHAR(20) NOT NULL,
    "nombreCompleto" VARCHAR(150) NOT NULL,
    "primerApellido" VARCHAR(60) NOT NULL,
    "primerNombre" VARCHAR(60) NOT NULL,
    "rol" "Rol" NOT NULL,
    "email" VARCHAR(150),
    "passwordHash" VARCHAR(255) NOT NULL,
    "debeCambiarClave" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoIngreso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "documento" VARCHAR(20) NOT NULL,
    "total" INTEGER NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("documento")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" VARCHAR(60) NOT NULL,
    "valor" VARCHAR(200) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "ciclo" "Ciclo" NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "anio" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "apreciacionAbierta" BOOLEAN NOT NULL DEFAULT false,
    "alcanceAbierto" BOOLEAN NOT NULL DEFAULT false,
    "apreciacionCierra" TIMESTAMP(3),
    "alcanceCierra" TIMESTAMP(3),

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadFormacion" (
    "id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "nombreClave" VARCHAR(150) NOT NULL,
    "semestre" INTEGER NOT NULL,
    "ciclo" "Ciclo" NOT NULL,
    "archivosSyllabus" JSONB NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnidadFormacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AliasUnidad" (
    "id" SERIAL NOT NULL,
    "alias" VARCHAR(150) NOT NULL,
    "unidadId" INTEGER NOT NULL,

    CONSTRAINT "AliasUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetenciaUnidad" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "codigo" VARCHAR(5),
    "tipo" "TipoCompetencia" NOT NULL,
    "texto" TEXT NOT NULL,
    "tituloCorto" VARCHAR(200) NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "CompetenciaUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEvaluable" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "seccion" "Seccion" NOT NULL,
    "tipo" "TipoItem" NOT NULL,
    "competenciaUnidadId" INTEGER,
    "texto" TEXT NOT NULL,
    "capacidad" VARCHAR(500) NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemEvaluable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreguntaPractica" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "nivel" "NivelPregunta" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "opciones" JSONB NOT NULL,
    "indiceCorrecta" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PreguntaPractica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "sedeId" INTEGER NOT NULL,
    "programaId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "grupo" VARCHAR(5) NOT NULL,
    "semestreOferta" INTEGER NOT NULL,
    "docenteId" INTEGER NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "semestreEstudiante" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encuesta" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "rol" "Rol" NOT NULL,
    "momento" "Momento" NOT NULL,
    "estado" "EstadoEncuesta" NOT NULL DEFAULT 'BORRADOR',
    "general" JSONB NOT NULL,
    "enviadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespuestaItem" (
    "id" SERIAL NOT NULL,
    "encuestaId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "nivel" SMALLINT,
    "evaluados" INTEGER,
    "alcanzan" INTEGER,
    "evidencia" VARCHAR(500),
    "instrumento" VARCHAR(60),
    "preguntaPracticaId" INTEGER,
    "opcionElegida" INTEGER,
    "acierto" BOOLEAN,
    "textoItem" TEXT,
    "enunciadoPregunta" TEXT,
    "textoRespuesta" TEXT,

    CONSTRAINT "RespuestaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstrategiaPedagogica" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoEstrategia" NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "EstrategiaPedagogica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuestaEstrategia" (
    "encuestaId" INTEGER NOT NULL,
    "estrategiaId" INTEGER NOT NULL,

    CONSTRAINT "EncuestaEstrategia_pkey" PRIMARY KEY ("encuestaId","estrategiaId")
);

-- CreateTable
CREATE TABLE "Recomendacion" (
    "id" SERIAL NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoRecomendacion" (
    "id" SERIAL NOT NULL,
    "recomendacionId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "estado" "EstadoRecomendacion" NOT NULL,

    CONSTRAINT "SeguimientoRecomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaracteristicaPlan" (
    "id" SERIAL NOT NULL,
    "numeros" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "aspecto" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "CaracteristicaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Importacion" (
    "id" SERIAL NOT NULL,
    "archivo" VARCHAR(200) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'PREVISUALIZADA',
    "resumen" JSONB NOT NULL,
    "errores" JSONB NOT NULL,
    "filas" JSONB,

    CONSTRAINT "Importacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacionOutbox" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "asunto" VARCHAR(200) NOT NULL,
    "cuerpoHtml" TEXT NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "enviarDespuesDe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEn" TIMESTAMP(3),
    "error" VARCHAR(500),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" INTEGER,
    "accion" VARCHAR(120) NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidadId" VARCHAR(40),
    "ip" VARCHAR(60),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_documento_key" ON "Usuario"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Sede_codigo_key" ON "Sede"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_nombre_key" ON "Programa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_codigo_key" ON "Periodo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadFormacion_nombreClave_key" ON "UnidadFormacion"("nombreClave");

-- CreateIndex
CREATE UNIQUE INDEX "AliasUnidad_alias_key" ON "AliasUnidad"("alias");

-- CreateIndex
CREATE INDEX "CompetenciaUnidad_codigo_idx" ON "CompetenciaUnidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CompetenciaUnidad_unidadId_clave_key" ON "CompetenciaUnidad"("unidadId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "ItemEvaluable_unidadId_clave_key" ON "ItemEvaluable"("unidadId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "PreguntaPractica_itemId_nivel_key" ON "PreguntaPractica"("itemId", "nivel");

-- CreateIndex
CREATE INDEX "Curso_docenteId_periodoId_idx" ON "Curso"("docenteId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_periodoId_sedeId_programaId_unidadId_grupo_docenteId_key" ON "Curso"("periodoId", "sedeId", "programaId", "unidadId", "grupo", "docenteId");

-- CreateIndex
CREATE INDEX "Inscripcion_estudianteId_idx" ON "Inscripcion"("estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_cursoId_estudianteId_key" ON "Inscripcion"("cursoId", "estudianteId");

-- CreateIndex
CREATE INDEX "Encuesta_periodoId_momento_rol_estado_idx" ON "Encuesta"("periodoId", "momento", "rol", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Encuesta_cursoId_usuarioId_momento_key" ON "Encuesta"("cursoId", "usuarioId", "momento");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaItem_encuestaId_itemId_key" ON "RespuestaItem"("encuestaId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EstrategiaPedagogica_nombre_key" ON "EstrategiaPedagogica"("nombre");

-- CreateIndex
CREATE INDEX "Recomendacion_periodoId_unidadId_idx" ON "Recomendacion"("periodoId", "unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "SeguimientoRecomendacion_recomendacionId_cursoId_key" ON "SeguimientoRecomendacion"("recomendacionId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "CaracteristicaPlan_numeros_key" ON "CaracteristicaPlan"("numeros");

-- CreateIndex
CREATE INDEX "NotificacionOutbox_estado_enviarDespuesDe_idx" ON "NotificacionOutbox"("estado", "enviarDespuesDe");

-- CreateIndex
CREATE INDEX "NotificacionOutbox_usuarioId_tipo_creadaEn_idx" ON "NotificacionOutbox"("usuarioId", "tipo", "creadaEn");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Auditoria_creadaEn_idx" ON "Auditoria"("creadaEn");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasUnidad" ADD CONSTRAINT "AliasUnidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadFormacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenciaUnidad" ADD CONSTRAINT "CompetenciaUnidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadFormacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEvaluable" ADD CONSTRAINT "ItemEvaluable_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadFormacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEvaluable" ADD CONSTRAINT "ItemEvaluable_competenciaUnidadId_fkey" FOREIGN KEY ("competenciaUnidadId") REFERENCES "CompetenciaUnidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaPractica" ADD CONSTRAINT "PreguntaPractica_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemEvaluable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadFormacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuesta" ADD CONSTRAINT "Encuesta_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuesta" ADD CONSTRAINT "Encuesta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuesta" ADD CONSTRAINT "Encuesta_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaItem" ADD CONSTRAINT "RespuestaItem_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "Encuesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaItem" ADD CONSTRAINT "RespuestaItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemEvaluable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuestaEstrategia" ADD CONSTRAINT "EncuestaEstrategia_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "Encuesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuestaEstrategia" ADD CONSTRAINT "EncuestaEstrategia_estrategiaId_fkey" FOREIGN KEY ("estrategiaId") REFERENCES "EstrategiaPedagogica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacion" ADD CONSTRAINT "Recomendacion_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacion" ADD CONSTRAINT "Recomendacion_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadFormacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacion" ADD CONSTRAINT "Recomendacion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoRecomendacion" ADD CONSTRAINT "SeguimientoRecomendacion_recomendacionId_fkey" FOREIGN KEY ("recomendacionId") REFERENCES "Recomendacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoRecomendacion" ADD CONSTRAINT "SeguimientoRecomendacion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionOutbox" ADD CONSTRAINT "NotificacionOutbox_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase publica el esquema public por su API: las tablas solo se usan desde el servidor.
DO $$
DECLARE t record; r text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
    END IF;
  END LOOP;
END $$;
