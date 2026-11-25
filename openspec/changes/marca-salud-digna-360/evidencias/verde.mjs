// NOKI_BROWSER_TOOLS: Playwright temporal. NOKI_CAPTURA_FASE=antes|despues.
/* global process, URL, document, window, innerWidth, getComputedStyle */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.join(process.env.NOKI_BROWSER_TOOLS, 'node_modules/playwright/index.mjs')).href);
const carpeta = path.dirname(fileURLToPath(import.meta.url));
const fase = process.env.NOKI_CAPTURA_FASE ?? 'despues';
assert.ok(['antes', 'despues'].includes(fase));
const despues = fase === 'despues';
const resultados = [];
const navegador = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const nav = pagina => pagina.getByRole('navigation', { name: 'Canales de la demo' });
const pulsar = (pagina, nombre) => pagina.getByRole('button', { name: nombre, exact: true }).and(pagina.locator('button:enabled')).filter({ visible: true }).last().click();

async function capturar(pagina, modo, ancho, ruta, estado, inicio = false) {
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(300);
  if (inicio) await pagina.evaluate(() => window.scrollTo(0, 0));
  const datos = await pagina.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, ancho: r.width, alto: r.height, abajo: r.bottom }; };
    const estilo = el => { const s = getComputedStyle(el); return { color: s.color, fondo: s.backgroundColor, bordeIzquierdo: s.borderLeftWidth, colorBordeIzquierdo: s.borderLeftColor, bordeSuperior: s.borderTopWidth, colorBordeSuperior: s.borderTopColor, padding: s.padding, fuente: s.fontSize, peso: s.fontWeight }; };
    const layout = document.querySelector('.layout');
    const barra = document.querySelector('.barra-demo');
    const marca = document.querySelector('.marca');
    const status = barra.querySelector('[role="status"]');
    const progreso = barra.querySelector('progress');
    const compositor = document.querySelector('.wa-compositor');
    const verdes = new Set(['rgb(0, 137, 89)', 'rgb(0, 107, 69)', 'rgb(230, 244, 238)']);
    const controles = [...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"]')].filter(el => !el.matches('.marca'));
    const coloreados = controles.filter(el => { const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderTopColor, s.borderLeftColor, s.outlineColor].some(c => verdes.has(c)); });
    const mensajes = [...document.querySelectorAll('p')].filter(p => ['Llegada registrada', 'La cita se canceló.', 'La cancelación espera aprobación en WhatsApp.'].includes(p.textContent));
    const valor = document.querySelector('.datos-tarjetas dd');
    return {
      ancho: innerWidth, anchoPagina: document.documentElement.scrollWidth,
      linea: { ...rect(layout), ...estilo(layout), anchoPagina: document.documentElement.clientWidth },
      barra: rect(barra), marca: { ...rect(marca), ...estilo(marca), nowrap: getComputedStyle(marca).whiteSpace },
      insignia: document.querySelector('.insignia-mock') && getComputedStyle(document.querySelector('.insignia-mock')).whiteSpace,
      titulo: { ...rect(document.querySelector('h1')), ...estilo(document.querySelector('h1')) },
      mensajes: mensajes.map(p => ({ texto: p.textContent, elemento: p.tagName, role: p.getAttribute('role'), clase: p.className, ...estilo(p) })),
      tarjetas: [...document.querySelectorAll('.datos-tarjetas > div')].map(el => ({ clase: el.className, etiqueta: el.querySelector('dt').textContent, valor: el.querySelector('dd').textContent, colorValor: getComputedStyle(el.querySelector('dd')).color, orden: [...el.children].map(h => h.tagName), ...estilo(el) })),
      controlesVerdes: coloreados.map(el => ({ elemento: el.tagName, texto: el.textContent })),
      controlesBarra: [...barra.querySelectorAll('a,select,button')].map(el => ({ texto: el.textContent, ...rect(el) })),
      paso: status && { texto: status.textContent, fuente: getComputedStyle(status).fontSize, elipsis: getComputedStyle(status).textOverflow, nowrap: getComputedStyle(status).whiteSpace },
      progreso: progreso && { alto: rect(progreso).alto, nombre: document.getElementById(progreso.getAttribute('aria-labelledby'))?.textContent },
      compositor: compositor && rect(compositor),
      enlaceActivo: barra.querySelector('a[aria-current="page"]') && estilo(barra.querySelector('a[aria-current="page"]')),
      valorTamano: valor && getComputedStyle(valor).fontSize,
    };
  });
  assert.ok(datos.anchoPagina <= ancho, `${modo} ${ancho} ${ruta}: desbordamiento`);
  assert.deepEqual(datos.controlesVerdes, [], 'Solo la marca conserva la excepción verde de enlace');
  for (const control of datos.controlesBarra) assert.ok(control.ancho >= 44 && control.alto >= 44);
  if (datos.enlaceActivo) assert.equal(datos.enlaceActivo.fondo, 'rgb(0, 116, 217)');
  if (ancho === 375) {
    assert.equal(datos.marca.fuente, '24px'); assert.equal(datos.marca.nowrap, 'nowrap');
    if (modo === 'mock') { assert.equal(datos.insignia, 'nowrap'); assert.ok(datos.barra.alto <= 162); assert.equal(datos.progreso.alto, 4); assert.equal(datos.progreso.nombre, datos.paso.texto); assert.equal(datos.paso.elipsis, 'ellipsis'); }
    if (datos.compositor) assert.ok(datos.compositor.abajo <= datos.barra.y + 1);
  } else {
    if (ruta !== '/') assert.ok(Number.parseFloat(datos.titulo.fuente) <= 48);
    if (modo === 'mock') { assert.equal(datos.progreso.alto, 8); assert.equal(datos.paso.fuente, '15px'); }
  }
  const nombresLogro = ['Huecos recuperados', 'Horas de recurso recuperadas', 'Días adelantados en promedio'];
  for (const tarjeta of datos.tarjetas) {
    assert.deepEqual(tarjeta.orden, ['DT', 'DD']); assert.equal(tarjeta.colorValor, 'rgb(46, 49, 51)');
    assert.equal(tarjeta.clase.includes('tarjeta-logro'), despues && nombresLogro.includes(tarjeta.etiqueta));
    if (despues && nombresLogro.includes(tarjeta.etiqueta)) { assert.equal(tarjeta.bordeSuperior, '3px'); assert.equal(tarjeta.colorBordeSuperior, 'rgb(0, 137, 89)'); }
  }
  if (despues) {
    assert.equal(datos.linea.bordeSuperior, '3px'); assert.equal(datos.linea.colorBordeSuperior, 'rgb(0, 137, 89)');
    assert.equal(datos.linea.x, 0); assert.equal(datos.linea.ancho, datos.linea.anchoPagina);
    for (const mensaje of datos.mensajes) {
      const completado = mensaje.texto !== 'La cancelación espera aprobación en WhatsApp.';
      assert.equal(mensaje.clase.includes('estado-exito'), completado);
      if (completado) { assert.equal(mensaje.color, 'rgb(0, 107, 69)'); assert.equal(mensaje.fondo, 'rgb(230, 244, 238)'); assert.equal(mensaje.bordeIzquierdo, '3px'); assert.equal(mensaje.padding, '16px'); }
      if (mensaje.texto === 'La cita se canceló.') assert.equal(mensaje.role, 'status');
      if (mensaje.texto === 'Llegada registrada') assert.equal(mensaje.role, null);
    }
  }
  const captura = `07-${fase}-${modo}-${ancho}-${estado}-${ruta.slice(1) || 'portada'}.png`;
  await pagina.screenshot({ path: path.join(carpeta, captura) });
  resultados.push({ fase, modo, ancho, ruta, estado, captura, ...datos });
}

