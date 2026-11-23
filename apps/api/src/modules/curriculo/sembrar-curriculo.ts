import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Prisma, PrismaClient } from '@prisma/client';
import { normalizarNombreUnidad } from '@rae/shared';

interface CompSemilla {
  codigo?: string | null;
  texto: string;
  resultados: string[];
}
interface UnidadSemilla {
  id: number;
  nombre: string;
  semestre: number;
  ciclo: string;
  archivos?: string[];
  objetivos: string[];
  genericas: CompSemilla[];
  especificas: CompSemilla[];
  rae: string[];
}
type Pregunta = { p: string; o: string[] };
type Practica = { E?: Pregunta; D?: Pregunta };
interface CaracteristicaSemilla {
  ids: number[];
  nombre: string;
  aspecto: string;
  objetivo: string;
  meta: string;
}
interface Pep {
  estrategiasDidacticas: string[];
  metodologiasActivas: string[];
  caracteristicas: CaracteristicaSemilla[];
}

const carpeta = dirname(require.resolve('@rae/shared/seed/curriculo.json'));
const leer = <T>(archivo: string) => JSON.parse(readFileSync(join(carpeta, archivo), 'utf8')) as T;

function cargarSemilla() {
  return {
    unidades: leer<{ unidades: UnidadSemilla[] }>('curriculo.json').unidades,
    preguntas: leer<{ preguntas: Record<string, { c?: string; t?: string }> }>('preguntas.json')
      .preguntas,
    practicas: leer<Record<string, Practica>>('practicas.json'),
    pep: leer<Pep>('pep.json'),
  };
}
type Semilla = ReturnType<typeof cargarSemilla>;

interface ItemPlano {
  clave: string;
  seccion: 'OBJETIVO' | 'GENERICA' | 'ESPECIFICA' | 'RAE';
  tipo: 'OBJETIVO' | 'RA' | 'COMPETENCIA' | 'RAE';
  compClave?: string;
  texto: string;
}

/** CG → genérica y CE → específica, siempre; el encabezado solo cuenta si no hay código. */
function tipoCompetencia(c: CompSemilla, encabezado: 'GENERICA' | 'ESPECIFICA') {
  const codigo = c.codigo?.toUpperCase() ?? '';
  if (codigo.startsWith('CG')) return 'GENERICA' as const;
  if (codigo.startsWith('CE')) return 'ESPECIFICA' as const;
  return encabezado;
}

async function sembrarContenido(prisma: PrismaClient, u: UnidadSemilla, s: Semilla) {
  const planos: ItemPlano[] = u.objetivos.map((texto, i) => ({
    clave: `o${i}`,
    seccion: 'OBJETIVO',
    tipo: 'OBJETIVO',
    texto,
  }));
  const competencias = new Map<string, number>();
  const fuentes = [
    ['g', u.genericas, 'GENERICA'],
    ['e', u.especificas, 'ESPECIFICA'],
  ] as const;
  let ordenComp = 0;
  for (const [prefijo, lista, encabezado] of fuentes) {
    for (const [ci, c] of lista.entries()) {
      const clave = `${prefijo}${ci}`;
      const tipo = tipoCompetencia(c, encabezado);
      const datos = {
        codigo: c.codigo || null,
        tipo,
        texto: c.texto,
        tituloCorto: (s.preguntas[c.texto.trim()]?.t || c.texto).slice(0, 200),
        orden: ordenComp++,
      };
      const fila = await prisma.competenciaUnidad.upsert({
        where: { unidadId_clave: { unidadId: u.id, clave } },
        create: { unidadId: u.id, clave, ...datos },
        update: datos,
      });
      competencias.set(clave, fila.id);
      if (c.resultados.length) {
        c.resultados.forEach((texto, ri) =>
          planos.push({
            clave: `${clave}r${ri}`,
            seccion: tipo,
            tipo: 'RA',
            compClave: clave,
            texto,
          }),
        );
      } else {
        planos.push({
          clave,
          seccion: tipo,
          tipo: 'COMPETENCIA',
          compClave: clave,
          texto: c.texto,
        });
      }
    }
  }
  u.rae.forEach((texto, i) => planos.push({ clave: `r${i}`, seccion: 'RAE', tipo: 'RAE', texto }));

  for (const [orden, p] of planos.entries()) {
    const datos = {
      seccion: p.seccion,
      tipo: p.tipo,
      competenciaUnidadId: p.compClave ? (competencias.get(p.compClave) ?? null) : null,
      texto: p.texto,
      capacidad: (s.preguntas[p.texto.trim()]?.c ?? '').slice(0, 500),
      orden,
      activo: true,
    };
    const item = await prisma.itemEvaluable.upsert({
      where: { unidadId_clave: { unidadId: u.id, clave: p.clave } },
      create: { unidadId: u.id, clave: p.clave, ...datos },
      update: datos,
    });
    const practica = s.practicas[p.texto.trim()];
    for (const [nivel, q] of [
      ['ESTUDIANTE', practica?.E],
      ['DOCENTE', practica?.D],
    ] as const) {
      if (!q) continue;
      const opciones = q.o.filter(Boolean) as Prisma.InputJsonValue;
      const d = { enunciado: q.p, opciones, indiceCorrecta: 0, activa: true };
      await prisma.preguntaPractica.upsert({
        where: { itemId_nivel: { itemId: item.id, nivel } },
        create: { itemId: item.id, nivel, ...d },
        update: d,
      });
    }
  }
  await prisma.itemEvaluable.updateMany({
    where: { unidadId: u.id, clave: { notIn: planos.map((p) => p.clave) } },
    data: { activo: false },
  });
}

/** Devuelve una unidad a su contenido original del syllabus. */
export async function restaurarUnidad(prisma: PrismaClient, id: number): Promise<boolean> {
  const s = cargarSemilla();
  const u = s.unidades.find((x) => x.id === id);
  if (!u) return false;
  await sembrarContenido(prisma, u, s);
  await prisma.unidadFormacion.update({ where: { id }, data: { editado: false } });
  return true;
}

/** Idempotente: no pisa las unidades que el administrador editó. */
export async function sembrarCurriculo(prisma: PrismaClient): Promise<void> {
  const s = cargarSemilla();
  for (const u of s.unidades) {
    const datos = {
      nombre: u.nombre,
      nombreClave: normalizarNombreUnidad(u.nombre),
      semestre: u.semestre,
      ciclo: /tecn/i.test(u.ciclo) ? ('TECNOLOGICO' as const) : ('PROFESIONAL' as const),
      archivosSyllabus: u.archivos ?? [],
    };
    const previa = await prisma.unidadFormacion.findUnique({ where: { id: u.id } });
    if (previa?.editado) continue;
    await prisma.unidadFormacion.upsert({
      where: { id: u.id },
      create: { id: u.id, ...datos },
      update: datos,
    });
    await sembrarContenido(prisma, u, s);
  }
  const estrategias = [
    ...s.pep.estrategiasDidacticas.map((nombre) => ({ nombre, tipo: 'DIDACTICA' as const })),
    ...s.pep.metodologiasActivas.map((nombre) => ({ nombre, tipo: 'ACTIVA' as const })),
  ];
  await prisma.estrategiaPedagogica.createMany({ data: estrategias, skipDuplicates: true });
  for (const [orden, c] of s.pep.caracteristicas.entries()) {
    const numeros = c.ids.join(',');
    const d = { nombre: c.nombre, aspecto: c.aspecto, objetivo: c.objetivo, meta: c.meta, orden };
    await prisma.caracteristicaPlan.upsert({
      where: { numeros },
      create: { numeros, ...d },
      update: d,
    });
  }
}
