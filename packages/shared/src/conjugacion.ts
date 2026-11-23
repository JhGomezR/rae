import { Momento, Rol } from './enums';

export type Persona = 'yo' | 'ellos';

/** Irregulares: [yo presente, ellos presente, raíz de futuro]. */
const IRREG: Readonly<Record<string, readonly [string, string, string?]>> = {
  comprobar: ['compruebo', 'comprueban'],
  construir: ['construyo', 'construyen'],
  convertir: ['convierto', 'convierten'],
  corregir: ['corrijo', 'corrigen'],
  dar: ['doy', 'dan'],
  demostrar: ['demuestro', 'demuestran'],
  desplegar: ['despliego', 'despliegan'],
  elegir: ['elijo', 'eligen'],
  entender: ['entiendo', 'entienden'],
  hacer: ['hago', 'hacen', 'har'],
  mantener: ['mantengo', 'mantienen', 'mantendr'],
  medir: ['mido', 'miden'],
  pensar: ['pienso', 'piensan'],
  poner: ['pongo', 'ponen', 'pondr'],
  predecir: ['predigo', 'predicen', 'predecir'],
  probar: ['pruebo', 'prueban'],
  proponer: ['propongo', 'proponen', 'propondr'],
  reconocer: ['reconozco', 'reconocen'],
  resolver: ['resuelvo', 'resuelven'],
  ser: ['soy', 'son'],
  evaluar: ['evalúo', 'evalúan'],
  actuar: ['actúo', 'actúan'],
  continuar: ['continúo', 'continúan'],
  enviar: ['envío', 'envían'],
  guiar: ['guío', 'guían'],
  reunir: ['reúno', 'reúnen'],
  desenvolver: ['desenvuelvo', 'desenvuelven'],
  sentir: ['siento', 'sienten'],
  seguir: ['sigo', 'siguen'],
  obtener: ['obtengo', 'obtienen', 'obtendr'],
  conocer: ['conozco', 'conocen'],
  producir: ['produzco', 'producen'],
  traducir: ['traduzco', 'traducen'],
  decir: ['digo', 'dicen', 'dir'],
  saber: ['sé', 'saben', 'sabr'],
  poder: ['puedo', 'pueden', 'podr'],
  tener: ['tengo', 'tienen', 'tendr'],
  distribuir: ['distribuyo', 'distribuyen'],
  incluir: ['incluyo', 'incluyen'],
  contribuir: ['contribuyo', 'contribuyen'],
  defender: ['defiendo', 'defienden'],
  extender: ['extiendo', 'extienden'],
  advertir: ['advierto', 'advierten'],
  sugerir: ['sugiero', 'sugieren'],
  invertir: ['invierto', 'invierten'],
  recomendar: ['recomiendo', 'recomiendan'],
  comenzar: ['comienzo', 'comienzan'],
  encontrar: ['encuentro', 'encuentran'],
  recordar: ['recuerdo', 'recuerdan'],
  aprobar: ['apruebo', 'aprueban'],
  reducir: ['reduzco', 'reducen'],
};

/** Palabras terminadas en -ar/-er/-ir que no son verbos. */
const NO_VERBO = new Set(
  'lugar hogar similar particular regular escolar popular familiar militar solar polar singular titular auxiliar mujer poder deber placer inter jitter ingenier modular celular molecular estelar nuclear lineal binar'.split(
    ' ',
  ),
);

/** Palabras en -arme/-erme/-irme que no son un infinitivo con pronombre. */
const NO_REFLEXIVO = new Set(['firme', 'arme', 'enferme', 'duerme', 'alarme']);

function conjugaVerbo(infinitivo: string, persona: Persona, futuro: boolean): string {
  const irregular = IRREG[infinitivo];
  if (futuro) return (irregular?.[2] ?? infinitivo) + (persona === 'yo' ? 'é' : 'án');
  if (irregular) return persona === 'yo' ? irregular[0] : irregular[1];
  const raiz = infinitivo.slice(0, -2);
  if (persona === 'yo') return `${raiz}o`;
  return raiz + (infinitivo.endsWith('ar') ? 'an' : 'en');
}

/** Cambia a «y» la «e» anterior cuando el verbo conjugado ya no empieza por i-/hi-. */
function corregirConjuncion(partes: string[], desde: number): void {
  for (let j = desde; j >= 0; j--) {
    const parte = partes[j] as string;
    if (parte === 'e') {
      partes[j] = 'y';
      return;
    }
    if (parte && !/^\s+$/.test(parte)) return;
  }
}

/** Conjuga el primer infinitivo y los coordinados con él; el resto queda igual. */
export function conjugar(capacidad: string, persona: Persona, futuro: boolean): string {
  const partes = capacidad.split(/(\s+|,)/);
  let ultimoConjugado: boolean | null = null;
  let previo = '';

  for (let i = 0; i < partes.length; i++) {
    const palabra = partes[i];
    if (!palabra || /^\s+$/.test(palabra)) continue;
    if (palabra === ',') {
      previo = ',';
      continue;
    }
    const m = /^(\p{Ll}+?(?:ar|er|ir))(me|se|la|las|lo|los|le|les)?$/u.exec(palabra);
    const infinitivo = m?.[1];
    if (!m || !infinitivo || NO_VERBO.has(infinitivo) || infinitivo.length <= 2) {
      previo = palabra;
      continue;
    }
    const pronombre = m[2];
    const inicio = ultimoConjugado === null && i === 0;
    const coordinado = [',', 'y', 'e', 'o'].includes(previo) && ultimoConjugado === true;
    if ((inicio || coordinado) && (!pronombre || pronombre === 'me' || pronombre === 'se')) {
      const verbo = conjugaVerbo(infinitivo, persona, futuro);
      const forma = pronombre ? `${persona === 'yo' ? 'me' : 'se'} ${verbo}` : verbo;
      partes[i] = forma;
      if (previo === 'e' && !/^h?i/.test(forma)) corregirConjuncion(partes, i - 1);
      ultimoConjugado = true;
    } else {
      ultimoConjugado = false;
    }
    previo = 'v';
  }
  return partes.join('');
}

/** Pasa a tercera persona: mi→su, mis→sus, adaptarme→adaptarse. */
export function aTercera(texto: string): string {
  return texto
    .replace(/(?<!\p{L})(\p{L}+?[aeií])rme(?!\p{L})/gu, (palabra: string, raiz: string) =>
      NO_REFLEXIVO.has(palabra.toLowerCase()) ? palabra : `${raiz}rse`,
    )
    .replace(/(?<!\p{L})mis(?!\p{L})/gu, 'sus')
    .replace(/(?<!\p{L})mi(?!\p{L})/gu, 'su');
}

function mayusculaInicial(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}

/** Frase de la encuesta según rol y momento, a partir de la capacidad en infinitivo. */
export function fraseItem(capacidad: string, rol: Rol, momento: Momento): string {
  const futuro = momento === Momento.APRECIACION;
  const frase =
    rol === Rol.DOCENTE
      ? aTercera(conjugar(capacidad, 'ellos', futuro))
      : conjugar(capacidad, 'yo', futuro);
  return mayusculaInicial(frase).replace(/\.$/, '');
}
