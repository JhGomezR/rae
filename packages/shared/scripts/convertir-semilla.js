/* Convierte los datos del prototipo (web/data/*.js) a JSON versionado en packages/shared/seed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origen = process.argv[2] ?? 'D:/rae/web/data';
const destino = path.join(__dirname, '..', 'seed');
fs.mkdirSync(destino, { recursive: true });

const contexto = { window: {} };
vm.createContext(contexto);
for (const archivo of ['curriculo.js', 'preguntas.js', 'practicas.js', 'pep.js']) {
  vm.runInContext(fs.readFileSync(path.join(origen, archivo), 'utf8'), contexto);
}
const w = JSON.parse(JSON.stringify(contexto.window));
const escribir = (nombre, datos) =>
  fs.writeFileSync(path.join(destino, nombre), `${JSON.stringify(datos, null, 1)}\n`);

escribir('curriculo.json', { version: w.CURRICULO_VERSION, unidades: w.CURRICULO_BASE });
escribir('preguntas.json', { preguntas: w.PREGUNTAS, descartados: w.TEXTOS_DESCARTADOS ?? [] });
escribir('practicas.json', w.PRACTICAS);
escribir('pep.json', w.PEP);
console.log(
  `unidades=${w.CURRICULO_BASE.length} preguntas=${Object.keys(w.PREGUNTAS).length} practicas=${Object.keys(w.PRACTICAS).length}`,
);
