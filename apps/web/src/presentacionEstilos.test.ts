// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const estilos = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const movil = estilos.slice(estilos.indexOf('@media (max-width: 767px)'));
const escritorio = estilos.slice(0, estilos.indexOf('@media (max-width: 767px)'));
function regla(css: string, selector: string) {
  return [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
    .filter(([, lista]) => lista!.split(',').some(valor => valor.trim() === selector))
    .map(([, , cuerpo]) => cuerpo).join('\n');
}

it('Celular compacto: marca e insignia sin saltos, paso truncado y progreso de 4px', () => {
  expect(regla(movil, '.marca')).toMatch(/font-size:\s*1\.5rem/);
  expect(regla(movil, '.marca')).toMatch(/white-space:\s*nowrap/);
  expect(regla(estilos, '.insignia-mock')).toMatch(/white-space:\s*nowrap/);
  expect(regla(movil, '.control-demo p')).toMatch(/text-overflow:\s*ellipsis/);
  expect(regla(movil, '.control-demo p')).toMatch(/white-space:\s*nowrap/);
  expect(regla(movil, '.progreso-demo')).toMatch(/height:\s*4px/);
});

it('Título visible al navegar: escala moderada y margen de desplazamiento bajo la barra', () => {
  expect(regla(estilos, 'h1')).toMatch(/font-size:\s*clamp\(2rem,\s*4vw,\s*3rem\)/);
  expect(regla(estilos, '.titulo-portada')).toMatch(/font-size:\s*clamp\(2\.5rem,\s*6vw,\s*4\.5rem\)/);
  expect(regla(estilos, '.contenido')).toMatch(/padding-block:\s*clamp\(2rem,\s*5vw,\s*3\.5rem\)/);
  for (const selector of ['#contenido', 'h1']) expect(regla(escritorio, selector)).toMatch(/scroll-margin-top:\s*calc\(var\(--alto-barra-demo,\s*0px\)\s*\+\s*1rem\)/);
  expect(regla(escritorio, '.control-demo p')).toMatch(/font-size:\s*0\.9375rem/);
  expect(regla(escritorio, '.control-demo p')).toMatch(/color:\s*var\(--tinta\)/);
  expect(regla(escritorio, '.progreso-demo')).toMatch(/height:\s*8px/);
});

it('Indicadores en tarjetas: cuadrícula acotada, valor destacado y etiqueta sin reordenar el DOM', () => {
  expect(regla(estilos, '.datos-tarjetas')).toMatch(/repeat\(auto-fill,\s*minmax\(10rem,\s*1fr\)\)/);
  expect(regla(estilos, '.datos-tarjetas')).toMatch(/gap:\s*0\.75rem/);
  const tarjeta = regla(estilos, '.datos-tarjetas > div');
  expect(tarjeta).toMatch(/background:\s*var\(--sd-fondo-suave\)/);
  expect(tarjeta).toMatch(/border:\s*1px solid var\(--linea\)/);
  expect(tarjeta).toMatch(/border-radius:\s*0\.5rem/);
  expect(tarjeta).toMatch(/padding:\s*1rem/);
  expect(regla(estilos, '.datos-tarjetas dd')).toMatch(/font-size:\s*1\.75rem/);
  expect(regla(estilos, '.datos-tarjetas dd')).toMatch(/font-weight:\s*600/);
  expect(regla(estilos, '.datos-tarjetas dd')).toMatch(/order:\s*-1/);
  expect(regla(estilos, '.datos-tarjetas dt')).toMatch(/font-size:\s*0\.8125rem/);
  expect(tarjeta).not.toContain('box-shadow');
});

it('Estado vacío: superficie común, enlaces de la paleta y ninguna sombra nueva', () => {
  const vacio = regla(estilos, '.estado-vacio');
  expect(vacio).toMatch(/background:\s*var\(--sd-fondo-suave\)/);
  expect(vacio).toMatch(/border:\s*1px solid var\(--linea\)/);
  expect(vacio).toMatch(/border-radius:\s*0\.5rem/);
  expect(vacio).toMatch(/padding:\s*1\.25rem/);
  expect(vacio).toMatch(/color:\s*var\(--tinta-secundaria\)/);
  expect(regla(estilos, '.estado-vacio a')).toMatch(/color:\s*var\(--sd-enlace\)/);
  expect(estilos).not.toContain('box-shadow');
});
