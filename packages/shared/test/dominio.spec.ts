import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  claveInicial,
  conjugar,
  fraseItem,
  Momento,
  nombreAmbiguo,
  normalizarClave,
  normalizarNombreUnidad,
  ordenOpciones,
  parsearNombre,
  Rol,
  aTercera,
} from '../src';

const seed = <T>(archivo: string): T =>
  JSON.parse(readFileSync(join(__dirname, '..', 'seed', archivo), 'utf8')) as T;

describe('conjugación', () => {
  it('conjuga según rol y momento', () => {
    const cap = 'reconocer las partes de un sistema';
    expect(fraseItem(cap, Rol.ESTUDIANTE, Momento.APRECIACION)).toMatch(/^Reconoceré /);
    expect(fraseItem(cap, Rol.ESTUDIANTE, Momento.ALCANCE)).toMatch(/^Reconozco /);
    expect(fraseItem(cap, Rol.DOCENTE, Momento.APRECIACION)).toMatch(/^Reconocerán /);
    expect(fraseItem(cap, Rol.DOCENTE, Momento.ALCANCE)).toMatch(/^Reconocen /);
  });

  it('conjuga coordinados, pero no los infinitivos con «para»', () => {
    expect(conjugar('planear, redactar y corregir textos', 'yo', false)).toBe(
      'planeo, redacto y corrijo textos',
    );
    expect(conjugar('usar datos para analizar y resolver', 'yo', false)).toBe(
      'uso datos para analizar y resolver',
    );
  });

  it('no daña palabras en -rme que no son verbos', () => {
    expect(aTercera('un informe conforme y firme para adaptarme')).toBe(
      'un informe conforme y firme para adaptarse',
    );
  });

  it('ninguna capacidad real empieza en infinitivo o sin conjugar', () => {
    const { preguntas } = seed<{ preguntas: Record<string, { c?: string }> }>('preguntas.json');
    const capacidades = Object.values(preguntas)
      .map((p) => p.c)
      .filter((c): c is string => Boolean(c));
    expect(capacidades.length).toBeGreaterThanOrEqual(500);
    const fallas: string[] = [];
    for (const c of capacidades) {
      for (const rol of [Rol.ESTUDIANTE, Rol.DOCENTE]) {
        for (const momento of [Momento.APRECIACION, Momento.ALCANCE]) {
          const frase = fraseItem(c, rol, momento).toLowerCase();
          if (frase === c.toLowerCase().replace(/\.$/, '')) fallas.push(`${rol}/${momento}: ${c}`);
        }
      }
    }
    expect(fallas).toEqual([]);
  });
});

describe('nombres y claves', () => {
  it('reconoce partículas', () => {
    expect(parsearNombre('DE LA CRUZ PEREZ ANA LUCIA')).toMatchObject({
      primerApellido: 'DE LA CRUZ',
      primerNombre: 'ANA',
    });
    expect(parsearNombre('TORRES VEGA MARIA DEL PILAR').primerNombre).toBe('MARIA');
  });

  it('arma la clave inicial por rol', () => {
    expect(claveInicial('1000000001', 'ROJAS MEJIA LUIS ANDRES', Rol.ESTUDIANTE)).toBe(
      '1000000001ROJAS',
    );
    expect(claveInicial('10000002', 'ROJAS MEJIA LUIS ANDRES', Rol.DOCENTE)).toBe('10000002LUIS');
    expect(claveInicial('1000000003', 'DE LA CRUZ PEREZ ANA', Rol.ESTUDIANTE)).toBe(
      '1000000003DELACRUZ',
    );
  });

  it('normaliza mayúsculas, tildes y Ñ', () => {
    expect(normalizarClave('1 peña Núñez')).toBe('1PENANUNEZ');
  });

  it('marca nombres ambiguos', () => {
    expect(nombreAmbiguo('ROJAS LUIS ANDRES', Rol.DOCENTE)).toBe(true);
    expect(nombreAmbiguo('ROJAS LUIS ANDRES', Rol.ESTUDIANTE)).toBe(false);
  });
});

describe('unidades y opciones', () => {
  it('empareja variantes de nombre', () => {
    expect(normalizarNombreUnidad('ALGORÍTMOS Y PROGRAMACIÓN II')).toBe(
      normalizarNombreUnidad('Algoritmos y Programación 2'),
    );
    expect(normalizarNombreUnidad('METODOLOGÍA DE LA INVESTIGACIÓN')).toBe(
      normalizarNombreUnidad('Metodología de Investigación'),
    );
  });

  it('ordena de forma estable sin perder opciones', () => {
    const a = ordenOpciones(4, '7|120');
    expect(a).toEqual(ordenOpciones(4, '7|120'));
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
  });
});
