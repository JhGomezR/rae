-- Roles con permisos (RBAC) y rol asignado a cada usuario.
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "rolSistemaId" INTEGER;

-- CreateTable
CREATE TABLE "RolSistema" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(300),
    "base" "Rol" NOT NULL,
    "permisos" TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RolSistema_clave_key" ON "RolSistema"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "RolSistema_nombre_key" ON "RolSistema"("nombre");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolSistemaId_fkey" FOREIGN KEY ("rolSistemaId") REFERENCES "RolSistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Roles fijos del sistema. El administrador siempre tiene todos los permisos (se resuelve en el código).
INSERT INTO "RolSistema" ("clave", "nombre", "descripcion", "base", "permisos", "sistema", "actualizadoEn") VALUES
  ('ADMINISTRADOR', 'Administrador', 'Acceso total a la administración.', 'ADMIN', ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP),
  ('DOCENTE', 'Docente', 'Encuestas e informes docentes de sus cursos.', 'DOCENTE', ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP),
  ('ESTUDIANTE', 'Estudiante', 'Encuestas de sus cursos.', 'ESTUDIANTE', ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP)
ON CONFLICT ("clave") DO NOTHING;

-- Supabase: sin acceso desde la API pública.
ALTER TABLE "RolSistema" ENABLE ROW LEVEL SECURITY;
