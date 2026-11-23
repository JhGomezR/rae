import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
import { Bloque, ClaveInforme, Firmante, Informe } from './informe.tipos';

export const CARPETA_PLANTILLAS = join(__dirname, '..', '..', '..', 'assets', 'informes');

const ANCHO = 8500;
const CELDAS_BARRA = 20;
const COL_ETIQUETA = 3100;
const COL_VALOR = 800;
const COL_CELDA = Math.floor((ANCHO - COL_ETIQUETA - COL_VALOR) / CELDAS_BARRA);
export const COLORES_SERIE = ['00909C', 'B45309'];

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface OpcionesTexto {
  negrita?: boolean;
  tamano?: number;
  color?: string;
}

function run(t: string, o: OpcionesTexto = {}) {
  const props = [
    o.negrita ? '<w:b/><w:bCs/>' : '',
    o.color ? `<w:color w:val="${o.color}"/>` : '',
    o.tamano ? `<w:sz w:val="${o.tamano}"/><w:szCs w:val="${o.tamano}"/>` : '',
  ].join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
}

function parrafo(
  t: string,
  o: OpcionesTexto & { jc?: string; antes?: number; despues?: number; seguir?: boolean } = {},
) {
  const ppr = `<w:pPr>${o.seguir ? '<w:keepNext/>' : ''}<w:spacing w:before="${o.antes ?? 0}" w:after="${o.despues ?? 120}" w:line="240" w:lineRule="auto"/><w:jc w:val="${o.jc ?? 'both'}"/></w:pPr>`;
  return `<w:p>${ppr}${t ? run(t, o) : ''}</w:p>`;
}

const SIN_BORDES =
  '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="single" w:sz="18" w:space="0" w:color="FFFFFF"/><w:insideV w:val="nil"/></w:tblBorders>';
const BORDES =
  '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders>';

function celda(contenido: string, ancho: number, extra = '') {
  return `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${extra}<w:vAlign w:val="center"/></w:tcPr>${contenido}</w:tc>`;
}

function tabla(columnas: string[], filas: string[][]) {
  const primera = columnas.length === 2 ? 6500 : columnas.length >= 5 ? 2100 : 3400;
  const resto = Math.floor((ANCHO - primera) / (columnas.length - 1));
  const anchos = columnas.map((_, i) => (i === 0 ? ANCHO - resto * (columnas.length - 1) : resto));
  const grid = anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('');
  const texto = (t: string, i: number, negrita = false) =>
    parrafo(t, { tamano: 18, negrita, despues: 0, jc: i === 0 ? 'left' : 'center' });
  const cab = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${columnas
    .map((c, i) =>
      celda(
        texto(c, i, true),
        anchos[i] as number,
        '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>',
      ),
    )
    .join('')}</w:tr>`;
  const cuerpo = filas
    .map(
      (f) =>
        `<w:tr><w:trPr><w:cantSplit/></w:trPr>${f.map((v, i) => celda(texto(v, i), anchos[i] as number)).join('')}</w:tr>`,
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${ANCHO}" w:type="dxa"/>${BORDES}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${cab}${cuerpo}</w:tbl>${parrafo('', { despues: 80, tamano: 8 })}`;
}

