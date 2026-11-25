// Ejecutar desde la raíz con NOKI_BROWSER_TOOLS apuntando a Playwright temporal.
/* global process, URL, document, innerWidth, getComputedStyle, window */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.join(process.env.NOKI_BROWSER_TOOLS, 'node_modules/playwright/index.mjs')).href);
const carpeta = path.dirname(fileURLToPath(import.meta.url));
const navegador = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const resultados = [];

async function comprobar(pagina, modo, ancho, ruta, estado, captura = false) {
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
  const datos = await pagina.evaluate(() => {
    const rect = elemento => { const r = elemento.getBoundingClientRect(); return { x: r.x, y: r.y, ancho: r.width, alto: r.height, abajo: r.bottom }; };
    const nav = document.querySelector('.barra-demo');
    const estilo = getComputedStyle(nav);
    const progreso = nav.querySelector('progress');
    const franja = nav.querySelector('.franja-simulacion');
    const compositor = document.querySelector('.wa-compositor');
    const actual = nav.querySelector('a[aria-current="page"]');
    const vars = getComputedStyle(document.documentElement);
    return {
      ancho: innerWidth, contenido: document.documentElement.scrollWidth,
      barra: rect(nav), posicion: estilo.position, fondoBarra: estilo.backgroundColor, altoReservado: vars.getPropertyValue('--alto-barra-demo'),
      canales: [...nav.querySelectorAll('a')].map(a => ({ nombre: a.textContent, ...rect(a), borde: getComputedStyle(a).borderWidth, radio: getComputedStyle(a).borderRadius, fondo: getComputedStyle(a).backgroundColor })),
      divisores: [...nav.querySelectorAll('ul > li')].slice(1).map(li => { const s = getComputedStyle(li, '::before'); return { alto: s.height, borde: s.borderLeftWidth, color: s.borderLeftColor, contenido: s.content }; }),
      separacion: getComputedStyle(nav.querySelector('ul')).gap,
      actual: actual && { ruta: actual.getAttribute('href'), fondo: getComputedStyle(actual).backgroundColor, texto: getComputedStyle(actual).color, peso: getComputedStyle(actual).fontWeight },
      simulacion: franja && { fondo: getComputedStyle(franja).backgroundColor, borde: getComputedStyle(franja).borderTopWidth, colorBorde: getComputedStyle(franja).borderTopColor },
      paso: nav.querySelector('[role="status"]')?.textContent,
      progreso: progreso && { valor: progreso.value, maximo: progreso.max, nombre: document.getElementById(progreso.getAttribute('aria-labelledby'))?.textContent, borde: getComputedStyle(progreso).borderWidth },
      compositor: compositor && rect(compositor),
    };
  });
  assert.ok(datos.contenido <= ancho, `${modo} ${ancho} ${ruta}: desbordamiento`);
  assert.equal(datos.canales.length, 7);
  assert.equal(datos.fondoBarra, 'rgb(236, 243, 249)');
  assert.equal(datos.separacion, '8px');
  for (const canal of datos.canales) {
    assert.ok(canal.ancho >= 44 && canal.alto >= 44, canal.nombre);
    assert.equal(canal.borde, '0px');
    assert.equal(canal.radio, '0px');
  }
  assert.equal(datos.divisores.length, 6);
  for (const divisor of datos.divisores) {
    assert.equal(divisor.alto, '20px');
    assert.equal(divisor.borde, '1px');
    assert.equal(divisor.color, 'rgb(134, 133, 137)');
    assert.equal(divisor.contenido, '""');
  }
  if (ruta !== '/') {
    assert.equal(datos.actual.ruta, ruta);
    assert.equal(datos.actual.fondo, 'rgb(0, 116, 217)');
    assert.equal(datos.actual.texto, 'rgb(255, 255, 255)');
    assert.equal(datos.actual.peso, '600');
  }
  assert.equal(!!datos.simulacion, modo === 'mock');
  assert.equal(!!datos.progreso, modo === 'mock');
  if (modo === 'mock') {
    assert.equal(datos.simulacion.fondo, datos.fondoBarra);
    assert.equal(datos.simulacion.borde, '0px');
    assert.equal(datos.progreso.nombre, datos.paso);
    assert.equal(datos.progreso.borde, '1px');
    assert.ok(await pagina.getByText('Simulación', { exact: true }).isVisible());
  }
  if (ancho < 768) {
    assert.equal(datos.posicion, 'fixed');
    assert.equal(Math.round(datos.barra.abajo), 812);
    assert.ok(Math.abs(Number.parseFloat(datos.altoReservado) - datos.barra.alto) < 1);
    if (datos.compositor) {
      assert.ok(datos.compositor.abajo <= datos.barra.y + 1, 'El compositor se solapa con la barra');
      assert.ok(datos.compositor.y >= 0, 'Compositor fuera de la ventana');
      const enviar = pagina.locator('.wa-compositor').getByRole('button', { name: 'Enviar', exact: true });
      assert.ok(await enviar.isVisible());
      const libre = await enviar.evaluate(boton => { const r = boton.getBoundingClientRect(); return boton.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      assert.equal(libre, true, 'Enviar está tapado');
    }
  } else assert.equal(datos.posicion, 'sticky');
  const nombreCaptura = captura ? `05-${modo}-${ancho}-${estado}-${ruta.slice(1) || 'portada'}.png` : undefined;
  if (captura) await pagina.screenshot({ path: path.join(carpeta, nombreCaptura) });
  resultados.push({ modo, ancho, ruta, estado, captura: nombreCaptura, ...datos });
}

try {
  for (const modo of ['mock', 'real']) {
    const origen = `http://localhost:${modo === 'mock' ? 5174 : 5173}`;
    for (const ancho of [375, 1280]) {
      const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho === 375 ? 812 : 900 } });
      const pagina = await contexto.newPage();
      const errores = [];
      const origenes = new Set();
      pagina.on('pageerror', error => errores.push(error.message));
      pagina.on('request', peticion => origenes.add(new URL(peticion.url()).origin));
      pagina.on('websocket', socket => origenes.add(new URL(socket.url()).origin));
      for (const ruta of ['/', '/web', '/wa', '/app', '/callcenter', '/clinica', '/admin', '/bandeja']) {
        await pagina.goto(origen + ruta);
        await pagina.locator('h1').waitFor();
        await comprobar(pagina, modo, ancho, ruta, 'inicial', modo === 'real' && ruta === '/wa');
      }
      if (modo === 'mock') {
        for (const guion of ['flujoA', 'flujoC']) {
          await pagina.goto(origen + (guion === 'flujoA' ? '/callcenter' : '/app'));
          await pagina.getByLabel('Guion de demo').selectOption(guion);
          const total = guion === 'flujoA' ? 14 : 4;
          for (const paso of [1, 2]) {
            const ruta = guion === 'flujoA' ? '/callcenter' : '/app';
            if (paso === 2) {
              if (guion === 'flujoA') await pagina.getByRole('button', { name: 'Llamada entrante', exact: true }).click();
              else {
                await pagina.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
                await pagina.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
              }
            }
            await pagina.locator('.control-demo [role="status"]').filter({ hasText: `Paso ${paso} de ${total}` }).waitFor();
            assert.equal(await pagina.getByRole('progressbar').getAttribute('value'), String(paso));
            assert.equal(await pagina.getByRole('progressbar').getAttribute('max'), String(total));
            await comprobar(pagina, modo, ancho, ruta, `${guion}-paso${paso}`, true);
            await pagina.getByRole('navigation').getByRole('link', { name: 'WhatsApp', exact: true }).click();
            await comprobar(pagina, modo, ancho, '/wa', `${guion}-paso${paso}`, true);
            // El compositor sigue recibiendo entrada y no queda cubierto por la franja.
            await pagina.locator('.wa-compositor input').fill('Hola');
            assert.equal(await pagina.locator('.wa-compositor').getByRole('button', { name: 'Enviar', exact: true }).isEnabled(), true);
            await pagina.locator('.wa-compositor input').fill('');
            await pagina.getByRole('navigation').getByRole('link', { name: guion === 'flujoA' ? 'Call Center' : 'App', exact: true }).click();
          }
          await pagina.getByRole('button', { name: 'Reiniciar guion' }).click();
          assert.equal(await pagina.getByRole('progressbar').getAttribute('value'), '1');
        }
      }
      await pagina.getByRole('navigation').getByRole('link', { name: 'WhatsApp', exact: true }).click();
      const web = pagina.getByRole('navigation').getByRole('link', { name: 'Web', exact: true });
      await web.hover();
      assert.equal(await web.evaluate(a => getComputedStyle(a).backgroundColor), 'rgb(230, 242, 252)');
      await web.focus();
      await pagina.keyboard.press('Tab');
      const foco = await pagina.evaluate(() => {
        const activo = document.activeElement;
        const s = getComputedStyle(activo);
        const r = activo.getBoundingClientRect();
        return { texto: activo.textContent, visible: activo.matches(':focus-visible'), anillo: s.outlineWidth, color: s.outlineColor, dentro: r.left >= 7 && r.right <= innerWidth - 7 };
      });
      assert.equal(foco.visible, true);
      assert.equal(foco.anillo, '3px');
      assert.equal(foco.color, 'rgb(0, 116, 217)');
      assert.equal(foco.dentro, true);
      await pagina.screenshot({ path: path.join(carpeta, `05-${modo}-${ancho}-foco-wa.png`) });
      resultados.push({ modo, ancho, foco });
      if (ancho === 375) {
        for (const limite of [320, 767, 768]) {
          await pagina.setViewportSize({ width: limite, height: 812 });
          await comprobar(pagina, modo, limite, '/wa', 'limite');
        }
      }
      assert.deepEqual(errores, []);
      const permitidos = [origen, origen.replace('http:', 'ws:'), 'http://localhost:4000', 'ws://localhost:4000'];
      assert.deepEqual([...origenes].filter(o => !permitidos.includes(o)), []);
      resultados.push({ modo, ancho, erroresJavascript: errores, origenes: [...origenes] });
      await contexto.close();
    }
  }
  fs.writeFileSync(path.join(carpeta, '05-resultados.json'), JSON.stringify(resultados, null, 2));
  process.stdout.write(`PASS: ${resultados.filter(r => r.ruta).length} comprobaciones de layout, pasos 1/2 de A/C, dos modos, foco, hover, reinicio y compositor sin solapamiento.\n`);
} finally { await navegador.close(); }
