/* Prueba de punta a punta contra el despliegue real, con personas ficticias. */
import ExcelJS from 'exceljs';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN = process.env.ADMIN_DOCUMENTO;
const CLAVE_ADMIN = process.env.ADMIN_CLAVE_INICIAL;
let pruebas = 0;

function ok(condicion, mensaje) {
  if (!condicion) throw new Error(`FALLÓ: ${mensaje}`);
  pruebas++;
  console.log(`  ok ${mensaje}`);
}

class Cliente {
  cookies = new Map();
  async pedir(ruta, { metodo = 'GET', json, form } = {}) {
    const headers = { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (json !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers,
      redirect: 'manual',
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
    for (const c of res.headers.getSetCookie()) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      const valor = par.slice(i + 1);
      if (valor) this.cookies.set(par.slice(0, i), valor);
      else this.cookies.delete(par.slice(0, i));
    }
    return res;
  }
  async datos(ruta, opciones) {
    const res = await this.pedir(ruta, opciones);
    const texto = await res.text();
    if (!res.ok) throw new Error(`${ruta} → ${res.status}: ${texto.slice(0, 300)}`);
    return texto ? JSON.parse(texto) : null;
  }
  async entrar(documento, clave, email) {
    await this.datos('/api/auth/login', { metodo: 'POST', json: { documento, clave } });
    if (email) {
      await this.datos('/api/auth/primer-ingreso', {
        metodo: 'POST',
        json: { claveNueva: `Nueva-Clave-${email.length}!x`, email },
      });
    }
  }
}

async function consolidado() {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Consolidado');
  hoja.addRow([
    'PERIODO',
    'SEDE',
    'PROGRAMA',
    'SEMESTRE',
    'GRUPO',
    'ID.ESTUDIANTE',
    'ESTUDIANTE',
    'ID.DOCENTE',
    'DOCENTE',
    'UNIDAD DE FORMACIÓN',
  ]);
  const fila = (id, est, unidad, doc = 90000001, nomDoc = 'ROJAS MEJIA LUIS ANDRES') =>
    hoja.addRow([
      '2026-2',
      'SEDE-PRUEBA',
      'INGENIERIA DE SISTEMAS',
      1,
      'A',
      id,
      est,
      doc,
      nomDoc,
      unidad,
    ]);
  fila(80000001, 'DE LA CRUZ PEREZ ANA LUCIA', 'RAZONAMIENTO LOGICO Y CUANTITATIVO');
  fila(80000002, 'PEÑA TORRES JUAN CAMILO', 'RAZONAMIENTO LOGICO Y CUANTITATIVO');
  fila(
    80000002,
    'PEÑA TORRES JUAN CAMILO',
    'ALGORÍTMOS Y PROGRAMACIÓN I',
    90000002,
    'VEGA SOLIS MARTA ELENA',
  );
  fila(80000003, 'SIN UNIDAD PRUEBA UNO', 'UNIDAD QUE NO EXISTE');
  hoja.addRow([
    '2026-2',
    'SEDE-PRUEBA',
    'INGENIERIA DE SISTEMAS',
    1,
    'A',
    80000004,
    'SIN DOCENTE PRUEBA DOS',
    '',
    '',
    'LECTURA CRÍTICA',
  ]);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const itemsDe = (e) => e.secciones.flatMap((s) => s.grupos.flatMap((g) => g.items));

async function importar(admin) {
  const form = new FormData();
  form.append('archivo', new Blob([await consolidado()]), 'prueba.xlsx');
  const v = await admin.datos('/api/importaciones/consolidado/previsualizar', {
    metodo: 'POST',
    form,
  });
  await admin.datos(`/api/importaciones/${v.importacionId}/aplicar`, { metodo: 'POST' });
  return v;
}

async function main() {
  console.log('Acceso');
  ok((await fetch(`${BASE}/api/salud`)).ok, 'la API y la base de datos responden');
  const anon = await new Cliente().pedir('/admin/panel');
  ok(
    anon.status === 307 && anon.headers.get('location') === '/login',
    'sin sesión redirige a /login',
  );
  ok((await new Cliente().pedir('/api/usuarios')).status === 401, 'la API exige sesión');

  const admin = new Cliente();
  await admin.datos('/api/auth/login', {
    metodo: 'POST',
    json: { documento: ADMIN, clave: CLAVE_ADMIN },
  });
  ok((await admin.pedir('/api/usuarios')).status === 403, 'el primer ingreso es obligatorio');
  const pagina = await admin.pedir('/admin/panel');
  ok(pagina.headers.get('location') === '/primer-ingreso', 'la web fuerza el primer ingreso');
  await admin.datos('/api/auth/primer-ingreso', {
    metodo: 'POST',
    json: { claveNueva: 'Admin-Prueba-2026!', email: 'admin@example.test' },
  });

  console.log('Currículo e importación');
  const unidades = await admin.datos('/api/curriculo/unidades');
  ok(unidades.length === 62, '62 unidades sembradas');
  const v = await importar(admin);
  ok(v.resumen.validas === 3, 'tres filas válidas');
  ok(v.errores.length === 2, 'dos filas con error reportadas');
  ok(v.resumen.unidadesSinEmparejar.length === 1, 'unidad sin emparejar detectada');
  await importar(admin);
  const cursos = await admin.datos('/api/cursos');
  ok(cursos.total === 2, 'importar dos veces no duplica cursos');

  const periodo = (await admin.datos('/api/periodos')).find((p) => p.codigo === '2026-2');
  ok(periodo?.activo, 'el periodo importado queda activo');
  await admin.datos(`/api/periodos/${periodo.id}`, {
    metodo: 'PATCH',
    json: { apreciacionAbierta: true, alcanceAbierto: true },
  });

  console.log('Claves iniciales y aislamiento');
  const ana = new Cliente();
  await ana.entrar('80000001', '80000001 de la cruz', 'ana@example.test');
  const juan = new Cliente();
  await juan.entrar('80000002', '80000002peña', 'juan@example.test');
  const docente = new Cliente();
  await docente.entrar('90000001', '90000001luis', 'luis@example.test');
  const otraDocente = new Cliente();
  await otraDocente.entrar('90000002', '90000002MARTA', 'marta@example.test');

  const cursosAna = await ana.datos('/api/mis-cursos');
  const cursosJuan = await juan.datos('/api/mis-cursos');
  const cursosDoc = await docente.datos('/api/mis-cursos');
  ok(cursosAna.length === 1, 'la estudiante ve solo su curso');
  ok(cursosJuan.length === 2, 'el otro estudiante ve sus dos cursos');
  ok(cursosDoc.length === 1, 'el docente ve solo su curso');
  const ajeno = cursosJuan.find((c) => c.id !== cursosAna[0].id).id;
  ok(
    (await ana.pedir(`/api/encuestas/${ajeno}/alcance`)).status === 403,
    'estudiante no abre curso ajeno',
  );
  ok(
    (await docente.pedir(`/api/encuestas/${ajeno}/alcance`)).status === 403,
    'docente no abre curso ajeno',
  );
  ok((await ana.pedir('/api/usuarios')).status === 403, 'estudiante no entra a administración');
  ok(
    (await ana.pedir('/admin/panel')).headers.get('location') === '/mis-encuestas',
    'la web bloquea /admin',
  );

  console.log('Encuestas');
  const id = cursosAna[0].id;
  const ap = await ana.datos(`/api/encuestas/${id}/apreciacion`);
  const itemsAp = itemsDe(ap);
  ok(itemsAp.length > 0 && /é\b/.test(itemsAp[0].frase.split(' ')[0]), 'apreciación en futuro');
  await ana.datos(`/api/encuestas/${id}/apreciacion/enviar`, {
    metodo: 'POST',
    json: {
      general: { acuerdoPedagogico: 1, integralidad: 4 },
      items: Object.fromEntries(itemsAp.map((i) => [i.id, { nivel: 3 }])),
    },
  });

  const al = await ana.datos(`/api/encuestas/${id}/alcance`);
  const crudo = JSON.stringify(al);
  ok(
    !crudo.includes('indiceCorrecta') && !crudo.includes('acierto'),
    'la respuesta correcta no sale del servidor',
  );
  const itemsAl = itemsDe(al);
  ok(
    itemsAl.every((i) => i.pregunta),
    'cada ítem de alcance tiene pregunta práctica',
  );
  const incompleta = await ana.pedir(`/api/encuestas/${id}/alcance/enviar`, {
    metodo: 'POST',
    json: { items: {} },
  });
  ok(incompleta.status === 422, 'una encuesta incompleta se rechaza');
  await ana.datos(`/api/encuestas/${id}/alcance/enviar`, {
    metodo: 'POST',
    json: {
      general: { integralidad: 5, efectividadEstrategias: 4 },
      items: Object.fromEntries(itemsAl.map((i) => [i.id, { nivel: 4, opcionElegida: 0 }])),
    },
  });

  const alDoc = await docente.datos(`/api/encuestas/${id}/alcance`);
  const itemsDoc = itemsDe(alDoc);
  const malo = Object.fromEntries(
    itemsDoc.map((i) => [i.id, { evaluados: 5, alcanzan: 9, opcionElegida: 0 }]),
  );
  ok(
    (
      await docente.pedir(`/api/encuestas/${id}/alcance/enviar`, {
        metodo: 'POST',
        json: { items: malo },
      })
    ).status === 422,
    'alcanzan no puede superar evaluados',
  );
  const estrategias = alDoc.estrategiasCatalogo;
  await docente.datos(`/api/encuestas/${id}/alcance/enviar`, {
    metodo: 'POST',
    json: {
      general: { evaluados: 10, retroalimentacionRa: 1 },
      items: Object.fromEntries(
        itemsDoc.map((i) => [
          i.id,
          { evaluados: 10, alcanzan: 8, opcionElegida: 0, instrumento: 'Rúbrica' },
        ]),
      ),
      estrategias: [
        ...estrategias.filter((e) => e.tipo === 'DIDACTICA').slice(0, 3),
        ...estrategias.filter((e) => e.tipo === 'ACTIVA').slice(0, 1),
      ].map((e) => e.id),
      recomendaciones: ['Más práctica de laboratorio'],
    },
  });

  console.log('Resultados y exportes');
  const tabla = await admin.datos('/api/resultados/alcance');
  const fila = tabla.filas.find((f) => f.docentes.respuestas === 1);
  ok(fila?.docentes.logro === 80, 'logro docente calculado (80 %)');
  ok(fila?.estudiantes.nivel === 4, 'nivel percibido calculado');
  ok(typeof fila?.estudiantes.aciertos === 'number', 'aciertos calculados');
  const plan = await admin.datos('/api/plan-mejoramiento');
  ok(plan.caracteristicas.length === 3, 'plan con las características 18–24');
  ok(
    (await admin.datos('/api/resultados/panel')).alcance.enviadas === 2,
    'panel con participación',
  );

  const xlsx = await admin.pedir('/api/reportes/matriz?rol=DOCENTE&momento=ALCANCE');
  const bytes = Buffer.from(await xlsx.arrayBuffer());
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(bytes);
  ok(
    xlsx.ok && libro.worksheets[0].rowCount === itemsDoc.length + 1,
    'Excel de profesores con una fila por ítem',
  );
  const pdf = await admin.pedir('/api/reportes/plan-mejoramiento.pdf');
  ok(
    pdf.ok &&
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 4)
        .toString() === '%PDF',
    'PDF del plan',
  );

  console.log('Sesión');
  const viejo = ana.cookies.get('refresh');
  await ana.datos('/api/auth/refresh', { metodo: 'POST' });
  const robado = new Cliente();
  robado.cookies.set('refresh', viejo);
  ok(
    (await robado.pedir('/api/auth/refresh', { metodo: 'POST' })).status === 401,
    'reutilizar un token se detecta',
  );
  ok(
    (await ana.pedir('/api/auth/refresh', { metodo: 'POST' })).status === 401,
    'y revoca la sesión',
  );
  await admin.datos(`/api/periodos/${periodo.id}`, {
    metodo: 'PATCH',
    json: { alcanceAbierto: false },
  });
  ok(
    (await juan.pedir(`/api/encuestas/${ajeno}/alcance/enviar`, { metodo: 'POST', json: {} }))
      .status === 409,
    'momento cerrado no recibe respuestas',
  );

  console.log(`\nTodo correcto: ${pruebas} comprobaciones.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
