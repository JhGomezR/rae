-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento` VARCHAR(20) NOT NULL,
    `nombreCompleto` VARCHAR(150) NOT NULL,
    `primerApellido` VARCHAR(60) NOT NULL,
    `primerNombre` VARCHAR(60) NOT NULL,
    `rol` ENUM('ADMIN', 'DOCENTE', 'ESTUDIANTE') NOT NULL,
    `email` VARCHAR(150) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `debeCambiarClave` BOOLEAN NOT NULL DEFAULT true,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `ultimoIngreso` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_documento_key`(`documento`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    INDEX `Usuario_rol_idx`(`rol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiraEn` DATETIME(3) NOT NULL,
    `revocadoEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `RefreshToken_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sede` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(40) NOT NULL,

    UNIQUE INDEX `Sede_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Programa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `ciclo` ENUM('TECNOLOGICO', 'PROFESIONAL') NOT NULL,

    UNIQUE INDEX `Programa_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Periodo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(10) NOT NULL,
    `anio` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `apreciacionAbierta` BOOLEAN NOT NULL DEFAULT false,
    `alcanceAbierto` BOOLEAN NOT NULL DEFAULT false,
    `apreciacionCierra` DATETIME(3) NULL,
    `alcanceCierra` DATETIME(3) NULL,

    UNIQUE INDEX `Periodo_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnidadFormacion` (
    `id` INTEGER NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `nombreClave` VARCHAR(150) NOT NULL,
    `semestre` INTEGER NOT NULL,
    `ciclo` ENUM('TECNOLOGICO', 'PROFESIONAL') NOT NULL,
    `archivosSyllabus` JSON NOT NULL,
    `editado` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `UnidadFormacion_nombreClave_key`(`nombreClave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AliasUnidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alias` VARCHAR(150) NOT NULL,
    `unidadId` INTEGER NOT NULL,

    UNIQUE INDEX `AliasUnidad_alias_key`(`alias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompetenciaUnidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unidadId` INTEGER NOT NULL,
    `clave` VARCHAR(10) NOT NULL,
    `codigo` VARCHAR(5) NULL,
    `tipo` ENUM('GENERICA', 'ESPECIFICA') NOT NULL,
    `texto` TEXT NOT NULL,
    `tituloCorto` VARCHAR(200) NOT NULL,
    `orden` INTEGER NOT NULL,

    INDEX `CompetenciaUnidad_codigo_idx`(`codigo`),
    UNIQUE INDEX `CompetenciaUnidad_unidadId_clave_key`(`unidadId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemEvaluable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unidadId` INTEGER NOT NULL,
    `clave` VARCHAR(20) NOT NULL,
    `seccion` ENUM('OBJETIVO', 'GENERICA', 'ESPECIFICA', 'RAE') NOT NULL,
    `tipo` ENUM('OBJETIVO', 'RA', 'COMPETENCIA', 'RAE') NOT NULL,
    `competenciaUnidadId` INTEGER NULL,
    `texto` TEXT NOT NULL,
    `capacidad` VARCHAR(500) NOT NULL,
    `orden` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `ItemEvaluable_unidadId_clave_key`(`unidadId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PreguntaPractica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `nivel` ENUM('ESTUDIANTE', 'DOCENTE') NOT NULL,
    `enunciado` TEXT NOT NULL,
    `opciones` JSON NOT NULL,
    `indiceCorrecta` INTEGER NOT NULL DEFAULT 0,
    `activa` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `PreguntaPractica_itemId_nivel_key`(`itemId`, `nivel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Curso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodoId` INTEGER NOT NULL,
    `sedeId` INTEGER NOT NULL,
    `programaId` INTEGER NOT NULL,
    `unidadId` INTEGER NOT NULL,
    `grupo` VARCHAR(5) NOT NULL,
    `semestreOferta` INTEGER NOT NULL,
    `docenteId` INTEGER NOT NULL,

    INDEX `Curso_docenteId_periodoId_idx`(`docenteId`, `periodoId`),
    UNIQUE INDEX `Curso_periodoId_sedeId_programaId_unidadId_grupo_docenteId_key`(`periodoId`, `sedeId`, `programaId`, `unidadId`, `grupo`, `docenteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inscripcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cursoId` INTEGER NOT NULL,
    `estudianteId` INTEGER NOT NULL,
    `semestreEstudiante` INTEGER NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Inscripcion_estudianteId_idx`(`estudianteId`),
    UNIQUE INDEX `Inscripcion_cursoId_estudianteId_key`(`cursoId`, `estudianteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Encuesta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cursoId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `periodoId` INTEGER NOT NULL,
    `rol` ENUM('ADMIN', 'DOCENTE', 'ESTUDIANTE') NOT NULL,
    `momento` ENUM('APRECIACION', 'ALCANCE') NOT NULL,
    `estado` ENUM('BORRADOR', 'ENVIADA') NOT NULL DEFAULT 'BORRADOR',
    `general` JSON NOT NULL,
    `enviadaEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    INDEX `Encuesta_periodoId_momento_rol_estado_idx`(`periodoId`, `momento`, `rol`, `estado`),
    UNIQUE INDEX `Encuesta_cursoId_usuarioId_momento_key`(`cursoId`, `usuarioId`, `momento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RespuestaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `encuestaId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `nivel` TINYINT NULL,
    `evaluados` INTEGER NULL,
    `alcanzan` INTEGER NULL,
    `evidencia` VARCHAR(500) NULL,
    `instrumento` VARCHAR(60) NULL,
    `preguntaPracticaId` INTEGER NULL,
    `opcionElegida` INTEGER NULL,
    `acierto` BOOLEAN NULL,
    `textoItem` TEXT NULL,
    `enunciadoPregunta` TEXT NULL,
    `textoRespuesta` TEXT NULL,

    UNIQUE INDEX `RespuestaItem_encuestaId_itemId_key`(`encuestaId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstrategiaPedagogica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('DIDACTICA', 'ACTIVA') NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `EstrategiaPedagogica_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EncuestaEstrategia` (
    `encuestaId` INTEGER NOT NULL,
    `estrategiaId` INTEGER NOT NULL,

    PRIMARY KEY (`encuestaId`, `estrategiaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recomendacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodoId` INTEGER NOT NULL,
    `unidadId` INTEGER NOT NULL,
    `cursoId` INTEGER NOT NULL,
    `texto` TEXT NOT NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Recomendacion_periodoId_unidadId_idx`(`periodoId`, `unidadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeguimientoRecomendacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recomendacionId` INTEGER NOT NULL,
    `cursoId` INTEGER NOT NULL,
    `estado` ENUM('APLICADA', 'PARCIAL', 'NO_APLICADA') NOT NULL,

    UNIQUE INDEX `SeguimientoRecomendacion_recomendacionId_cursoId_key`(`recomendacionId`, `cursoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaracteristicaPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeros` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `aspecto` TEXT NOT NULL,
    `objetivo` TEXT NOT NULL,
    `meta` TEXT NOT NULL,
    `orden` INTEGER NOT NULL,

    UNIQUE INDEX `CaracteristicaPlan_numeros_key`(`numeros`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Importacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `archivo` VARCHAR(200) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('PREVISUALIZADA', 'APLICADA', 'FALLIDA') NOT NULL DEFAULT 'PREVISUALIZADA',
    `resumen` JSON NOT NULL,
    `errores` JSON NOT NULL,
    `filas` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificacionOutbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tipo` ENUM('AVISO_APERTURA', 'RECORDATORIO') NOT NULL,
    `asunto` VARCHAR(200) NOT NULL,
    `cuerpoHtml` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'ENVIADA', 'FALLIDA') NOT NULL DEFAULT 'PENDIENTE',
    `intentos` INTEGER NOT NULL DEFAULT 0,
    `enviarDespuesDe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enviadaEn` DATETIME(3) NULL,
    `error` VARCHAR(500) NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificacionOutbox_estado_enviarDespuesDe_idx`(`estado`, `enviarDespuesDe`),
    INDEX `NotificacionOutbox_usuarioId_tipo_creadaEn_idx`(`usuarioId`, `tipo`, `creadaEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Auditoria` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NULL,
    `accion` VARCHAR(120) NOT NULL,
    `entidad` VARCHAR(60) NOT NULL,
    `entidadId` VARCHAR(40) NULL,
    `ip` VARCHAR(60) NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Auditoria_entidad_entidadId_idx`(`entidad`, `entidadId`),
    INDEX `Auditoria_creadaEn_idx`(`creadaEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AliasUnidad` ADD CONSTRAINT `AliasUnidad_unidadId_fkey` FOREIGN KEY (`unidadId`) REFERENCES `UnidadFormacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompetenciaUnidad` ADD CONSTRAINT `CompetenciaUnidad_unidadId_fkey` FOREIGN KEY (`unidadId`) REFERENCES `UnidadFormacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemEvaluable` ADD CONSTRAINT `ItemEvaluable_unidadId_fkey` FOREIGN KEY (`unidadId`) REFERENCES `UnidadFormacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemEvaluable` ADD CONSTRAINT `ItemEvaluable_competenciaUnidadId_fkey` FOREIGN KEY (`competenciaUnidadId`) REFERENCES `CompetenciaUnidad`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PreguntaPractica` ADD CONSTRAINT `PreguntaPractica_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ItemEvaluable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_periodoId_fkey` FOREIGN KEY (`periodoId`) REFERENCES `Periodo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `Programa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_unidadId_fkey` FOREIGN KEY (`unidadId`) REFERENCES `UnidadFormacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_docenteId_fkey` FOREIGN KEY (`docenteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encuesta` ADD CONSTRAINT `Encuesta_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encuesta` ADD CONSTRAINT `Encuesta_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encuesta` ADD CONSTRAINT `Encuesta_periodoId_fkey` FOREIGN KEY (`periodoId`) REFERENCES `Periodo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RespuestaItem` ADD CONSTRAINT `RespuestaItem_encuestaId_fkey` FOREIGN KEY (`encuestaId`) REFERENCES `Encuesta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RespuestaItem` ADD CONSTRAINT `RespuestaItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ItemEvaluable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncuestaEstrategia` ADD CONSTRAINT `EncuestaEstrategia_encuestaId_fkey` FOREIGN KEY (`encuestaId`) REFERENCES `Encuesta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncuestaEstrategia` ADD CONSTRAINT `EncuestaEstrategia_estrategiaId_fkey` FOREIGN KEY (`estrategiaId`) REFERENCES `EstrategiaPedagogica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recomendacion` ADD CONSTRAINT `Recomendacion_periodoId_fkey` FOREIGN KEY (`periodoId`) REFERENCES `Periodo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recomendacion` ADD CONSTRAINT `Recomendacion_unidadId_fkey` FOREIGN KEY (`unidadId`) REFERENCES `UnidadFormacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recomendacion` ADD CONSTRAINT `Recomendacion_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeguimientoRecomendacion` ADD CONSTRAINT `SeguimientoRecomendacion_recomendacionId_fkey` FOREIGN KEY (`recomendacionId`) REFERENCES `Recomendacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeguimientoRecomendacion` ADD CONSTRAINT `SeguimientoRecomendacion_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificacionOutbox` ADD CONSTRAINT `NotificacionOutbox_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
