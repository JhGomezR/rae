-- Las sesiones abiertas antes de este cambio duraban 7 días: se acortan a 15 minutos.
-- Quien siga activo las renueva sin notarlo; quien no, deberá ingresar de nuevo.
UPDATE "RefreshToken"
SET "expiraEn" = LEAST("expiraEn", now() + interval '15 minutes')
WHERE "revocadoEn" IS NULL;
