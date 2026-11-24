import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  Headers,
  Injectable,
  Logger,
  Module,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Momento, Rol } from '@rae/shared';
import { z } from 'zod';
import { env } from '../../config/env';
import { Publica, Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { LogMailerAdapter, MailerPort, SmtpMailerAdapter } from '../../infrastructure/mail/mailer';
import { CURSO_VIGENTE } from '../../common/vigencia';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EVENTO_MOMENTO_ABIERTO, MomentoAbierto } from '../periodos/periodos.module';

const ESPERAS_MIN = [1, 5, 30, 30, 30];
const MAX_INTENTOS = 5;
const TRES_DIAS = 3 * 86_400_000;
const DOS_DIAS = 2 * 86_400_000;
const TIEMPO_ENVIO_MS = 45_000;
const paginacion = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(30),
});

const nombreMomento = (m: Momento) => (m === Momento.APRECIACION ? 'apreciación' : 'alcance');

function plantilla(titulo: string, texto: string): string {
  const url = `${env.APP_URL}/mis-encuestas`;
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c2a2e">
<h2 style="color:#0f5c63">${titulo}</h2><p>${texto}</p>
<p><a href="${url}" style="background:#0f5c63;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ir a mis encuestas</a></p>
<p style="color:#7a878a;font-size:12px">Seguimiento RAE</p></div>`;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerPort,
  ) {}

  private async participantes(periodoId: number): Promise<Map<number, Set<number>>> {
    const cursos = await this.prisma.curso.findMany({
      where: { periodoId, ...CURSO_VIGENTE },
      select: {
        id: true,
        docenteId: true,
        inscripciones: { where: { activa: true }, select: { estudianteId: true } },
      },
    });
    const mapa = new Map<number, Set<number>>();
    const sumar = (u: number, c: number) => mapa.set(u, (mapa.get(u) ?? new Set()).add(c));
    for (const c of cursos) {
      sumar(c.docenteId, c.id);
      for (const i of c.inscripciones) sumar(i.estudianteId, c.id);
    }
    return mapa;
  }

  private async conCorreo(ids: number[]): Promise<number[]> {
    const u = await this.prisma.usuario.findMany({
      where: { id: { in: ids }, activo: true, email: { not: null }, rol: { not: Rol.ADMIN } },
      select: { id: true },
    });
    return u.map((x) => x.id);
  }

  @OnEvent(EVENTO_MOMENTO_ABIERTO)
  async alAbrir({ periodoId, momento }: MomentoAbierto): Promise<void> {
    const mapa = await this.participantes(periodoId);
    const ids = await this.conCorreo([...mapa.keys()]);
    const nombre = nombreMomento(momento);
    await this.prisma.notificacionOutbox.createMany({
      data: ids.map((usuarioId) => ({
        usuarioId,
        tipo: 'AVISO_APERTURA' as const,
        asunto: `Ya puedes responder la encuesta de ${nombre}`,
        cuerpoHtml: plantilla(
          `Encuesta de ${nombre} abierta`,
          'Ingresa con tu documento y responde la encuesta de cada unidad de formación asignada.',
        ),
      })),
    });
  }

  /** Recordatorio a pendientes: máximo uno cada 3 días, y uno 2 días antes del cierre. */
  async encolarRecordatorios(): Promise<number> {
    const periodo = await this.prisma.periodo.findFirst({ where: { activo: true } });
    if (!periodo) return 0;
    const abiertos: { momento: Momento; cierra: Date | null }[] = [];
    if (periodo.apreciacionAbierta)
      abiertos.push({ momento: Momento.APRECIACION, cierra: periodo.apreciacionCierra });
    if (periodo.alcanceAbierto)
      abiertos.push({ momento: Momento.ALCANCE, cierra: periodo.alcanceCierra });
    if (!abiertos.length) return 0;

    const ahora = Date.now();
    const mapa = await this.participantes(periodo.id);
    const ids = await this.conCorreo([...mapa.keys()]);
    const [enviadas, recientes] = await Promise.all([
      this.prisma.encuesta.findMany({
        where: { periodoId: periodo.id, estado: 'ENVIADA' },
        select: { usuarioId: true, cursoId: true, momento: true },
      }),
      this.prisma.notificacionOutbox.findMany({
        where: { tipo: 'RECORDATORIO', creadaEn: { gte: new Date(ahora - TRES_DIAS) } },
        select: { usuarioId: true, creadaEn: true },
      }),
    ]);
    const hechas = new Set(enviadas.map((e) => `${e.usuarioId}|${e.cursoId}|${e.momento}`));
    const ultimo = new Map<number, number>();
    for (const r of recientes) {
      ultimo.set(r.usuarioId, Math.max(ultimo.get(r.usuarioId) ?? 0, r.creadaEn.getTime()));
    }
    const data = [];
    for (const usuarioId of ids) {
      const cursos = [...(mapa.get(usuarioId) ?? [])];
      const pendientes = abiertos.flatMap((a) =>
        cursos.filter((c) => !hechas.has(`${usuarioId}|${c}|${a.momento}`)).map(() => a),
      );
      if (!pendientes.length) continue;
      const porCerrar = pendientes.some((a) => {
        const falta = a.cierra ? a.cierra.getTime() - ahora : Infinity;
        return falta > 0 && falta <= DOS_DIAS;
      });
      const previo = ultimo.get(usuarioId);
      const yaHoy = previo !== undefined && ahora - previo < 86_400_000;
      if (previo !== undefined && (!porCerrar || yaHoy)) continue;
      data.push({
        usuarioId,
        tipo: 'RECORDATORIO' as const,
        asunto: 'Tienes encuestas pendientes',
        cuerpoHtml: plantilla(
          'Tienes encuestas pendientes',
          `Te faltan ${pendientes.length} encuesta(s) por responder en el periodo ${periodo.codigo}.`,
        ),
      });
    }
    if (data.length) await this.prisma.notificacionOutbox.createMany({ data });
    return data.length;
  }

  /** Tarea diaria de Vercel: encola recordatorios y envía lo pendiente. */
  async tareaDiaria() {
    const encolados = await this.encolarRecordatorios();
    return { encolados, enviados: await this.enviarPendientes() };
  }

  /** Envía por lotes hasta agotar la cola o el tiempo disponible de la función. */
  async enviarPendientes(): Promise<number> {
    const limite = Date.now() + TIEMPO_ENVIO_MS;
    let enviados = 0;
    for (;;) {
      const lote = await this.prisma.notificacionOutbox.findMany({
        where: { estado: 'PENDIENTE', enviarDespuesDe: { lte: new Date() } },
        include: { usuario: { select: { email: true } } },
        take: 50,
        orderBy: { id: 'asc' },
      });
      if (!lote.length) return enviados;
      for (const n of lote) {
        if (Date.now() >= limite) return enviados;
        if (await this.enviarUna(n)) enviados++;
      }
    }
  }

  private async enviarUna(n: {
    id: number;
    asunto: string;
    cuerpoHtml: string;
    intentos: number;
    usuario: { email: string | null };
  }): Promise<boolean> {
    {
      if (!n.usuario.email) {
        await this.prisma.notificacionOutbox.update({
          where: { id: n.id },
          data: { estado: 'FALLIDA', error: 'Sin correo registrado' },
        });
        return false;
      }
      try {
        await this.mailer.enviar({ para: n.usuario.email, asunto: n.asunto, html: n.cuerpoHtml });
        await this.prisma.notificacionOutbox.update({
          where: { id: n.id },
          data: { estado: 'ENVIADA', enviadaEn: new Date(), error: null },
        });
        return true;
      } catch (e) {
        const intentos = n.intentos + 1;
        const espera = ESPERAS_MIN[n.intentos] ?? 30;
        this.logger.warn(`No se pudo enviar la notificación ${n.id}`);
        await this.prisma.notificacionOutbox.update({
          where: { id: n.id },
          data: {
            intentos,
            estado: intentos >= MAX_INTENTOS ? 'FALLIDA' : 'PENDIENTE',
            enviarDespuesDe: new Date(Date.now() + espera * 60_000),
            error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
          },
        });
        return false;
      }
    }
  }

  async listar({ pagina, tamano }: z.output<typeof paginacion>) {
    const [datos, total] = await Promise.all([
      this.prisma.notificacionOutbox.findMany({
        orderBy: { id: 'desc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
        omit: { cuerpoHtml: true },
        include: { usuario: { select: { nombreCompleto: true } } },
      }),
      this.prisma.notificacionOutbox.count(),
    ]);
    return { datos, total, pagina, tamano };
  }

  async auditoria({ pagina, tamano }: z.output<typeof paginacion>) {
    const [filas, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        orderBy: { id: 'desc' },
        skip: (pagina - 1) * tamano,
        take: tamano,
      }),
      this.prisma.auditoria.count(),
    ]);
    return { datos: filas.map((f) => ({ ...f, id: f.id.toString() })), total, pagina, tamano };
  }
}

@Roles(Rol.ADMIN)
@Controller()
export class NotificacionesController {
  constructor(private readonly servicio: NotificacionesService) {}

  @Get('notificaciones')
  listar(@Query(new ZodPipe(paginacion)) p: z.output<typeof paginacion>) {
    return this.servicio.listar(p);
  }

  @Post('notificaciones/recordatorios')
  async recordatorios() {
    const encolados = await this.servicio.encolarRecordatorios();
    return { encolados, enviados: await this.servicio.enviarPendientes() };
  }

  @Post('notificaciones/enviar')
  async enviar() {
    return { enviados: await this.servicio.enviarPendientes() };
  }

  /** Vercel Cron envía Authorization: Bearer CRON_SECRET. */
  @Publica()
  @Get('cron/diario')
  cronDiario(@Headers('authorization') autorizacion?: string) {
    const esperado = Buffer.from(`Bearer ${env.CRON_SECRET ?? ''}`);
    const recibido = Buffer.from(autorizacion ?? '');
    const valido =
      Boolean(env.CRON_SECRET) &&
      esperado.length === recibido.length &&
      timingSafeEqual(esperado, recibido);
    if (!valido) throw new UnauthorizedException('No autorizado.');
    return this.servicio.tareaDiaria();
  }

  @Get('auditoria')
  auditoria(@Query(new ZodPipe(paginacion)) p: z.output<typeof paginacion>) {
    return this.servicio.auditoria(p);
  }
}

@Module({
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    {
      provide: MailerPort,
      useClass: env.MAIL_TRANSPORT === 'smtp' ? SmtpMailerAdapter : LogMailerAdapter,
    },
  ],
})
export class NotificacionesModule {}
