// Ejecutar desde la raíz con NOKI_BROWSER_TOOLS apuntando a Playwright temporal.
/* global process, URL, document, innerWidth, getComputedStyle, window */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.join(process.env.NOKI_BROWSER_TOOLS, 'node_modules/playwright/index.mjs')).href);

(async () => {
  const carpeta = path.dirname(fileURLToPath(import.meta.url));
  const navegador = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const resultados = [];
  try {
    for (const modo of ['mock', 'real']) {
      const origen = `http://localhost:${modo === 'mock' ? 5174 : 5173}`;
      for (const ancho of [375, 1280]) {
        const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho === 375 ? 812 : 900 } });
        const pagina = await contexto.newPage();
        const origenes = new Set();
        const errores = [];
        pagina.on('request', peticion => { origenes.add(new URL(peticion.url()).origin); });
        pagina.on('websocket', socket => { origenes.add(new URL(socket.url()).origin); });
        pagina.on('pageerror', error => errores.push(error.message));
        for (const ruta of ['/', '/web', '/wa', '/app', '/callcenter', '/clinica', '/admin', '/bandeja']) {
          await pagina.goto(origen + ruta);
          await pagina.locator('h1').waitFor();
          await pagina.evaluate(() => document.fonts.ready);
          await pagina.waitForTimeout(400);
          await pagina.evaluate(() => window.scrollTo(0, 0));
          const datos = await pagina.evaluate(() => {
            const marca = document.querySelector('.marca');
            const fuente = getComputedStyle(marca);
            return {
              titulo: document.title, marca: marca.textContent, destino: marca.getAttribute('href'),
              textoInternoVisible: /noki/i.test(document.body.innerText),
              ancho: innerWidth, contenido: document.documentElement.scrollWidth,
              fuente: fuente.fontFamily, tamanoMarca: fuente.fontSize, pesoMarca: fuente.fontWeight,
              fuenteCargada: document.fonts.check('700 32px "Open Sans"'),
              simulado: !!document.querySelector('.insignia-mock'),
            };
          });
          assert.equal(datos.marca, 'Salud Digna 360');
          assert.equal(datos.destino, '/');
          assert.match(datos.titulo, /Salud Digna 360/);
          assert.equal(datos.textoInternoVisible, false);
          assert.equal(datos.simulado, modo === 'mock', `${modo} ${ancho} ${ruta}: insignia`);
          assert.equal(datos.fuenteCargada, true);
          assert.ok(datos.contenido <= ancho, `${modo} ${ancho} ${ruta}: desborda ${datos.contenido}`);
          const captura = `03-${modo}-${ancho}-${ruta === '/' ? 'portada' : ruta.slice(1)}.png`;
          await pagina.screenshot({ path: path.join(carpeta, captura), fullPage: true });
          resultados.push({ modo, ruta, captura, ...datos });
        }

        if (modo === 'mock') {
          await pagina.goto(origen + '/callcenter');
          const llamar = pagina.getByRole('button', { name: 'Llamada entrante', exact: true });
          const activo = await llamar.evaluate(elemento => getComputedStyle(elemento).backgroundColor);
          await pagina.getByLabel('Número de la llamada (ANI)').fill('12345');
          assert.equal(await llamar.isDisabled(), true);
          const inactivo = await llamar.evaluate(elemento => getComputedStyle(elemento).backgroundColor);
          assert.notEqual(activo, inactivo);
          await pagina.screenshot({ path: path.join(carpeta, `03-deshabilitado-${ancho}.png`), fullPage: true });
          await pagina.getByLabel('Número de la llamada (ANI)').fill('5210000000001');
          await pagina.getByRole('button', { name: 'Llamada entrante', exact: true }).click();
          await pagina.getByRole('heading', { name: 'Ficha del hilo' }).waitFor();
          assert.equal(await pagina.getByRole('button', { name: 'Continuar por WhatsApp', exact: true }).isDisabled(), true);
          await pagina.getByRole('button', { name: /^Cotizar / }).click();
          await pagina.getByText('COTIZADO', { exact: true }).waitFor();
          await pagina.getByRole('checkbox').check();
          await pagina.getByRole('button', { name: 'Continuar por WhatsApp', exact: true }).click();
          await pagina.getByRole('link', { name: 'Abrir WhatsApp', exact: true }).waitFor();
          await pagina.getByRole('link', { name: 'Abrir WhatsApp', exact: true }).click();
          await pagina.getByRole('button', { name: 'Ver horarios', exact: true }).waitFor();
          await pagina.getByRole('button', { name: 'Ver horarios', exact: true }).click();
          await pagina.getByRole('button', { name: 'Ver opciones', exact: true }).click();
          await pagina.getByRole('dialog').waitFor();
          await pagina.getByRole('button', { name: 'Jueves 26 · 09:15', exact: true }).click();
          await pagina.getByRole('button', { name: 'Revisar cita', exact: true }).waitFor();
          await pagina.screenshot({ path: path.join(carpeta, `03-flujoA-${ancho}.png`), fullPage: true });
          await pagina.getByLabel('Guion de demo').selectOption('flujoC');
          await pagina.getByRole('link', { name: 'App', exact: true }).click();
          await pagina.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
          await pagina.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
          await pagina.getByText(/espera aprobación en WhatsApp/).waitFor();
          await pagina.screenshot({ path: path.join(carpeta, `03-flujoC-${ancho}.png`), fullPage: true });
          resultados.push({ modo, ancho, activo, inactivo, flujos: 'A: cotización, consentimiento, continuación y reserva de horario; C: solicitud de cancelación y aviso de aprobación' });
        } else {
          await pagina.route('http://localhost:4000/api/**', ruta => ruta.abort('failed'));
          await pagina.goto(origen + '/admin');
          await pagina.getByRole('button', { name: 'Reintentar', exact: true }).first().waitFor();
          await pagina.screenshot({ path: path.join(carpeta, `03-error-${ancho}.png`), fullPage: true });
          resultados.push({ modo, ancho, errorForzado: 'Red abortada en el navegador, sin modificar la API' });
        }
        const permitidos = [origen, 'http://localhost:4000', origen.replace('http:', 'ws:'), 'ws://localhost:4000'];
        assert.deepEqual([...origenes].filter(valor => !permitidos.includes(valor)), []);
        assert.deepEqual(errores, []);
        resultados.push({ modo, ancho, origenes: [...origenes], erroresJavascript: errores });
        await contexto.close();
      }
    }
    fs.writeFileSync(path.join(carpeta, '03-resultados.json'), JSON.stringify(resultados, null, 2));
    process.stdout.write(`PASS: ${resultados.filter(r => r.ruta).length} vistas, dos tamaños, dos modos, guiones A/C y errores de red.\n`);
  } finally {
    await navegador.close();
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
