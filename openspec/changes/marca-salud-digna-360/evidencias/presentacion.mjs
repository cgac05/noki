// NOKI_BROWSER_TOOLS: Playwright temporal. NOKI_CAPTURA_FASE=antes|despues.
/* global process, URL, document, window, innerWidth, getComputedStyle, CSS */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.join(process.env.NOKI_BROWSER_TOOLS, 'node_modules/playwright/index.mjs')).href);
const carpeta = path.dirname(fileURLToPath(import.meta.url));
const fase = process.env.NOKI_CAPTURA_FASE ?? 'despues';
assert.ok(['antes', 'despues'].includes(fase));
const validar = fase === 'despues';
const resultados = [];
const navegador = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function capturar(pagina, modo, ancho, ruta, estado) {
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(400);
  const dato = await pagina.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, ancho: r.width, alto: r.height, abajo: r.bottom }; };
    const medir = el => el && { ...rect(el), fuente: getComputedStyle(el).fontSize, lineHeight: getComputedStyle(el).lineHeight, nowrap: getComputedStyle(el).whiteSpace };
    const barra = document.querySelector('.barra-demo');
    const estado = barra.querySelector('[role="status"]');
    const progress = barra.querySelector('progress');
    const compositor = document.querySelector('.wa-compositor');
    const envoltura = document.querySelector('.canales-demo');
    const lista = barra.querySelector('ul');
    const nav = envoltura ?? lista;
    const sombra = pseudo => envoltura && { opacidad: getComputedStyle(lista, pseudo).opacity, fondo: getComputedStyle(lista, pseudo).backgroundImage, clics: getComputedStyle(lista, pseudo).pointerEvents, contenido: getComputedStyle(lista, pseudo).content };
    return {
      ancho: innerWidth, anchoPagina: document.documentElement.scrollWidth,
      barra: rect(barra), altoReservado: getComputedStyle(document.documentElement).getPropertyValue('--alto-barra-demo'),
      marca: medir(document.querySelector('.marca')), insignia: medir(document.querySelector('.insignia-mock')),
      titulo: medir(document.querySelector('h1')), margenTitulo: getComputedStyle(document.querySelector('h1')).scrollMarginTop,
      controles: [...barra.querySelectorAll('a, select, button')].map(el => ({ texto: el.textContent, ...rect(el) })),
      simulacion: barra.querySelector('.etiqueta-simulacion') && rect(barra.querySelector('.etiqueta-simulacion')),
      selector: barra.querySelector('select') && rect(barra.querySelector('select')),
      reiniciar: barra.querySelector('button') && rect(barra.querySelector('button')),
      paso: estado && { texto: estado.textContent, ...medir(estado), elipsis: getComputedStyle(estado).textOverflow },
      progreso: progress && { valor: progress.value, maximo: progress.max, alto: rect(progress).alto, nombre: document.getElementById(progress.getAttribute('aria-labelledby'))?.textContent },
      compositor: compositor && rect(compositor),
      tarjetas: [...document.querySelectorAll('.datos-tarjetas > div')].map(el => ({ orden: [...el.children].map(c => c.tagName), fondo: getComputedStyle(el).backgroundColor, sombra: getComputedStyle(el).boxShadow, dd: getComputedStyle(el.querySelector('dd')).fontSize })),
      vacios: [...document.querySelectorAll('.estado-vacio')].map(el => ({ texto: el.textContent, etiqueta: el.tagName, fondo: getComputedStyle(el).backgroundColor })),
      canales: { contenido: nav.scrollWidth, ancho: nav.clientWidth, scroll: nav.scrollLeft, izquierda: sombra('::before'), derecha: sombra('::after') },
      soporteScrollState: CSS.supports('container-type: scroll-state'),
    };
  });
  if (validar) {
    assert.ok(dato.anchoPagina <= ancho, `${modo} ${ancho} ${ruta}: página desbordada`);
    for (const control of dato.controles) assert.ok(control.ancho >= 44 && control.alto >= 44, `${control.texto}: área táctil`);
    if (ruta !== '/') assert.ok(Number.parseFloat(dato.titulo.fuente) <= 48);
    if (ancho < 768) {
      assert.equal(dato.marca.nowrap, 'nowrap');
      assert.equal(dato.marca.fuente, '24px');
      assert.ok(dato.marca.alto <= 44, 'Marca de una línea');
      if (modo === 'mock') {
        assert.equal(dato.insignia.nowrap, 'nowrap');
        assert.ok(dato.insignia.alto < 30, 'Insignia de una línea');
        assert.ok(dato.barra.alto <= 162, `${estado}: barra ${dato.barra.alto}`);
        assert.equal(dato.paso.elipsis, 'ellipsis');
        assert.equal(dato.paso.nowrap, 'nowrap');
        assert.equal(dato.progreso.alto, 4);
        assert.equal(dato.progreso.nombre, dato.paso.texto);
        assert.ok(Math.abs(dato.selector.y - dato.reiniciar.y) < 1, 'Selector y reinicio en una fila');
      }
      if (dato.compositor) {
        assert.ok(dato.compositor.abajo <= dato.barra.y + 1);
        const enviar = pagina.locator('.wa-compositor').getByRole('button', { name: 'Enviar', exact: true });
        assert.equal(await enviar.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true);
      }
    } else {
      assert.ok(dato.titulo.y >= dato.barra.abajo, `${ruta}: título bajo barra`);
      if (modo === 'mock') {
        assert.equal(dato.paso.fuente, '15px');
        assert.equal(dato.progreso.alto, 8);
      }
    }
    for (const tarjeta of dato.tarjetas) {
      assert.deepEqual(tarjeta.orden, ['DT', 'DD']);
      assert.equal(tarjeta.sombra, 'none');
      assert.equal(tarjeta.dd, '28px');
    }
  }
  const captura = `06-${fase}-${modo}-${ancho}-${estado}-${ruta.slice(1) || 'portada'}.png`;
  await pagina.screenshot({ path: path.join(carpeta, captura) });
  resultados.push({ fase, modo, ancho, ruta, estado, captura, ...dato });
}

