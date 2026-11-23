import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

interface Sesion {
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  pc: number;
}

/** Usa el dominio público que llega por el proxy; Next la deja relativa si es el mismo origen. */
function redirigir(req: NextRequest, destino: string) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const protocolo = req.headers.get('x-forwarded-proto') ?? 'http';
  return NextResponse.redirect(new URL(destino, `${protocolo}://${host}`), 307);
}

async function leerSesion(token: string | undefined): Promise<Sesion | null> {
  const secreto = process.env.JWT_ACCESS_SECRET;
  if (!token || !secreto) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secreto), {
      algorithms: ['HS256'],
    });
    return payload as unknown as Sesion;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sesion = await leerSesion(req.cookies.get('access')?.value);

  if (!sesion) {
    if (req.cookies.has('refresh')) {
      const destino = pathname === '/login' ? '/' : `${pathname}${search}`;
      return redirigir(req, `/api/auth/renovar?destino=${encodeURIComponent(destino)}`);
    }
    return pathname === '/login' ? NextResponse.next() : redirigir(req, '/login');
  }

  const inicio = sesion.rol === 'ADMIN' ? '/admin/panel' : '/mis-encuestas';
  if (sesion.pc === 1)
    return pathname === '/primer-ingreso' ? NextResponse.next() : redirigir(req, '/primer-ingreso');
  if (pathname === '/' || pathname === '/login' || pathname === '/primer-ingreso')
    return redirigir(req, inicio);
  if (pathname.startsWith('/admin') && sesion.rol !== 'ADMIN') return redirigir(req, inicio);
  if (
    (pathname.startsWith('/mis-encuestas') || pathname.startsWith('/encuesta')) &&
    sesion.rol === 'ADMIN'
  ) {
    return redirigir(req, inicio);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