function barras(b: Extract<Bloque, { tipo: 'barras' }>) {
  const grid = [
    COL_ETIQUETA,
    ...Array.from({ length: CELDAS_BARRA }, () => COL_CELDA),
    ANCHO - COL_ETIQUETA - COL_CELDA * CELDAS_BARRA,
  ]
    .map((a) => `<w:gridCol w:w="${a}"/>`)
    .join('');
  const colValor = ANCHO - COL_ETIQUETA - COL_CELDA * CELDAS_BARRA;
  const pequena = (t: string, jc: string) => parrafo(t, { tamano: 17, despues: 0, jc });
  const filas = b.filas
    .flatMap((f) =>
      b.series.map((_, s) => {
        const v = f.valores[s] ?? null;
        const n = v === null ? 0 : Math.round((Math.min(v, b.maximo) / b.maximo) * CELDAS_BARRA);
        const vacias = CELDAS_BARRA - n;
        const span = (k: number) => (k > 1 ? `<w:gridSpan w:val="${k}"/>` : '');
        const lleno = n
          ? celda(
              pequena('', 'left'),
              n * COL_CELDA,
              `${span(n)}<w:shd w:val="clear" w:color="auto" w:fill="${COLORES_SERIE[s] ?? COLORES_SERIE[0]}"/>`,
            )
          : '';
        const resto = vacias ? celda(pequena('', 'left'), vacias * COL_CELDA, span(vacias)) : '';
        const valor =
          v === null
            ? '—'
            : `${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${b.unidad}`;
        const merge =
          b.series.length > 1 ? (s === 0 ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '';
        const etiqueta = celda(pequena(s === 0 ? f.etiqueta : '', 'left'), COL_ETIQUETA, merge);
        return `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="230" w:hRule="atLeast"/></w:trPr>${etiqueta}${lleno}${resto}${celda(pequena(valor, 'right'), colValor)}</w:tr>`;
      }),
    )
    .join('');
  const leyenda =
    b.series.length > 1
      ? `<w:p><w:pPr><w:keepNext/><w:spacing w:after="60"/></w:pPr>${b.series
          .map(
            (n, i) =>
              `${run('■ ', { color: COLORES_SERIE[i], tamano: 18 })}${run(`${n}    `, { tamano: 18 })}`,
          )
          .join('')}</w:p>`
      : '';
  return `${parrafo(b.titulo, { negrita: true, tamano: 20, despues: 60, antes: 60, jc: 'left', seguir: true })}${leyenda}<w:tbl><w:tblPr><w:tblW w:w="${ANCHO}" w:type="dxa"/>${SIN_BORDES}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${filas}</w:tbl>${parrafo('', { despues: 80, tamano: 8 })}`;
}

function bloqueXml(b: Bloque): string {
  if (b.tipo === 'parrafo') return parrafo(b.texto);
  if (b.tipo === 'subtitulo')
    return parrafo(b.texto, { negrita: true, jc: 'left', antes: 80, despues: 80, seguir: true });
  if (b.tipo === 'tabla') return tabla(b.columnas, b.filas);
  return barras(b);
}

function limites(xml: string, token: string) {
  const i = xml.indexOf(`{{${token}}}`);
  if (i < 0) throw new Error(`Plantilla sin marcador ${token}`);
  const ini = Math.max(xml.lastIndexOf('<w:p>', i), xml.lastIndexOf('<w:p ', i));
  const fin = xml.indexOf('</w:p>', i) + '</w:p>'.length;
  return { ini, fin, par: xml.slice(ini, fin) };
}

function sustituir(xml: string, token: string, nuevo: string) {
  const { ini, fin } = limites(xml, token);
  return xml.slice(0, ini) + nuevo + xml.slice(fin);
}

/** Conserva el formato del párrafo de la plantilla. */
function texto(xml: string, token: string, valor: string) {
  const { par } = limites(xml, token);
  const lineas = valor
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const nuevo = (lineas.length ? lineas : [''])
    .map((l) => par.replace(`{{${token}}}`, esc(l)))
    .join('');
  return sustituir(xml, token, nuevo);
}

function vinetas(xml: string, token: string, modelo: string, items: string[]) {
  return sustituir(xml, token, items.map((t) => modelo.replace('{{ITEM}}', esc(t))).join(''));
}

function dimensiones(b: Buffer): { ancho: number; alto: number } {
  if (b[0] === 0x89) return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) break;
    const m = b[i + 1] as number;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return { ancho: 607, alto: 187 };
}

