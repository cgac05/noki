// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const estilos = leer('./styles.css');
const raiz = estilos.match(/:root\s*\{([^}]+)\}/)?.[1] ?? '';
const variables = Object.fromEntries([...raiz.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(([, nombre, valor]) => [nombre, valor]));

function luminancia(color: string) {
  const canales = [1, 3, 5].map(inicio => {
    const valor = Number.parseInt(color.slice(inicio, inicio + 2), 16) / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  });
  return canales[0]! * 0.2126 + canales[1]! * 0.7152 + canales[2]! * 0.0722;
}

function contraste(frente: string, fondo: string) {
  expect(variables[frente], frente).toBeDefined();
  expect(variables[fondo], fondo).toBeDefined();
  const valores = [luminancia(variables[frente]!), luminancia(variables[fondo]!)];
  return (Math.max(...valores) + 0.05) / (Math.min(...valores) + 0.05);
}

it('mantiene contraste AA del texto en todas las superficies declaradas', () => {
  for (const fondo of ['--sd-fondo', '--sd-fondo-suave', '--sd-fondo-interactivo', '--fondo-deshabilitado']) {
    for (const tinta of ['--tinta', '--tinta-secundaria', '--sd-enlace']) {
      expect(contraste(tinta, fondo), `${tinta} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const fondo of ['--sd-accion', '--sd-accion-hover']) expect(contraste('--sd-fondo', fondo)).toBeGreaterThanOrEqual(4.5);
  for (const fondo of ['--sd-fondo', '--fondo-error']) expect(contraste('--error', fondo)).toBeGreaterThanOrEqual(4.5);
});

it('distingue el foco y los bordes de control de sus superficies', () => {
  for (const fondo of ['--sd-fondo', '--sd-fondo-suave', '--sd-fondo-interactivo', '--fondo-deshabilitado']) {
    for (const control of ['--sd-accion', '--borde-control']) expect(contraste(control, fondo), `${control} sobre ${fondo}`).toBeGreaterThanOrEqual(3);
  }
  expect(estilos).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--sd-accion\)/);
  for (const bloque of estilos.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    if (/\bborder(?:-color)?:/.test(bloque[2]!) && /input|select|button|boton-secundario/.test(bloque[1]!)) {
      expect(bloque[2], bloque[1]).not.toContain('var(--linea)');
    }
  }
});

it('centraliza los colores y reserva el verde para la marca grande', () => {
  expect(estilos.replace(/:root\s*\{[^}]+\}/, '')).not.toMatch(/#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i);
  // D5 permite acentos no textuales verdes; el texto verde sigue reservado a la marca.
  const usos = [...estilos.matchAll(/([^{}]+)\{([^{}]*var\(--sd-marca\)[^{}]*)\}/g)]
    .filter(([, , cuerpo]) => /(?:^|[;{])\s*color:\s*var\(--sd-marca\)/.test(cuerpo!));
  expect(usos).toHaveLength(1);
  expect(usos[0]?.[1]?.trim()).toBe('.marca');
  expect(usos[0]?.[2]).toMatch(/color:\s*var\(--sd-marca\)/);
  expect(estilos).toMatch(/\.marca\s*\{[^}]*font-size:\s*2rem;[^}]*font-weight:\s*700/);
  expect(contraste('--sd-marca', '--sd-fondo')).toBeGreaterThanOrEqual(3);
});

it('separa los canales y la simulación con los colores y contrastes de D5', () => {
  const regla = (selector: string) => [...estilos.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
    .filter(([, selectores]) => selectores!.split(',').some(valor => valor.trim() === selector))
    .map(([, , cuerpo]) => cuerpo).join('\n');
  expect(regla('.barra-demo ul')).toMatch(/gap:\s*0\.5rem/);
  expect(regla('.barra-demo')).toMatch(/background:\s*var\(--sd-fondo-suave\)/);
  expect(regla('.barra-demo a')).toMatch(/border:\s*0/);
  expect(regla('.barra-demo a')).toMatch(/background:\s*transparent/);
  const divisor = regla('.barra-demo li + li::before');
  expect(divisor).toMatch(/border-left:\s*1px solid var\(--borde-control\)/);
  expect(divisor).toMatch(/height:\s*1\.25rem/);
  expect(divisor).toMatch(/top:\s*50%/);
  expect(regla('.barra-demo a[aria-current="page"]')).toMatch(/background:\s*var\(--sd-accion\)/);
  expect(regla('.barra-demo a[aria-current="page"]')).toMatch(/color:\s*var\(--sd-fondo\)/);
  expect(regla('.barra-demo a[aria-current="page"]')).toMatch(/font-weight:\s*600/);
  expect(regla('.barra-demo a:hover')).toMatch(/background:\s*var\(--sd-fondo-interactivo\)/);
  expect(regla('.franja-simulacion')).toMatch(/background:\s*var\(--sd-fondo-suave\)/);
  expect(regla('.franja-simulacion')).not.toMatch(/border-top:/);
  expect(regla('.progreso-demo')).toMatch(/border:\s*1px solid var\(--borde-control\)/);
  for (const selector of ['.progreso-demo', '.progreso-demo::-webkit-progress-bar']) {
    expect(regla(selector)).toMatch(/background:\s*var\(--linea\)/);
  }
  for (const selector of ['.progreso-demo::-webkit-progress-value', '.progreso-demo::-moz-progress-bar']) {
    expect(regla(selector)).toMatch(/background:\s*var\(--sd-marca\)/);
  }
  expect(contraste('--borde-control', '--sd-fondo-suave')).toBeGreaterThanOrEqual(3);
  expect(contraste('--sd-fondo', '--sd-accion')).toBeGreaterThanOrEqual(4.5);
  expect(contraste('--sd-marca', '--linea')).toBeGreaterThanOrEqual(3);
});

it('sirve Open Sans latina local en los tres pesos sin fuentes de terceros', () => {
  const manifiesto: { dependencies: Record<string, string> } = JSON.parse(leer('../package.json'));
  expect(manifiesto.dependencies['@fontsource/open-sans']).toMatch(/^\d+\.\d+\.\d+$/);
  const entrada = leer('./main.tsx');
  const resolver = createRequire(new URL('../package.json', import.meta.url));
  for (const peso of [400, 600, 700]) {
    const ruta = `@fontsource/open-sans/latin-${peso}.css`;
    expect(entrada).toContain(`import '${ruta}'`);
    const fuente = readFileSync(resolver.resolve(ruta), 'utf8');
    expect(fuente).toContain("font-family: 'Open Sans'");
    expect(fuente).not.toMatch(/https?:|\/\//);
    expect(fuente).toMatch(/url\(\.\/files\/open-sans-latin-/);
  }
  expect(raiz).toMatch(/font-family:\s*"Open Sans",\s*system-ui,\s*sans-serif/);
  for (const contenido of [estilos, entrada, leer('../index.html')]) expect(contenido).not.toMatch(/https?:\/\/|@import\s+url\(/i);
});

it('declara la marca en los metadatos y no incluye archivos gráficos del logo', () => {
  const documento = leer('../index.html');
  expect(documento).toContain('<title>Salud Digna 360 · Atención conectada</title>');
  expect(documento).toMatch(/name="description" content="[^"]*Salud Digna 360/);
  expect(documento).toContain('name="theme-color" content="#008959"');
  const archivos = ['src', 'public'].flatMap(carpeta => {
    try { return readdirSync(new URL(`../${carpeta}`, import.meta.url), { recursive: true, encoding: 'utf8' }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  });
  expect(archivos.filter(nombre => /\.(svg|png|webp|jpe?g|gif|ico)$/i.test(nombre))).toEqual([]);
});

it('Acento verde de identidad: solo agrega las dos variables de éxito autorizadas y mantiene contraste AA', () => {
  expect(variables['--sd-exito']).toBe('#006B45');
  expect(variables['--sd-fondo-exito']).toBe('#E6F4EE');
  expect(contraste('--sd-exito', '--sd-fondo-exito')).toBeGreaterThanOrEqual(4.5);
  expect(contraste('--sd-exito', '--sd-fondo')).toBeGreaterThanOrEqual(4.5);
  const nombres = [...raiz.matchAll(/(--[\w-]+):/g)].map(([, nombre]) => nombre).sort();
  expect(nombres).toEqual([
    '--sd-marca', '--sd-accion', '--sd-accion-hover', '--sd-enlace', '--sd-fondo', '--sd-fondo-suave', '--sd-fondo-interactivo',
    '--tinta', '--tinta-secundaria', '--borde-control', '--linea', '--error', '--fondo-error', '--fondo-deshabilitado', '--fondo-modal',
    '--sd-exito', '--sd-fondo-exito',
  ].sort());
});

it('Acento verde de identidad: línea superior, éxito y logros usan las variables y no recolorean valores', () => {
  const regla = (selector: string) => [...estilos.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
    .filter(([, lista]) => lista!.split(',').some(valor => valor.trim() === selector))
    .map(([, , cuerpo]) => cuerpo).join('\n');
  expect(regla('.layout')).toMatch(/border-top:\s*3px solid var\(--sd-marca\)/);
  const exito = regla('.estado-exito');
  expect(exito).toMatch(/background:\s*var\(--sd-fondo-exito\)/);
  expect(exito).toMatch(/color:\s*var\(--sd-exito\)/);
  expect(exito).toMatch(/border-left:\s*3px solid var\(--sd-marca\)/);
  expect(exito).toMatch(/padding:\s*1rem/);
  expect(regla('.aviso')).toMatch(/padding:\s*1rem/);
  expect(regla('.datos-tarjetas > .tarjeta-logro')).toMatch(/border-top:\s*3px solid var\(--sd-marca\)/);
  expect(regla('.datos-tarjetas dd')).toMatch(/color:\s*var\(--tinta\)/);
  expect(regla('.tarjeta-logro dd')).not.toContain('var(--sd-marca)');
  expect(regla('.tarjeta-logro dd')).not.toContain('var(--sd-exito)');
});

it('reserva el verde a identidad y éxito, con la marca como única excepción de enlace autorizada', () => {
  const interactivo = /\b(?:a|button|input|select|textarea)\b|\.boton(?:-|\b)|\.enlace(?:-|\b)|\[role\s*=\s*["']?(?:button|link|textbox|combobox)/;
  for (const [, lista, cuerpo] of estilos.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    if (!/var\(--sd-(?:marca|exito|fondo-exito)\)/.test(cuerpo!)) continue;
    for (const selector of lista!.split(',').map(valor => valor.trim())) {
      if (selector === '.marca') continue; // Excepción de identidad elegida por el usuario en esta sesión.
      expect(interactivo.test(selector), selector).toBe(false);
    }
  }
});