try {
  for (const modo of ['mock', 'real']) for (const ancho of [375, 1280]) {
    const origen = `http://localhost:${modo === 'mock' ? 5174 : 5173}`;
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho === 375 ? 812 : 800 } });
    const pagina = await contexto.newPage();
    const errores = []; const origenes = new Set();
    pagina.on('pageerror', error => errores.push(error.message));
    pagina.on('request', peticion => origenes.add(new URL(peticion.url()).origin));
    for (const ruta of ['/', '/web', '/wa', '/app', '/callcenter', '/clinica', '/admin', '/bandeja']) {
      await pagina.goto(origen + ruta); await pagina.locator('h1').waitFor();
      await capturar(pagina, modo, ancho, ruta, 'inicial');
    }
    // Navegación real de la barra después de recorrer una pantalla larga.
    await pagina.goto(origen + '/callcenter');
    await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await pagina.getByRole('navigation').getByRole('link', { name: 'Admin', exact: true }).click();
    await capturar(pagina, modo, ancho, '/admin', 'navegacion');
    if (modo === 'mock') for (const guion of ['flujoA', 'flujoC']) {
      const ruta = guion === 'flujoA' ? '/callcenter' : '/app';
      await pagina.goto(origen + ruta);
      await pagina.getByLabel('Guion de demo').selectOption(guion);
      for (const paso of [1, 2]) {
        if (paso === 2) {
          if (guion === 'flujoA') await pagina.getByRole('button', { name: 'Llamada entrante', exact: true }).click();
          else { await pagina.getByRole('button', { name: 'Cancelar cita', exact: true }).click(); await pagina.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click(); }
        }
        await pagina.locator('.control-demo [role="status"]').filter({ hasText: `Paso ${paso} de` }).waitFor();
        await pagina.getByRole('navigation').getByRole('link', { name: 'WhatsApp', exact: true }).click();
        await capturar(pagina, modo, ancho, '/wa', `${guion}-paso${paso}`);
        await pagina.getByRole('navigation').getByRole('link', { name: guion === 'flujoA' ? 'Call Center' : 'App', exact: true }).click();
      }
    }
    if (validar && ancho === 375) {
      await pagina.goto(origen + '/wa');
      const lista = pagina.locator('.canales-demo');
      for (const [estado, fraccion] of [['inicio', 0], ['medio', 0.5], ['fin', 1]]) {
        await lista.evaluate((el, f) => { el.scrollLeft = (el.scrollWidth - el.clientWidth) * f; }, fraccion);
        await capturar(pagina, modo, ancho, '/wa', `deslizar-${estado}`);
        const ultimo = resultados.at(-1).canales;
        assert.equal(ultimo.izquierda.clics, 'none'); assert.equal(ultimo.derecha.clics, 'none');
        assert.equal(Number(ultimo.izquierda.opacidad) > 0, fraccion > 0);
        assert.equal(Number(ultimo.derecha.opacidad) > 0, fraccion < 1);
      }
      await pagina.setViewportSize({ width: 767, height: 812 });
      await capturar(pagina, modo, 767, '/wa', 'canales-sin-desbordamiento');
      const sinDesbordamiento = resultados.at(-1).canales;
      assert.ok(sinDesbordamiento.contenido <= sinDesbordamiento.ancho);
      assert.equal(Number(sinDesbordamiento.izquierda.opacidad), 0);
      assert.equal(Number(sinDesbordamiento.derecha.opacidad), 0);
    }
    assert.deepEqual(errores, []);
    assert.deepEqual([...origenes].filter(o => ![origen, 'http://localhost:4000'].includes(o)), []);
    resultados.push({ modo, ancho, errores, origenes: [...origenes] });
    await contexto.close();
  }
  fs.writeFileSync(path.join(carpeta, `06-${fase}-resultados.json`), JSON.stringify(resultados, null, 2));
  process.stdout.write(`PASS: ${fase}, ${resultados.filter(r => r.ruta).length} capturas y mediciones, ocho rutas, dos modos y dos tamaños.\n`);
} finally { await navegador.close(); }
