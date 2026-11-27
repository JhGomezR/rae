import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditoriaInterceptor } from './common/auditoria.interceptor';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuthGuard } from './common/auth.guard';
import { ErrorFilter } from './common/error.filter';
import { env } from './config/env';
import { PrismaModule } from './infrastructure/prisma/prisma.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { CurriculoModule } from './modules/curriculo/curriculo.module';
import { CursosModule } from './modules/cursos/cursos.module';
import { EncuestasModule } from './modules/encuestas/encuestas.module';
import { InformesModule } from './modules/informes/informes.module';
import { MatriculasModule } from './modules/matriculas/matriculas.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { PeriodosModule } from './modules/periodos/periodos.module';
import { InformesDocentesModule } from './modules/informes-docentes/informes-docentes.module';
import { PoaModule } from './modules/poa/poa.module';
import { ResultadosModule } from './modules/resultados/resultados.module';
import { SaludModule } from './modules/salud/salud.module';
import { UsuariosModule } from './modules/usuarios/usuarios.controller';

@Module({
  imports: [
    PrismaModule,
    AuditoriaModule,
    EventEmitterModule.forRoot(),
    // Límite amplio: muchos estudiantes pueden salir por la misma IP de la institución.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    JwtModule.register({
      global: true,
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: env.JWT_ACCESS_MINUTOS * 60 },
      verifyOptions: { algorithms: ['HS256'] },
    }),
    SaludModule,
    UsuariosModule,
    CurriculoModule,
    PeriodosModule,
    MatriculasModule,
    CursosModule,
    EncuestasModule,
    ResultadosModule,
    InformesModule,
    NotificacionesModule,
    PoaModule,
    InformesDocentesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ErrorFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
})
export class AppModule {}