async function flujoA(pagina, origen, ancho) {
  await pagina.goto(origen + '/callcenter');
  await pulsar(pagina, 'Llamada entrante');
  await pagina.getByRole('button', { name: /^Cotizar Paquete/ }).click();
  await pagina.getByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' }).check();
  await pulsar(pagina, 'Continuar por WhatsApp');
  await pagina.getByRole('link', { name: 'Abrir WhatsApp', exact: true }).click();
  await pulsar(pagina, 'Ver horarios'); await pulsar(pagina, 'Ver opciones');
  await pulsar(pagina, 'Jueves 26 · 09:15'); await pulsar(pagina, 'Revisar cita'); await pulsar(pagina, 'Para mí');
  await pulsar(pagina, 'Ver opciones');
  await pulsar(pagina, 'Soy Ana P.'); await pulsar(pagina, 'Abrir formulario');
  await pagina.getByRole('dialog').getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-01-02');
  await pulsar(pagina, 'Enviar formulario'); await pulsar(pagina, 'Confirmar cita');
  await nav(pagina).getByRole('link', { name: 'Clínica', exact: true }).click();
  await pulsar(pagina, 'Registrar llegada');
  await pagina.getByText('Llegada registrada', { exact: true }).waitFor();
  await pagina.getByText('Llegada registrada', { exact: true }).scrollIntoViewIfNeeded();
  await capturar(pagina, 'mock', ancho, '/clinica', 'flujoA-llegada');
}

