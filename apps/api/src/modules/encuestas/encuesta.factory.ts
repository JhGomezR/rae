import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { fraseItem, Momento, NivelPregunta, ordenOpciones, Rol, Seccion } from '@rae/shared';

export type ItemConPreguntas = Prisma.ItemEvaluableGetPayload<{
  include: { preguntas: true; competencia: true };
}>;

const ORDEN: Seccion[] = [Seccion.OBJETIVO, Seccion.GENERICA, Seccion.ESPECIFICA, Seccion.RAE];
const TITULO: Partial<Record<Seccion, string>> = {
  [Seccion.OBJETIVO]: 'Objetivos de la unidad',
  [Seccion.RAE]: 'Resultados del programa',
};

export const nivelPregunta = (rol: Rol): NivelPregunta =>
  rol === Rol.DOCENTE ? NivelPregunta.DOCENTE : NivelPregunta.ESTUDIANTE;

/** Pregunta práctica activa del ítem para ese rol. */
export function preguntaDe(item: ItemConPreguntas, rol: Rol) {
  return item.preguntas.find((p) => p.nivel === nivelPregunta(rol) && p.activa) ?? null;
}

export const fraseDe = (item: { capacidad: string; texto: string }, rol: Rol, momento: Momento) =>
  item.capacidad ? fraseItem(item.capacidad, rol, momento) : item.texto;

/** Arma la encuesta por rol y momento. Nunca incluye la respuesta correcta. */
@Injectable()
export class EncuestaFactory {
  secciones(items: ItemConPreguntas[], rol: Rol, momento: Momento, usuarioId: number) {
    return ORDEN.map((seccion) => {
      const grupos = new Map<string, { codigo: string | null; titulo: string; items: unknown[] }>();
      for (const it of items.filter((i) => i.seccion === seccion)) {
        const clave = it.competenciaUnidadId ? `c${it.competenciaUnidadId}` : seccion;
        if (!grupos.has(clave)) {
          grupos.set(clave, {
            codigo: it.competencia?.codigo ?? null,
            titulo: it.competencia?.tituloCorto ?? TITULO[seccion] ?? '',
            items: [],
          });
        }
        grupos.get(clave)?.items.push({
          id: it.id,
          frase: fraseDe(it, rol, momento),
          textoSyllabus: it.texto,
          pregunta: momento === Momento.ALCANCE ? this.pregunta(it, rol, usuarioId) : null,
        });
      }
      return { seccion, grupos: [...grupos.values()] };
    });
  }

  private pregunta(it: ItemConPreguntas, rol: Rol, usuarioId: number) {
    const p = preguntaDe(it, rol);
    if (!p) return null;
    const opciones = p.opciones as string[];
    return {
      id: p.id,
      enunciado: p.enunciado,
      opciones: ordenOpciones(opciones.length, `${usuarioId}|${it.id}`).map((indice) => ({
        indice,
        texto: opciones[indice] as string,
      })),
    };
  }
}
