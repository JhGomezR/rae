-- CreateTable
CREATE TABLE "InformeAjuste" (
    "periodoId" INTEGER NOT NULL,
    "clave" VARCHAR(3) NOT NULL,
    "datos" JSONB NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformeAjuste_pkey" PRIMARY KEY ("periodoId","clave")
);

-- CreateTable
CREATE TABLE "ArchivoSistema" (
    "clave" VARCHAR(60) NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "datos" BYTEA NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivoSistema_pkey" PRIMARY KEY ("clave")
);

-- AddForeignKey
ALTER TABLE "InformeAjuste" ADD CONSTRAINT "InformeAjuste_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase publica el esquema public por su API: estas tablas solo se usan desde el servidor.
ALTER TABLE "InformeAjuste" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArchivoSistema" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "InformeAjuste", "ArchivoSistema" FROM %I', r);
    END IF;
  END LOOP;
END $$;