async function flujoC(pagina, origen, ancho) {
  await pagina.getByLabel('Guion de demo').selectOption('flujoC');
  await nav(pagina).getByRole('link', { name: 'App', exact: true }).click();
  await pulsar(pagina, 'Cancelar cita'); await pulsar(pagina, 'Confirmar cancelación');
  await pagina.getByText('La cancelación espera aprobación en WhatsApp.', { exact: true }).waitFor();
  await capturar(pagina, 'mock', ancho, '/app', 'flujoC-pendiente');
  await pagina.getByRole('link', { name: 'Abrir WhatsApp', exact: true }).click(); await pulsar(pagina, 'Sí, cancelar');
  await nav(pagina).getByRole('link', { name: 'App', exact: true }).click();
  await pagina.getByText('La cita se canceló.', { exact: true }).waitFor();
  await pagina.getByText('La cita se canceló.', { exact: true }).scrollIntoViewIfNeeded();
  await capturar(pagina, 'mock', ancho, '/app', 'flujoC-cancelada');
  await nav(pagina).getByRole('link', { name: 'WhatsApp', exact: true }).click();
  await pagina.getByRole('button', { name: /Ver mensajes de 5210000000002/ }).click();
  await pulsar(pagina, 'Sí, adelantar');
  await nav(pagina).getByRole('link', { name: 'Admin', exact: true }).click();
  await pagina.getByText('Horas de recurso recuperadas', { exact: true }).waitFor();
  await pagina.getByRole('heading', { name: 'Indicadores disponibles' }).scrollIntoViewIfNeeded();
  await capturar(pagina, 'mock', ancho, '/admin', 'flujoC-logros');
}