function dibujoFirma(b: Buffer) {
  const { ancho, alto } = dimensiones(b);
  const escala = Math.min(2528515 / ancho, 780133 / alto);
  const cx = Math.round(ancho * escala);
  const cy = Math.round(alto * escala);
  const x = 1602029 + Math.round((2528515 - cx) / 2);
  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-220091</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="20" name="Firma" descr="Firma del responsable"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="20" name="Firma"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdFirma"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

const conKeepNext = (par: string) =>
  par.replace(/(<w:pPr>(?:<w:pStyle [^>]*\/>)?)/, '$1<w:keepNext/>');

/** Mantiene la fila de anexos junto a la firma, para que no quede sola en una página. */
function anexosConFirma(xml: string): string {
  const ini = xml.lastIndexOf('<w:tr ');
  const finTabla = xml.lastIndexOf('</w:tbl>');
  const inicioFirma = xml.indexOf('<w:p', finTabla);
  const finVacio = xml.indexOf('>', inicioFirma) + 1;
  const pegar = (t: string) =>
    t
      .replace(/<w:p(?: [^>]*)?\/>/g, '<w:p><w:pPr><w:keepNext/></w:pPr></w:p>')
      .replace(/<w:p(?: [^>/]*)?>(?!<w:pPr>)/g, '$&<w:pPr><w:keepNext/></w:pPr>')
      .replace(
        /<w:pPr>(?!(?:<w:pStyle [^>]*\/>)?<w:keepNext\/>)((?:<w:pStyle [^>]*\/>)?)/g,
        '<w:pPr>$1<w:keepNext/>',
      );
  return xml.slice(0, ini) + pegar(xml.slice(ini, finVacio)) + xml.slice(finVacio);
}

export async function generarDocx(clave: ClaveInforme, i: Informe, f: Firmante): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(join(CARPETA_PLANTILLAS, `${clave}.docx`)));
  const parte = zip.file('word/document.xml');
  if (!parte) throw new Error('Plantilla inválida');
  let xml = await parte.async('string');

  for (const [token, valor] of [
    ['PROGRAMA', i.programa],
    ['LUGAR', i.lugar],
    ['FECHA', i.fechaEntrega],
    ['PORCENTAJE', `${i.porcentaje}%`],
    ['PRESUPUESTO', i.presupuesto],
    ['ANEXOS', i.anexos],
    ['CARGO', f.cargo || ' '],
  ] as const) {
    xml = texto(xml, token, valor);
  }

  const modelo = limites(xml, 'IMPACTOS').par.replace('{{IMPACTOS}}', '{{ITEM}}');
  xml = vinetas(xml, 'LOGROS', modelo, i.logros);
  xml = vinetas(xml, 'IMPACTOS', modelo, i.impactos);
  xml = sustituir(xml, 'INFORME', i.bloques.map(bloqueXml).join(''));

  const parFirmante = limites(xml, 'FIRMANTE').par;
  xml = sustituir(
    xml,
    'FIRMANTE',
    conKeepNext(
      parFirmante.replace('{{FIRMANTE}}', esc(f.nombre || '______________________________')),
    ),
  );
  const parFirma = limites(xml, 'FIRMA').par;
  const pprFirma = /<w:pPr>.*?<\/w:pPr>/s.exec(parFirma)?.[0] ?? '';
  const vacio = conKeepNext(`<w:p>${pprFirma}</w:p>`);
  if (f.firma) {
    const ext = f.firma.tipo === 'image/png' ? 'png' : 'jpeg';
    zip.file(`word/media/firma.${ext}`, f.firma.datos);
    const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
    zip.file(
      'word/_rels/document.xml.rels',
      (rels ?? '').replace(
        '</Relationships>',
        `<Relationship Id="rIdFirma" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/firma.${ext}"/></Relationships>`,
      ),
    );
    const tipos = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
    if (!tipos.includes(`Extension="${ext}"`)) {
      zip.file(
        '[Content_Types].xml',
        tipos.replace(
          '<Override',
          `<Default Extension="${ext}" ContentType="${f.firma.tipo}"/><Override`,
        ),
      );
    }
    xml = sustituir(
      xml,
      'FIRMA',
      conKeepNext(`<w:p>${pprFirma}${dibujoFirma(f.firma.datos)}</w:p>`),
    );
  } else {
    // Espacio para firmar a mano.
    xml = sustituir(xml, 'FIRMA', vacio + vacio + vacio);
  }
  zip.file('word/document.xml', anexosConFirma(xml));
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
