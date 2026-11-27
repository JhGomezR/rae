import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';

/** Plantillas limpias (solo membrete y estilos) de los formatos F-DOC-056 y F-DOC-047. */
export const CARPETA_DOCENTES = join(__dirname, '..', '..', '..', 'assets', 'docentes');

export const GRIS = 'D9D9D9';

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Texto {
  negrita?: boolean;
  cursiva?: boolean;
  tamano?: number;
  jc?: 'left' | 'center' | 'right' | 'both';
  antes?: number;
  despues?: number;
}

/** Fragmento con formato propio dentro de un párrafo. */
export interface Trozo {
  t: string;
  negrita?: boolean;
  cursiva?: boolean;
  tamano?: number;
}

function run(t: Trozo, base: Texto): string {
  const tam = t.tamano ?? base.tamano ?? 20;
  const props = [
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>',
    (t.negrita ?? base.negrita) ? '<w:b/><w:bCs/>' : '',
    (t.cursiva ?? base.cursiva) ? '<w:i/><w:iCs/>' : '',
    `<w:sz w:val="${tam}"/><w:szCs w:val="${tam}"/>`,
  ].join('');
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${esc(t.t)}</w:t></w:r>`;
}

/** Párrafo; cada salto de línea del texto se vuelve un párrafo para conservar el formato. */
export function p(contenido: string | Trozo[], o: Texto = {}): string {
  const ppr = `<w:pPr><w:spacing w:before="${o.antes ?? 0}" w:after="${o.despues ?? 0}" w:line="240" w:lineRule="auto"/><w:jc w:val="${o.jc ?? 'left'}"/></w:pPr>`;
  if (typeof contenido !== 'string') {
    return `<w:p>${ppr}${contenido.map((t) => run(t, o)).join('')}</w:p>`;
  }
  const lineas = contenido.split('\n');
  return lineas.map((l) => `<w:p>${ppr}${l ? run({ t: l }, o) : ''}</w:p>`).join('');
}

export interface Celda {
  contenido: string;
  ancho: number;
  relleno?: string;
  span?: number;
  vertical?: boolean;
  centrado?: boolean;
}

export const celda = (contenido: string, ancho: number, o: Partial<Celda> = {}): Celda => ({
  contenido,
  ancho,
  ...o,
});

function celdaXml(c: Celda): string {
  const props = [
    `<w:tcW w:w="${c.ancho}" w:type="dxa"/>`,
    c.span && c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : '',
    c.relleno ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.relleno}"/>` : '',
    c.vertical ? '<w:textDirection w:val="btLr"/>' : '',
    `<w:vAlign w:val="${c.centrado === false ? 'top' : 'center'}"/>`,
  ].join('');
  return `<w:tc><w:tcPr>${props}</w:tcPr>${c.contenido || p('')}</w:tc>`;
}

export function fila(celdas: Celda[], o: { alto?: number; cabecera?: boolean } = {}): string {
  const tr = [
    '<w:cantSplit/>',
    o.cabecera ? '<w:tblHeader/>' : '',
    o.alto ? `<w:trHeight w:val="${o.alto}" w:hRule="atLeast"/>` : '',
  ].join('');
  return `<w:tr><w:trPr>${tr}</w:trPr>${celdas.map(celdaXml).join('')}</w:tr>`;
}

const BORDES = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`)
  .join('');

export function tabla(columnas: number[], filas: string[], sinBordes = false): string {
  const ancho = columnas.reduce((s, x) => s + x, 0);
  const grid = columnas.map((c) => `<w:gridCol w:w="${c}"/>`).join('');
  const bordes = sinBordes
    ? '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
    : `<w:tblBorders>${BORDES}</w:tblBorders>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${ancho}" w:type="dxa"/><w:jc w:val="center"/>${bordes}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${filas.join('')}</w:tbl>`;
}

/** Casillas del formato: ☒ marcada, ☐ libre. */
export const casillas = (opciones: [string, boolean][]) =>
  opciones.map(([t, si]) => `${t} ${si ? '☒' : '☐'}`).join('        ');

/** Inserta el cuerpo en la plantilla (membrete y página del formato original). */
/**
 * Cambia textos del membrete en orden: cada par busca el siguiente fragmento de texto igual
 * y lo reemplaza (Word parte «F-DOC-056» en varios fragmentos).
 */
export function cambiarTextos(xml: string, cambios: [string, string][]): string {
  let desde = 0;
  let salida = xml;
  for (const [buscar, nuevo] of cambios) {
    const patron = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
    patron.lastIndex = desde;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(salida))) {
      if (m[1] === buscar) {
        const etiqueta = m[0].slice(0, m[0].indexOf('>') + 1);
        const reemplazo = `${etiqueta.includes('xml:space') ? etiqueta : etiqueta.replace('<w:t', '<w:t xml:space="preserve"')}${esc(nuevo)}</w:t>`;
        salida = salida.slice(0, m.index) + reemplazo + salida.slice(m.index + m[0].length);
        desde = m.index + reemplazo.length;
        break;
      }
    }
  }
  return salida;
}

export async function armarDocx(
  plantilla: string,
  cuerpo: string,
  titulo: string,
  encabezado: [string, string][] = [],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(join(CARPETA_DOCENTES, plantilla)));
  if (encabezado.length) {
    const h = await zip.file('word/header1.xml')?.async('string');
    if (h) zip.file('word/header1.xml', cambiarTextos(h, encabezado));
  }
  const doc = await zip.file('word/document.xml')?.async('string');
  if (!doc) throw new Error('Plantilla inválida');
  const ini = doc.indexOf('<w:p><w:r><w:t>{{CUERPO}}</w:t></w:r></w:p>');
  if (ini < 0) throw new Error('Plantilla sin marcador de cuerpo');
  zip.file(
    'word/document.xml',
    doc.slice(0, ini) +
      cuerpo +
      doc.slice(ini + '<w:p><w:r><w:t>{{CUERPO}}</w:t></w:r></w:p>'.length),
  );
  const core = await zip.file('docProps/core.xml')?.async('string');
  if (core) {
    zip.file(
      'docProps/core.xml',
      core.replace(
        '</cp:coreProperties>',
        `<dc:title>${esc(titulo)}</dc:title></cp:coreProperties>`,
      ),
    );
  }
  // Sin entradas de carpeta: algunos servicios en la nube no abren el archivo si las tiene.
  for (const [nombre, f] of Object.entries(zip.files)) if (f.dir) delete zip.files[nombre];
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** Logo del membrete, para repetirlo en el PDF. */
export async function logoPlantilla(plantilla: string): Promise<string | null> {
  const zip = await JSZip.loadAsync(await readFile(join(CARPETA_DOCENTES, plantilla)));
  const png = Object.keys(zip.files).find((n) => n.startsWith('word/media/') && n.endsWith('.png'));
  const datos = png ? await zip.file(png)?.async('base64') : null;
  return datos ? `data:image/png;base64,${datos}` : null;
}