async function real(pagina, contexto, origen, ancho) {
  const archivo = path.join(carpeta, '07-real-contexto.json');
  let datos = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : null;
  if (!datos) {
    const ctx = await (await contexto.request.get('http://localhost:4000/api/demo/contexto')).json();
    const citas = await (await contexto.request.get(`http://localhost:4000/api/pacientes/${ctx.pacienteId}/citas`)).json();
    const llegadas = await (await contexto.request.get(`http://localhost:4000/api/sedes/${ctx.sedeId}/llegadas`)).json();
    const cancelar = citas.find(c => c.tramite.estado === 'CONFIRMADA');
    const llegada = llegadas.find(c => !c.registrada && c.cita.tramite.id !== cancelar?.tramite.id);
    assert.ok(cancelar && llegada, 'La demo requiere dos citas ficticias confirmadas, una para llegar y otra para cancelar');
    datos = { sedeId: ctx.sedeId, llegada: llegada.cita.tramite.id, cancelar: cancelar.tramite.id };
    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
  }
  if (fase === 'antes' && !datos.llegadaEjecutada) {
    await pagina.goto(origen + '/clinica');
    const llegadas = await (await contexto.request.get(`http://localhost:4000/api/sedes/${datos.sedeId}/llegadas`)).json();
    const indice = llegadas.findIndex(c => c.cita.tramite.id === datos.llegada);
    const seccion = pagina.locator('section.seccion').filter({ has: pagina.getByRole('heading', { level: 2 }) }).nth(indice);
    await seccion.getByRole('button', { name: 'Registrar llegada', exact: true }).click();
    await seccion.getByText('Llegada registrada', { exact: true }).waitFor();
    datos.llegadaEjecutada = true; fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
  }
  await pagina.goto(origen + '/clinica');
  await pagina.getByText('Llegada registrada', { exact: true }).first().waitFor();
  await pagina.getByText('Llegada registrada', { exact: true }).first().scrollIntoViewIfNeeded();
  await capturar(pagina, 'real', ancho, '/clinica', 'llegada-local');
  if (fase === 'antes' && !datos.cancelacionEjecutada) {
    const wa = await contexto.newPage(); await wa.goto(origen + '/wa');
    await wa.getByLabel('Número de WhatsApp').waitFor();
    await pagina.goto(origen + '/app'); await pulsar(pagina, 'Cancelar cita'); await pulsar(pagina, 'Confirmar cancelación');
    await pagina.getByText('La cancelación espera aprobación en WhatsApp.', { exact: true }).waitFor();
    let aprobar = wa.getByRole('button', { name: 'Sí, cancelar', exact: true });
    try { await aprobar.waitFor({ timeout: 8000 }); } catch {
      for (const aviso of await wa.getByRole('button', { name: /^Ver mensajes de / }).all()) { await aviso.click(); if (await aprobar.count()) break; }
    }
    await aprobar.click();
    await wa.getByText('Tu cita quedó cancelada.', { exact: true }).waitFor();
    datos.cancelacionEjecutada = true; fs.writeFileSync(archivo, JSON.stringify(datos, null, 2)); await wa.close();
  }
  const tramite = await (await contexto.request.get(`http://localhost:4000/api/tramites/${datos.cancelar}`)).json();
  assert.equal(tramite.estado ?? tramite.tramite?.estado, 'CANCELADA');
  // La consulta real omite CANCELADA y el contexto de demo puede avanzar a otro hilo.
  await pagina.goto(origen + '/app'); await pagina.getByRole('heading', { name: 'App', exact: true }).waitFor();
  await capturar(pagina, 'real', ancho, '/app', 'cancelacion-local');
  await nav(pagina).getByRole('link', { name: 'Admin', exact: true }).click();
  await pagina.getByRole('heading', { name: 'Indicadores disponibles' }).scrollIntoViewIfNeeded();
  await capturar(pagina, 'real', ancho, '/admin', 'logros-local');
}

try {
  for (const modo of ['mock', 'real']) for (const ancho of [375, 1280]) {
    const origen = `http://localhost:${modo === 'mock' ? 5174 : 5173}`;
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho === 375 ? 812 : 800 } });
    const pagina = await contexto.newPage(); const errores = []; const origenes = new Set();
    contexto.on('page', p => p.on('pageerror', e => errores.push(e.message)));
    pagina.on('pageerror', e => errores.push(e.message));
    contexto.on('request', r => origenes.add(new URL(r.url()).origin));
    for (const ruta of ['/', '/web', '/wa', '/app', '/callcenter', '/clinica', '/admin', '/bandeja']) {
      await pagina.goto(origen + ruta); await pagina.locator('h1').waitFor();
      await capturar(pagina, modo, ancho, ruta, 'inicial', true);
    }
    if (modo === 'mock') { await flujoA(pagina, origen, ancho); await flujoC(pagina, origen, ancho); }
    else await real(pagina, contexto, origen, ancho);
    assert.deepEqual(errores, []); assert.deepEqual([...origenes].filter(o => ![origen, 'http://localhost:4000'].includes(o)), []);
    resultados.push({ modo, ancho, errores, origenes: [...origenes] }); await contexto.close();
  }
  fs.writeFileSync(path.join(carpeta, `07-${fase}-resultados.json`), JSON.stringify(resultados, null, 2));
  process.stdout.write(`PASS: ${fase}, ${resultados.filter(r => r.ruta).length} capturas/mediciones, 8 rutas, 2 modos, llegada y cancelación; interfaz previa intacta.\n`);
} finally { await navegador.close(); }
