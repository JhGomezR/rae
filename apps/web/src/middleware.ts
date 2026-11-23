import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

interface Sesion {
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  pc: number;
}

/** Redirección relativa: conserva el dominio público detrás del proxy. */
const ir = (destino: string) =>
  new NextResponse(null, { status: 307, headers: { Location: destino } });

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
      return ir(`/api/auth/renovar?destino=${encodeURIComponent(destino)}`);
    }
    return pathname === '/login' ? NextResponse.next() : ir('/login');
  }

  const inicio = sesion.rol === 'ADMIN' ? '/admin/panel' : '/mis-encuestas';
  if (sesion.pc === 1)
    return pathname === '/primer-ingreso' ? NextResponse.next() : ir('/primer-ingreso');
  if (pathname === '/' || pathname === '/login' || pathname === '/primer-ingreso')
    return ir(inicio);
  if (pathname.startsWith('/admin') && sesion.rol !== 'ADMIN') return ir(inicio);
  if (
    (pathname.startsWith('/mis-encuestas') || pathname.startsWith('/encuesta')) &&
    sesion.rol === 'ADMIN'
  ) {
    return ir(inicio);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
