import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fuentes = require('pdfmake/build/vfs_fonts') as {
  pdfMake?: { vfs: Record<string, string> };
  vfs?: Record<string, string>;
} & Record<string, unknown>;
const vfs = (fuentes.pdfMake?.vfs ?? fuentes.vfs ?? fuentes) as Record<string, string>;
const fuente = (a: string) => Buffer.from(vfs[a] as string, 'base64');

export function crearImpresora(): PdfPrinter {
  return new PdfPrinter({
    Roboto: {
      normal: fuente('Roboto-Regular.ttf'),
      bold: fuente('Roboto-Medium.ttf'),
      italics: fuente('Roboto-Italic.ttf'),
      bolditalics: fuente('Roboto-MediumItalic.ttf'),
    },
  });
}

export function pdfABuffer(doc: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = crearImpresora().createPdfKitDocument(doc);
    const partes: Buffer[] = [];
    pdf.on('data', (p: Buffer) => partes.push(p));
    pdf.on('end', () => resolve(Buffer.concat(partes)));
    pdf.on('error', reject);
    pdf.end();
  });
}
