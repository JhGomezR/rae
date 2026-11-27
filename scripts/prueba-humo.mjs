/* Prueba de punta a punta contra el despliegue real, con personas ficticias. */
import ExcelJS from 'exceljs';
import ExcelJSZip from 'jszip';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN = process.env.ADMIN_DOCUMENTO;
const CLAVE_ADMIN = process.env.ADMIN_CLAVE_INICIAL;
let pruebas = 0;

function ok(condicion, mensaje) {
  if (!condicion) throw new Error(`FALLÓ: ${mensaje}`);
  pruebas++;
  console.log(`  ok ${mensaje}`);
}

const destino = (res) => new URL(res.headers.get('location') ?? '/', BASE).pathname;

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
  ok(anon.status === 307 && destino(anon) === '/login', 'sin sesión redirige a /login');
  ok((await new Cliente().pedir('/api/usuarios')).status === 401, 'la API exige sesión');

  const admin = new Cliente();
  await admin.datos('/api/auth/login', {
    metodo: 'POST',
    json: { documento: ADMIN, clave: CLAVE_ADMIN },
  });
  ok((await admin.pedir('/api/usuarios')).status === 403, 'el primer ingreso es obligatorio');
  const pagina = await admin.pedir('/admin/panel');
  ok(destino(pagina) === '/primer-ingreso', 'la web fuerza el primer ingreso');
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
  ok(destino(await ana.pedir('/admin/panel')) === '/mis-encuestas', 'la web bloquea /admin');

  console.log('Encuestas');
  const id = cursosAna[0].id;
  const ap = await ana.datos(`/api/encuestas/${id}/apreciacion`);
  const itemsAp = itemsDe(ap);
  ok(itemsAp.length > 0 && /(^|\s)\p{L}+é(\s|$)/u.test(itemsAp[0].frase), 'apreciación en futuro');
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

  console.log('Informes');
  const informes = await admin.datos('/api/informes');
  ok(informes.informes.length === 3, 'los tres informes tienen estadísticas');
  ok((await juan.pedir('/api/informes')).status === 403, 'un estudiante no accede a informes');
  for (const clave of ['021', '022', '023']) {
    const word = await admin.pedir(`/api/informes/${clave}/descargar?formato=docx`);
    const bw = Buffer.from(await word.arrayBuffer());
    const zip = await ExcelJSZip.loadAsync(bw);
    const xml = await zip.file('word/document.xml').async('string');
    ok(
      word.ok && !xml.includes('{{') && !xml.includes('w:highlight'),
      `Word ${clave} diligenciado`,
    );
    const pdf2 = await admin.pedir(`/api/informes/${clave}/descargar?formato=pdf`);
    ok(
      pdf2.ok &&
        Buffer.from(await pdf2.arrayBuffer())
          .subarray(0, 4)
          .toString() === '%PDF',
      `PDF ${clave}`,
    );
  }

  console.log('Gestión del currículo');
  const nueva = await admin.datos('/api/curriculo/unidades', {
    metodo: 'POST',
    json: { nombre: 'Unidad de prueba gestión', semestre: 3, ciclo: 'TECNOLOGICO' },
  });
  ok(nueva.id === 63, 'crear unidad nueva');
  ok(
    (
      await admin.pedir('/api/curriculo/unidades', {
        metodo: 'POST',
        json: { nombre: 'UNIDAD DE PRUEBA GESTION', semestre: 3, ciclo: 'TECNOLOGICO' },
      })
    ).status === 409,
    'no se duplica el nombre de una unidad',
  );
  const comp = await admin.datos(`/api/curriculo/unidades/${nueva.id}/competencias`, {
    metodo: 'POST',
    json: {
      codigo: 'CG99',
      tipo: 'ESPECIFICA',
      texto: 'Competencia creada en la prueba de gestión',
      tituloCorto: 'Prueba',
      capacidad: 'resolver problemas de prueba',
    },
  });
  ok(comp.tipo === 'GENERICA', 'el código CG manda sobre el tipo elegido');
  await admin.datos(`/api/curriculo/unidades/${nueva.id}/items`, {
    metodo: 'POST',
    json: {
      tipo: 'RA',
      competenciaUnidadId: comp.id,
      texto: 'Resultado de aprendizaje de prueba',
      capacidad: 'aplicar lo aprendido en la prueba',
    },
  });
  const obj = await admin.datos(`/api/curriculo/unidades/${nueva.id}/items`, {
    metodo: 'POST',
    json: {
      tipo: 'OBJETIVO',
      texto: 'Objetivo de la prueba de gestión',
      capacidad: 'explicar el objetivo de prueba',
    },
  });
  let det = await admin.datos(`/api/curriculo/unidades/${nueva.id}`);
  ok(
    det.items.filter((i) => i.activo).length === 2,
    'al agregar un RA la competencia deja de preguntarse completa',
  );
  await admin.datos(`/api/curriculo/items/${obj.id}`, { metodo: 'PUT', json: { activo: false } });
  det = await admin.datos(`/api/curriculo/unidades/${nueva.id}`);
  ok(
    det.items.length === 3 && det.items.filter((i) => i.activo).length === 1,
    'eliminar un ítem es borrado lógico',
  );
  await admin.datos(`/api/curriculo/competencias/${comp.id}`, {
    metodo: 'PUT',
    json: { activo: false },
  });
  const lista = await admin.datos('/api/curriculo/unidades');
  ok(
    lista.find((u) => u.id === nueva.id).conteo.genericas === 0,
    'los RA de una competencia eliminada no cuentan',
  );
  await admin.datos(`/api/curriculo/unidades/${nueva.id}`, {
    metodo: 'PATCH',
    json: { activo: false },
  });
  ok(
    (await admin.datos('/api/curriculo/unidades')).find((u) => u.id === nueva.id).activo === false,
    'eliminar una unidad es borrado lógico',
  );

  console.log('Gestión de cursos');
  const opc = await admin.datos('/api/cursos/opciones');
  ok(
    !opc.unidades.some((u) => u.id === nueva.id),
    'las unidades eliminadas no se ofrecen para cursos',
  );
  const docenteId = opc.docentes[0].id;
  const curso = await admin.datos('/api/cursos', {
    metodo: 'POST',
    json: {
      periodoId: periodo.id,
      unidadId: 1,
      docenteId,
      sede: 'SEDE-PRUEBA',
      programa: 'INGENIERIA DE SISTEMAS',
      grupo: 'z',
      semestreOferta: 1,
    },
  });
  ok(curso.grupo === 'Z', 'crear curso');
  ok(
    (
      await admin.pedir('/api/cursos', {
        metodo: 'POST',
        json: {
          periodoId: periodo.id,
          unidadId: 1,
          docenteId,
          sede: 'SEDE-PRUEBA',
          programa: 'INGENIERIA DE SISTEMAS',
          grupo: 'Z',
          semestreOferta: 1,
        },
      })
    ).status === 409,
    'no se duplica un curso',
  );
  await admin.datos(`/api/cursos/${curso.id}/inscripciones`, {
    metodo: 'POST',
    json: { documento: '80000001' },
  });
  ok(
    (await ana.datos('/api/mis-cursos')).some((c) => c.id === curso.id),
    'inscribir estudiante a un curso',
  );
  const panelAntes = await admin.datos('/api/resultados/panel');
  await admin.datos(`/api/cursos/${curso.id}`, { metodo: 'PATCH', json: { activo: false } });
  ok(
    !(await ana.datos('/api/mis-cursos')).some((c) => c.id === curso.id),
    'un curso inactivo desaparece para el estudiante',
  );
  ok(
    (await ana.pedir(`/api/encuestas/${curso.id}/apreciacion/enviar`, { metodo: 'POST', json: {} }))
      .status === 409,
    'un curso inactivo no recibe respuestas',
  );
  const panelDespues = await admin.datos('/api/resultados/panel');
  ok(panelDespues.cursos === panelAntes.cursos - 1, 'un curso inactivo no cuenta en el panel');
  await admin.datos(`/api/cursos/${curso.id}`, { metodo: 'PATCH', json: { activo: true } });
  const insc = await admin.datos(`/api/cursos/${curso.id}/inscripciones`);
  await admin.datos(`/api/cursos/${curso.id}/inscripciones/${insc[0].id}`, {
    metodo: 'PATCH',
    json: { activa: false },
  });
  ok(
    !(await ana.datos('/api/mis-cursos')).some((c) => c.id === curso.id),
    'retirar a un estudiante del curso',
  );
  ok(
    (
      await admin.pedir(`/api/cursos/${cursos.datos[0].id}`, {
        metodo: 'PATCH',
        json: { unidadId: 2 },
      })
    ).status === 409,
    'no se cambia la unidad de un curso con encuestas',
  );

  console.log('Estadísticas del panel');
  const est = panelDespues.estadisticas.momentos.ALCANCE;
  ok(
    est.estudiantes.esperadas ===
      est.estudiantes.enviadas + est.estudiantes.borrador + est.estudiantes.pendientes,
    'enviadas + borrador + pendientes = esperadas',
  );
  ok(
    est.personasEstudiantes.total ===
      est.personasEstudiantes.completaron +
        est.personasEstudiantes.parcial +
        est.personasEstudiantes.ninguna,
    'personas por estado suman el total',
  );
  ok(
    est.porSemestre.length > 0 && est.porSede.length > 0 && est.nivelesEstudiantes.length === 4,
    'participación por semestre, sede y niveles',
  );
  ok(panelDespues.estadisticas.ingreso.estudiantes.ingresaron >= 2, 'ingreso a la plataforma');

  console.log('Auditoría');
  const intentoMalo = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ documento: '80000002', clave: 'clave-equivocada' }),
  });
  ok(intentoMalo.status === 401, 'una contraseña equivocada se rechaza');
  const fallidos = await admin.datos('/api/auditoria?tipo=fallidos&q=80000002');
  ok(
    fallidos.datos[0]?.accion === 'LOGIN_FALLIDO' &&
      /Contraseña incorrecta/.test(fallidos.datos[0].detalle ?? ''),
    'el intento fallido queda en la auditoría',
  );
  const ingresos = await admin.datos('/api/auditoria?tipo=sesiones&q=DE%20LA%20CRUZ');
  ok(
    ingresos.datos.some((r) => r.accion === 'LOGIN' && r.usuario?.documento === '80000001'),
    'el buscador encuentra inicios de sesión por nombre',
  );
  ok(
    ingresos.datos.some((r) => r.accion === 'PRIMER_INGRESO'),
    'el primer ingreso queda registrado',
  );
  const cambios = await admin.datos('/api/auditoria?tipo=cambios');
  ok(
    cambios.total > 0 && cambios.datos.every((r) => r.entidad !== 'sesion'),
    'filtro de cambios de administración',
  );
  ok((await ana.pedir('/api/auditoria')).status === 403, 'solo el administrador ve la auditoría');

  console.log('Sesión');
  const sesion = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ documento: ADMIN, clave: 'Admin-Prueba-2026!' }),
  });
  const refresco = sesion.headers.getSetCookie().find((c) => c.startsWith('refresh='));
  ok(/Max-Age=900\b/i.test(refresco ?? ''), 'la sesión vence tras 15 minutos sin actividad');
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

  console.log('Plan Operativo Anual (POA)');
  const datosPoa = {
    vigencia: 2025,
    fechaElaboracion: '2025-03-01',
    dependencia: 'Programa de prueba',
    areaFacultad: 'FICB',
    responsable: 'Responsable Ficticio',
    cargo: 'Director de programa',
  };
  const poa = await admin.datos('/api/poa', { metodo: 'POST', json: datosPoa });
  const otroPoa = await admin.pedir('/api/poa', { metodo: 'POST', json: datosPoa });
  ok(otroPoa.status === 409, 'no se permiten dos POA de la misma vigencia');
  ok((await docente.pedir('/api/poa')).status === 403, 'solo el administrador ve el POA');
  const actividadPoa = (n, actividad, meses, tipoIndicador) =>
    admin.datos(`/api/poa/${poa.id}/actividades`, {
      metodo: 'POST',
      json: {
        numero: n,
        ejePgr: 'Pilar 1: Excelencia Académica',
        actividad,
        tipoIndicador,
        indicadorActividad: '1 documento',
        responsableEjecucion: 'Dirección de Programa',
        meses,
        presupuesto: 1000000,
      },
    });
  await actividadPoa(1, 'Actividad de prueba temprana', [1, 2], 'LOGRO');
  await actividadPoa(2, 'Actividad de prueba tardía', [11, 12], 'GESTION');
  let detallePoa = await admin.datos(`/api/poa/${poa.id}`);
  ok(
    detallePoa.desempeno.estados.ATRASADA === 2 && detallePoa.desempeno.semaforo === 'CRITICO',
    'sin seguimiento al cierre de la vigencia todo queda atrasado',
  );
  const excelPoa = await admin.pedir(`/api/poa/${poa.id}/descargar?formato=xlsx`);
  const bytesPoa = Buffer.from(await excelPoa.arrayBuffer());
  const libroPoa = new ExcelJS.Workbook();
  await libroPoa.xlsx.load(bytesPoa);
  const hojaPoa = libroPoa.getWorksheet('POA 2025');
  ok(
    hojaPoa?.getCell('J12').value === 'Actividad de prueba temprana' &&
      hojaPoa.getCell('O12').value === 'X' &&
      hojaPoa.getCell('AB8').value === 2025,
    'el Excel sale en el formato F-PIN-001 diligenciado',
  );
  ok(!!libroPoa.getWorksheet('Seguimiento 2025'), 'el Excel incluye la hoja de seguimiento');
  const formPoa = new FormData();
  formPoa.append('archivo', new Blob([bytesPoa]), 'poa.xlsx');
  const reimportado = await admin.datos('/api/poa/importar', { metodo: 'POST', form: formPoa });
  ok(
    reimportado.actividades === 2 && reimportado.reemplazado,
    'el Excel F-PIN-001 se vuelve a importar',
  );
  detallePoa = await admin.datos(`/api/poa/${poa.id}`);
  const [temprana, tardia] = detallePoa.actividades;
  ok(
    temprana.tipoIndicador === 'LOGRO' &&
      tardia.meses.join() === '11,12' &&
      detallePoa.responsable === 'Responsable Ficticio',
    'la importación conserva tipo, meses e información básica',
  );
  const seguir = (a, mes, avance) =>
    admin.datos(`/api/poa/actividades/${a.id}/seguimiento/${mes}`, {
      metodo: 'PUT',
      json: { avance, logro: `Avance de prueba ${avance}`, evidencia: null, ejecutado: 250000 },
    });
  await seguir(temprana, 2, 100);
  await seguir(tardia, 11, 50);
  const corte = (await admin.datos(`/api/poa/${poa.id}?mes=11`)).desempeno;
  ok(
    corte.avance === 75 && corte.indice === 100 && corte.semaforo === 'SATISFACTORIO',
    'el desempeño compara el avance real con el programado al corte',
  );
  ok(
    corte.estados.CUMPLIDA === 1 && corte.estados.EN_CURSO === 1 && corte.ejecutado === 500000,
    'estados y presupuesto ejecutado del POA',
  );
  const formPoa2 = new FormData();
  formPoa2.append('archivo', new Blob([bytesPoa]), 'poa.xlsx');
  const pisar = await admin.pedir('/api/poa/importar', { metodo: 'POST', form: formPoa2 });
  ok(pisar.status === 409, 'la importación no borra un POA con seguimiento');
  const wordPoa = await admin.pedir(`/api/poa/${poa.id}/descargar?formato=docx&mes=11`);
  const zipPoa = await ExcelJSZip.loadAsync(Buffer.from(await wordPoa.arrayBuffer()));
  const docPoa = await zipPoa.file('word/document.xml').async('string');
  ok(
    docPoa.includes('INFORME DE SEGUIMIENTO Y DESEMPEÑO') &&
      docPoa.includes('Curva de avance acumulado') &&
      (await zipPoa.file('word/header1.xml').async('string')).includes('PLANEACIÓN INSTITUCIONAL'),
    'el informe Word del POA trae gráficos y el membrete',
  );
  const pdfPoa = await admin.pedir(`/api/poa/${poa.id}/descargar?formato=pdf`);
  ok(
    Buffer.from(await pdfPoa.arrayBuffer())
      .subarray(0, 5)
      .toString() === '%PDF-',
    'el informe PDF del POA se genera',
  );
  await admin.datos(`/api/poa/actividades/${tardia.id}`, {
    metodo: 'PUT',
    json: { activo: false },
  });
  detallePoa = await admin.datos(`/api/poa/${poa.id}`);
  ok(
    detallePoa.actividades.length === 1 && detallePoa.inactivas.length === 1,
    'una actividad inactiva sale del desempeño sin borrarse',
  );

  console.log('Agenda, hora cátedra y validación de informes');
  const idDe = async (documento) =>
    (await admin.datos(`/api/usuarios?q=${documento}`)).datos.find((u) => u.documento === documento)
      .id;
  const vincular = async (documento, vinculacion) =>
    admin.datos(`/api/usuarios/${await idDe(documento)}`, {
      metodo: 'PATCH',
      json: { vinculacion },
    });
  ok(
    (await ana.pedir('/api/mis-informes?tipo=AGENDA')).status === 403,
    'los estudiantes no tienen informes docentes',
  );
  const tiposAdmin = await Promise.all(
    ['AGENDA', 'EJECUCION', 'CATEDRA'].map((t) => admin.datos(`/api/mis-informes?tipo=${t}`)),
  );
  ok(
    tiposAdmin.every((r) => r.permitido),
    'el administrador ve todo: agenda, ejecución y hora cátedra',
  );
  const miosAgenda = await docente.datos('/api/mis-informes?tipo=AGENDA');
  ok(!miosAgenda.permitido, 'sin vinculación el docente no ve la agenda');
  await vincular('90000001', 'PLANTA');
  await vincular('90000002', 'CATEDRA');
  ok(
    (await docente.datos('/api/auth/yo')).vinculacion === 'PLANTA',
    'la vinculación llega al perfil para armar el menú',
  );
  const catedraAjena = await docente.pedir('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'CATEDRA', periodoId: periodo.id },
  });
  ok(catedraAjena.status === 403, 'un docente de planta no presenta informe de hora cátedra');
  const agenda = await docente.datos('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'AGENDA', periodoId: periodo.id },
  });
  const otraAgenda = await docente.pedir('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'AGENDA', periodoId: periodo.id },
  });
  ok(otraAgenda.status === 409, 'una sola agenda por docente y periodo');
  let detalleAgenda = await docente.datos(`/api/mis-informes/${agenda.id}`);
  ok(
    /Impartir las unidades de formación/.test(
      detalleAgenda.datos.actividades['dir-encuentro']?.descripcion ?? '',
    ),
    'la agenda nueva trae sus cursos en docencia directa',
  );
  const datosAgenda = {
    ...detalleAgenda.datos,
    dedicacion: 'TIEMPO_COMPLETO',
    escalafon: 'AUXILIAR',
    franjaHoraria: 'Nocturna',
    actividades: {
      ...detalleAgenda.datos.actividades,
      'dir-encuentro': { ...detalleAgenda.datos.actividades['dir-encuentro'], horas: 16 },
      'ind-preparacion': { horas: 8, descripcion: 'Preparar clases' },
      'inv-semillero': { horas: 4, descripcion: 'Semillero de prueba' },
    },
  };
  await docente.datos(`/api/mis-informes/${agenda.id}`, {
    metodo: 'PUT',
    json: { datos: datosAgenda },
  });
  ok(
    (await otraDocente.pedir(`/api/mis-informes/${agenda.id}`)).status === 404,
    'un docente no ve la agenda de otro',
  );
  const wordAgenda = await docente.pedir(`/api/mis-informes/${agenda.id}/descargar?formato=docx`);
  const zipAgenda = await ExcelJSZip.loadAsync(Buffer.from(await wordAgenda.arrayBuffer()));
  const xmlAgenda = await zipAgenda.file('word/document.xml').async('string');
  ok(
    xmlAgenda.includes('DATOS DE IDENTIFICACIÓN DEL PROFESOR') &&
      xmlAgenda.includes('ROJAS MEJIA LUIS ANDRES') &&
      xmlAgenda.includes('24 horas') &&
      (await zipAgenda.file('word/header1.xml').async('string')).includes('AGENDA'),
    'la agenda sale en Word con el formato F-DOC-056',
  );
  await docente.datos(`/api/mis-informes/${agenda.id}/entregar`, { metodo: 'POST' });
  const bloqueada = await docente.pedir(`/api/mis-informes/${agenda.id}`, {
    metodo: 'PUT',
    json: { datos: datosAgenda },
  });
  ok(bloqueada.status === 409, 'la agenda entregada queda bloqueada');
  const porRevisar = await admin.datos('/api/validacion-informes?estado=ENTREGADO');
  ok(
    porRevisar.datos.some((i) => i.id === agenda.id),
    'la agenda entregada aparece en validación',
  );
  const sinMotivo = await admin.pedir(`/api/validacion-informes/${agenda.id}/revisar`, {
    metodo: 'POST',
    json: { decision: 'AJUSTES', observacion: '' },
  });
  ok(sinMotivo.status === 400, 'pedir ajustes exige escribir cuáles');
  await admin.datos(`/api/validacion-informes/${agenda.id}/revisar`, {
    metodo: 'POST',
    json: { decision: 'AJUSTES', observacion: 'Ajustar horas de investigación.' },
  });
  detalleAgenda = await docente.datos(`/api/mis-informes/${agenda.id}`);
  ok(
    detalleAgenda.estado === 'AJUSTES' && detalleAgenda.observacion.includes('investigación'),
    'el docente ve los ajustes solicitados',
  );
  await docente.datos(`/api/mis-informes/${agenda.id}`, {
    metodo: 'PUT',
    json: { datos: datosAgenda },
  });
  await docente.datos(`/api/mis-informes/${agenda.id}/entregar`, { metodo: 'POST' });
  await admin.datos(`/api/validacion-informes/${agenda.id}/revisar`, {
    metodo: 'POST',
    json: { decision: 'APROBAR', observacion: 'Agenda aprobada sin novedad.' },
  });
  const aprobadaEditada = await docente.pedir(`/api/mis-informes/${agenda.id}`, {
    metodo: 'PUT',
    json: { datos: datosAgenda },
  });
  ok(aprobadaEditada.status === 409, 'la agenda aprobada no se puede modificar');
  const pdfAgenda = await admin.pedir(
    `/api/validacion-informes/${agenda.id}/descargar?formato=pdf`,
  );
  const cabeceraPdf = Buffer.from(await pdfAgenda.arrayBuffer())
    .subarray(0, 5)
    .toString();
  ok(cabeceraPdf === '%PDF-', 'el revisor descarga la agenda en PDF');
  const catedra = await otraDocente.datos('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'CATEDRA', periodoId: periodo.id },
  });
  const detalleCatedra = await otraDocente.datos(`/api/mis-informes/${catedra.id}`);
  await otraDocente.datos(`/api/mis-informes/${catedra.id}`, {
    metodo: 'PUT',
    json: {
      datos: {
        ...detalleCatedra.datos,
        unidad: 'BASE DE DATOS DE PRUEBA',
        desde: '2026-09-01',
        hasta: '2026-09-30',
        sesiones: [{ numero: 1, fecha: '2026-09-05', tema: 'Modelo relacional' }],
        horasOrientadas: 6,
        avancePeriodo: 33,
      },
    },
  });
  const wordCatedra = await otraDocente.pedir(
    `/api/mis-informes/${catedra.id}/descargar?formato=docx`,
  );
  const zipCatedra = await ExcelJSZip.loadAsync(Buffer.from(await wordCatedra.arrayBuffer()));
  const xmlCatedra = await zipCatedra.file('word/document.xml').async('string');
  ok(
    xmlCatedra.includes('BASE DE DATOS DE PRUEBA') &&
      xmlCatedra.includes('1 de septiembre de 2026') &&
      xmlCatedra.includes('Modelo relacional'),
    'el informe de hora cátedra sale en Word con el formato F-DOC-047',
  );
  await otraDocente.datos(`/api/mis-informes/${catedra.id}/entregar`, { metodo: 'POST' });
  const resumenValidacion = await admin.datos(
    `/api/validacion-informes/resumen?periodoId=${periodo.id}`,
  );
  ok(
    resumenValidacion.conteos.some(
      (c) => c.tipo === 'CATEDRA' && c.estado === 'ENTREGADO' && c.total === 1,
    ),
    'el resumen de validación cuenta los informes por tipo y estado',
  );

  console.log('Ejecución de la agenda (F-DOC-004)');
  const ejecucionAjena = await otraDocente.pedir('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'EJECUCION', periodoId: periodo.id, corte: 1 },
  });
  ok(ejecucionAjena.status === 403, 'hora cátedra no presenta ejecución de agenda');
  const corte1 = await docente.datos('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'EJECUCION', periodoId: periodo.id, corte: 1 },
  });
  const repetido = await docente.pedir('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'EJECUCION', periodoId: periodo.id, corte: 1 },
  });
  ok(repetido.status === 409, 'un informe de ejecución por corte');
  const ejec1 = await docente.datos(`/api/mis-informes/${corte1.id}`);
  ok(
    ejec1.datos.filas.some(
      (f) => f.actividad === 'dir-encuentro' && /Unidad de formación/.test(f.tarea),
    ) && ejec1.datos.filas.some((f) => f.actividad === 'inv-semillero' && f.horas === 4),
    'la ejecución parte de los cursos y de la agenda',
  );
  await docente.datos(`/api/mis-informes/${corte1.id}`, {
    metodo: 'PUT',
    json: {
      datos: {
        ...ejec1.datos,
        corte: 2,
        filas: ejec1.datos.filas.map((f) => ({ ...f, corte1: 40, meses: [8, 9] })),
      },
    },
  });
  const guardado1 = await docente.datos(`/api/mis-informes/${corte1.id}`);
  ok(
    guardado1.datos.corte === 1 && guardado1.datos.filas.every((f) => f.corte1 === 40),
    'el avance del corte se guarda y el corte no cambia',
  );
  await docente.datos(`/api/mis-informes/${corte1.id}/entregar`, { metodo: 'POST' });
  await admin.datos(`/api/validacion-informes/${corte1.id}/revisar`, {
    metodo: 'POST',
    json: { decision: 'APROBAR', observacion: '' },
  });
  const corte2 = await docente.datos('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'EJECUCION', periodoId: periodo.id, corte: 2 },
  });
  const ejec2 = await docente.datos(`/api/mis-informes/${corte2.id}`);
  ok(
    ejec2.datos.corte === 2 && ejec2.datos.filas.every((f) => f.corte1 === 40),
    'el corte 2 continúa con el avance del corte 1',
  );
  const excelEjec = await admin.pedir(
    `/api/validacion-informes/${corte1.id}/descargar?formato=xlsx`,
  );
  const libroEjec = new ExcelJS.Workbook();
  await libroEjec.xlsx.load(Buffer.from(await excelEjec.arrayBuffer()));
  const hojaEjec = libroEjec.getWorksheet('Seguimiento corte 1');
  ok(
    hojaEjec?.getCell('C7').value === 'ROJAS MEJIA LUIS ANDRES' &&
      hojaEjec.getCell('H12').value === 40 &&
      hojaEjec.getCell('X8').value !== null &&
      hojaEjec.getCell('J11').value === 'CUMPLIMIENTO 3 CORTE',
    'la ejecución sale en Excel con el formato F-DOC-004 y la fecha de aprobación',
  );
  const wordEjec = await docente.pedir(`/api/mis-informes/${corte2.id}/descargar?formato=docx`);
  const zipEjec = await ExcelJSZip.loadAsync(Buffer.from(await wordEjec.arrayBuffer()));
  const xmlEjec = await zipEjec.file('word/document.xml').async('string');
  ok(
    xmlEjec.includes('Cumplimiento por labor') &&
      xmlEjec.includes('Estado de las tareas') &&
      (await zipEjec.file('word/header1.xml').async('string')).includes('-004'),
    'la ejecución sale en Word con gráficos y el membrete F-DOC-004',
  );
  const csvEjec = await docente.pedir(`/api/mis-informes/${corte2.id}/descargar?formato=csv`);
  ok(csvEjec.status === 400, 'los formatos de descarga están limitados');
  const pdfEjec = await docente.pedir(`/api/mis-informes/${corte2.id}/descargar?formato=pdf`);
  const cabeceraEjec = Buffer.from(await pdfEjec.arrayBuffer())
    .subarray(0, 5)
    .toString();
  ok(cabeceraEjec === '%PDF-', 'la ejecución se descarga en PDF');
  await docente.datos(`/api/mis-informes/${corte2.id}`, {
    metodo: 'PUT',
    json: {
      datos: { ...ejec2.datos, filas: ejec2.datos.filas.map((f) => ({ ...f, corte2: 70 })) },
    },
  });
  const corte3 = await docente.datos('/api/mis-informes', {
    metodo: 'POST',
    json: { tipo: 'EJECUCION', periodoId: periodo.id, corte: 3 },
  });
  const ejec3 = await docente.datos(`/api/mis-informes/${corte3.id}`);
  ok(
    ejec3.datos.corte === 3 && ejec3.datos.filas.every((f) => f.corte2 === 70 && f.corte3 === null),
    'el corte 3 continúa con el avance del corte 2',
  );
  await docente.datos(`/api/mis-informes/${corte3.id}`, {
    metodo: 'PUT',
    json: {
      datos: { ...ejec3.datos, filas: ejec3.datos.filas.map((f) => ({ ...f, corte3: 95 })) },
    },
  });
  const excel3 = await docente.pedir(`/api/mis-informes/${corte3.id}/descargar?formato=xlsx`);
  const libro3 = new ExcelJS.Workbook();
  await libro3.xlsx.load(Buffer.from(await excel3.arrayBuffer()));
  const hoja3 = libro3.getWorksheet('Seguimiento corte 3');
  ok(
    hoja3?.getCell('I12').value === 70 && hoja3.getCell('J12').value === 95,
    'el cumplimiento del corte 3 sale en su columna del Excel',
  );

  console.log('Usuarios, roles y permisos (RBAC y ABAC)');
  const roles = await admin.datos('/api/roles');
  ok(
    ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'].every((c) => roles.some((r) => r.clave === c)),
    'existen los roles fijos del sistema',
  );
  const rolGestor = await admin.datos('/api/roles', {
    metodo: 'POST',
    json: {
      nombre: 'Gestor de cuentas de prueba',
      permisos: ['usuarios.ver', 'usuarios.estado'],
    },
  });
  const opcionesRol = await admin.datos('/api/usuarios/opciones');
  const idRol = (clave) => opcionesRol.find((r) => r.clave === clave)?.id;
  await admin.datos('/api/usuarios', {
    metodo: 'POST',
    json: {
      documento: '70000077',
      nombreCompleto: 'PRUEBA GESTOR ANA',
      rolSistemaId: rolGestor.id,
    },
  });
  const gestor = new Cliente();
  await gestor.entrar('70000077', '70000077prueba', 'gestor@example.test');
  const yoGestor = await gestor.datos('/api/auth/yo');
  ok(
    yoGestor.permisos.length === 2 && yoGestor.rolNombre === 'Gestor de cuentas de prueba',
    'el perfil trae el rol y solo sus permisos',
  );
  ok((await gestor.pedir('/api/usuarios')).status === 200, 'RBAC: puede ver usuarios');
  ok((await gestor.pedir('/api/cursos')).status === 403, 'RBAC: sin permiso no ve cursos');
  ok((await gestor.pedir('/api/roles')).status === 403, 'RBAC: sin permiso no gestiona roles');
  const crearSinPermiso = await gestor.pedir('/api/usuarios', {
    metodo: 'POST',
    json: {
      documento: '80000098',
      nombreCompleto: 'NADIE NADA',
      rolSistemaId: idRol('ESTUDIANTE'),
    },
  });
  ok(crearSinPermiso.status === 403, 'RBAC: sin permiso no crea usuarios');
  const idJuan = await idDe('80000002');
  const idAdmin = await idDe(ADMIN);
  const idGestor = await idDe('70000077');
  const lote = await gestor.datos('/api/usuarios/estado', {
    metodo: 'PATCH',
    json: { ids: [idJuan, idAdmin, idGestor], activo: false },
  });
  ok(
    lote.actualizados === 1 &&
      lote.omitidos.some((o) => o.id === idAdmin && /administrativas/.test(o.motivo)) &&
      lote.omitidos.some((o) => o.id === idGestor && /propia cuenta/.test(o.motivo)),
    'ABAC: el masivo omite la propia cuenta y las administrativas, con motivo',
  );
  const reactivar = await gestor.datos('/api/usuarios/estado', {
    metodo: 'PATCH',
    json: { ids: [idJuan], activo: true },
  });
  ok(reactivar.actualizados === 1, 'activación masiva');
  const editarSinPermiso = await gestor.pedir(`/api/usuarios/${idJuan}`, {
    metodo: 'PATCH',
    json: { nombreCompleto: 'OTRO NOMBRE' },
  });
  ok(editarSinPermiso.status === 403, 'RBAC: activar no permite editar datos');
  const autoInactivar = await admin.pedir(`/api/usuarios/${idAdmin}`, {
    metodo: 'PATCH',
    json: { activo: false },
  });
  ok(autoInactivar.status === 403, 'ABAC: nadie inactiva su propia cuenta');
  const editarAdministrador = await admin.pedir(`/api/roles/${idRol('ADMINISTRADOR')}`, {
    metodo: 'PATCH',
    json: { permisos: ['usuarios.ver'] },
  });
  ok(editarAdministrador.status === 403, 'los roles del sistema no se modifican');
  const cambioTipo = await admin.pedir(`/api/usuarios/${await idDe('90000001')}`, {
    metodo: 'PATCH',
    json: { rolSistemaId: idRol('ESTUDIANTE') },
  });
  ok(cambioTipo.status === 409, 'ABAC: una cuenta con cursos no cambia de tipo');
  const borrarConDatos = await admin.pedir(`/api/usuarios/${await idDe('90000001')}`, {
    metodo: 'DELETE',
  });
  ok(borrarConDatos.status === 409, 'ABAC: una cuenta con información no se elimina');
  const temporal = await admin.datos('/api/usuarios', {
    metodo: 'POST',
    json: {
      documento: '80000097',
      nombreCompleto: 'TEMPORAL BORRAR LUZ',
      rolSistemaId: idRol('ESTUDIANTE'),
    },
  });
  ok(
    (await admin.pedir(`/api/usuarios/${temporal.id}`, { metodo: 'DELETE' })).status === 200,
    'una cuenta sin información se elimina',
  );
  ok(
    (await admin.pedir(`/api/roles/${rolGestor.id}`, { metodo: 'DELETE' })).status === 409,
    'un rol con usuarios no se elimina',
  );
  await admin.datos(`/api/roles/${rolGestor.id}`, {
    metodo: 'PATCH',
    json: { permisos: ['usuarios.ver'] },
  });
  ok(
    (
      await gestor.pedir('/api/usuarios/estado', {
        metodo: 'PATCH',
        json: { ids: [idJuan], activo: true },
      })
    ).status === 403,
    'RBAC: quitar un permiso al rol se aplica a sus usuarios',
  );

  console.log('Límite de intentos');
  const intentar = (clave) =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documento: '90000002', clave }),
    });
  const respuestas = [];
  for (let i = 0; i < 5; i++) respuestas.push(await intentar('clave-equivocada'));
  ok(
    respuestas.every((r) => r.status === 401),
    'cinco intentos fallidos se rechazan',
  );
  const quinto = await respuestas[4].json();
  ok(/máximo de intentos/.test(quinto.message), 'el quinto intento avisa del bloqueo');
  const bloqueado = await intentar('Nueva-Clave-18!x');
  ok(bloqueado.status === 429, 'tras 5 fallos se bloquea aunque la clave sea correcta');
  ok(
    /Vuelve a intentarlo en 1[45] minutos/.test((await bloqueado.json()).message),
    'el bloqueo indica los minutos de espera',
  );
  console.log(`\nTodo correcto: ${pruebas} comprobaciones.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
