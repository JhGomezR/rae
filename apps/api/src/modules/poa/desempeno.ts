import {
  ActividadCalculo,
  Desempeno,
  DesempenoActividad,
  EstadoActividad,
  Grupo,
  Semaforo,
  TIPOS_INDICADOR,
} from './poa.tipos';

/** Tolerancia (puntos) antes de considerar atrasada una actividad. */
const TOLERANCIA = 5;

const redondear = (n: number) => Math.round(n * 10) / 10;
const promedio = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);

/** Mes de corte: el mes actual dentro de la vigencia, 0 antes de empezar y 12 al terminar. */
export function mesCorte(vigencia: number, hoy = new Date()): number {
  const anio = hoy.getFullYear();
  if (anio < vigencia) return 0;
  if (anio > vigencia) return 12;
  return hoy.getMonth() + 1;
}

/** Avance esperado (%) al cierre del mes: proporción de meses programados ya cumplidos. */
export function esperadoAl(meses: number[], mes: number): number {
  if (mes <= 0) return 0;
  if (!meses.length) return redondear((Math.min(mes, 12) / 12) * 100);
  return redondear((meses.filter((m) => m <= mes).length / meses.length) * 100);
}

/** Avance reportado (acumulado) al cierre del mes: el último seguimiento hasta ese mes. */
export function avanceAl(seguimientos: ActividadCalculo['seguimientos'], mes: number): number {
  const previos = seguimientos.filter((s) => s.mes <= mes).sort((a, b) => b.mes - a.mes);
  return previos[0]?.avance ?? 0;
}

export function estadoActividad(avance: number, esperado: number): EstadoActividad {
  if (avance >= 100) return 'CUMPLIDA';
  if (avance + TOLERANCIA < esperado) return 'ATRASADA';
  return avance > 0 ? 'EN_CURSO' : 'SIN_INICIAR';
}

/** Índice de desempeño: avance real frente al esperado (100 = va según lo programado). */
export function indice(avance: number, esperado: number): number {
  if (esperado <= 0) return 100;
  return redondear(Math.min(100, (avance / esperado) * 100));
}

export function semaforo(valor: number): Semaforo {
  if (valor >= 90) return 'SATISFACTORIO';
  if (valor >= 70) return 'ACEPTABLE';
  return 'CRITICO';
}

function agrupar(filas: DesempenoActividad[], clave: (i: number) => string): Grupo[] {
  const grupos = new Map<string, DesempenoActividad[]>();
  filas.forEach((f, i) => {
    const k = clave(i);
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  });
  return [...grupos.entries()].map(([k, v]) => ({
    clave: k,
    actividades: v.length,
    esperado: redondear(promedio(v.map((x) => x.esperado))),
    avance: redondear(promedio(v.map((x) => x.avance))),
  }));
}

/** Calcula el desempeño del POA al mes de corte. Función pura: no toca la base de datos. */
export function calcularDesempeno(actividades: ActividadCalculo[], corte: number): Desempeno {
  const porActividad: DesempenoActividad[] = actividades.map((a) => {
    const esperado = esperadoAl(a.meses, corte);
    const avance = avanceAl(a.seguimientos, corte);
    const hasta = a.seguimientos.filter((s) => s.mes <= corte).sort((x, y) => y.mes - x.mes);
    return {
      id: a.id,
      numero: a.numero,
      actividad: a.actividad,
      esperado,
      avance,
      estado: estadoActividad(avance, esperado),
      ultimoLogro: hasta[0]?.logro ?? null,
      ejecutado: hasta.reduce((s, x) => s + (x.ejecutado ?? 0), 0),
    };
  });
  const esperado = redondear(promedio(porActividad.map((a) => a.esperado)));
  const avance = redondear(promedio(porActividad.map((a) => a.avance)));
  const valor = indice(avance, esperado);
  const estados: Record<EstadoActividad, number> = {
    CUMPLIDA: 0,
    EN_CURSO: 0,
    ATRASADA: 0,
    SIN_INICIAR: 0,
  };
  porActividad.forEach((a) => (estados[a.estado] += 1));

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return {
      mes,
      programadas: actividades.filter((a) => a.meses.includes(mes)).length,
      esperado: redondear(promedio(actividades.map((a) => esperadoAl(a.meses, mes)))),
      avance:
        mes <= corte
          ? redondear(promedio(actividades.map((a) => avanceAl(a.seguimientos, mes))))
          : null,
    };
  });

  return {
    mesCorte: corte,
    actividades: actividades.length,
    esperado,
    avance,
    indice: valor,
    semaforo: semaforo(valor),
    estados,
    presupuesto: actividades.reduce((s, a) => s + (a.presupuesto ?? 0), 0),
    ejecutado: porActividad.reduce((s, a) => s + a.ejecutado, 0),
    porActividad,
    porPilar: agrupar(porActividad, (i) => actividades[i]?.ejePgr.trim() || 'Sin eje'),
    porTipo: agrupar(porActividad, (i) => {
      const t = actividades[i]?.tipoIndicador;
      return t ? TIPOS_INDICADOR[t].nombre : 'Sin tipo';
    }),
    porResponsable: agrupar(
      porActividad,
      (i) => actividades[i]?.responsableEjecucion.replace(/\s+/g, ' ').trim() || 'Sin responsable',
    ),
    porMes,
  };
}
