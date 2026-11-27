import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { pdfABuffer } from '../../infrastructure/pdf/impresora';
import { bloqueXml, CARPETA_PLANTILLAS, esc, parrafo } from '../informes/render-docx';
import { bloquePdf, MARGEN, PAGINA } from '../informes/render-pdf';
import type { InformePoa } from './informe-poa';

/** Se reutiliza el membrete institucional de las plantillas de informes. */
const MEMBRETE = join(CARPETA_PLANTILLAS, '021.docx');
const PROCESO = 'PLANEACIÓN INSTITUCIONAL';

function firmaXml(i: InformePoa): string {
  const seguir = { seguir: true, jc: 'center', despues: 0 } as const;
  return [
    parrafo('', { ...seguir, antes: 600 }),
    parrafo('______________________________', seguir),
    parrafo(i.firmante, { ...seguir, negrita: true }),
    parrafo(i.cargo || ' ', { jc: 'center', despues: 0 }),
  ].join('');
}

export async function generarDocxPoa(i: InformePoa): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(MEMBRETE));
  const parte = zip.file('word/document.xml');
  if (!parte) throw new Error('Plantilla inválida');
  const xml = await parte.async('string');
  const ini = xml.indexOf('<w:body>') + '<w:body>'.length;
  const fin = xml.lastIndexOf('<w:sectPr');
  const cuerpo = [
    parrafo(i.titulo, { negrita: true, jc: 'center', tamano: 24, despues: 60 }),
    parrafo(i.subtitulo, { jc: 'center', tamano: 20, despues: 240, color: '595959' }),
    ...i.bloques.map(bloqueXml),
    firmaXml(i),
  ].join('');
  zip.file('word/document.xml', xml.slice(0, ini) + cuerpo + xml.slice(fin));

  const encabezado = zip.file('word/header1.xml');
  if (encabezado) {
    const h = await encabezado.async('string');
    zip.file('word/header1.xml', h.replace('ACREDITACIÓN Y AUTOEVALUACIÓN', esc(PROCESO)));
  }
  const core = await zip.file('docProps/core.xml')?.async('string');
  if (core) {
    zip.file(
      'docProps/core.xml',
      core
        .replace(/<dc:title>.*?<\/dc:title>/s, '')
        .replace(
          '</cp:coreProperties>',
          `<dc:title>${esc(i.titulo)}</dc:title></cp:coreProperties>`,
        ),
    );
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function generarPdfPoa(i: InformePoa): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(MEMBRETE));
  const membrete = await zip.file('word/media/image2.jpg')?.async('base64');
  const firma: Content = {
    unbreakable: true,
    stack: [
      { text: '______________________________', alignment: 'center', margin: [0, 50, 0, 0] },
      { text: i.firmante, bold: true, alignment: 'center' },
      { text: i.cargo, alignment: 'center' },
    ],
  };
  const doc: TDocumentDefinitions = {
    pageSize: { width: PAGINA.ancho, height: PAGINA.alto },
    pageMargins: [MARGEN, 140, MARGEN, 78],
    info: { title: `${i.titulo} - ${i.subtitulo}`, author: 'Seguimiento RAE' },
    background: membrete
      ? { image: `data:image/jpeg;base64,${membrete}`, width: PAGINA.ancho, height: PAGINA.alto }
      : undefined,
    header: {
      text: PROCESO,
      bold: true,
      alignment: 'right',
      fontSize: 10,
      margin: [MARGEN, 96, MARGEN, 0],
    },
    footer: (pagina, total) => ({
      text: `Página ${pagina} de ${total}`,
      alignment: 'right',
      fontSize: 8,
      color: '#595959',
      margin: [MARGEN, 40, MARGEN, 0],
    }),
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.1 },
    content: [
      { text: i.titulo, bold: true, fontSize: 11, alignment: 'center', margin: [0, 0, 0, 3] },
      { text: i.subtitulo, alignment: 'center', color: '#595959', margin: [0, 0, 0, 12] },
      ...i.bloques.map(bloquePdf),
      firma,
    ],
  };
  return pdfABuffer(doc);
}
