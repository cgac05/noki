import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';

const cambio = 'openspec/changes/marca-salud-digna-360/';
const evidencia = cambio + 'evidencias/';
const manifiesto = evidencia + '04-archivos-entregados.json';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const leer = ruta => JSON.parse(fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''));
const hash = ruta => createHash('sha256').update(fs.readFileSync(ruta)).digest('hex');
const head = git('rev-parse', 'HEAD');
assert.equal(head, git('rev-parse', 'origin/main'), '4.1 requiere la base origin/main vigente');
assert.equal(git('log', '--oneline', 'origin/main..HEAD'), '');
assert.equal(git('diff', '--name-only', '--cached'), '');
execFileSync('git', ['diff', '--check']);

const controles = [leer(evidencia + '04-resultados.json')].flat();
assert.equal(controles.length, 3);
const resumen = texto => {
  const archivos = /Test Files\s+(\d+) passed/.exec(texto);
  const pruebas = /Tests\s+(\d+) passed/.exec(texto);
  assert.ok(archivos && pruebas, 'La salida debe tener resumen de suite aprobada');
  return { archivos: Number(archivos[1]), pruebas: Number(pruebas[1]) };
};
const controlesAprobados = controles.every(control => control.codigo === 0);
const salidaTest = fs.readFileSync(evidencia + '04-test.txt', 'utf8');
if (!controlesAprobados) assert.match(salidaTest, /casosTramite\.test\.ts\(655,76\): error TS2353/);
const total = controlesAprobados ? resumen(salidaTest) : null;
const web = resumen(fs.readFileSync(evidencia + '07-web.txt', 'utf8'));
const antes = leer(evidencia + '07-antes-resultados.json').filter(r => r.captura);
const despues = leer(evidencia + '07-despues-resultados.json').filter(r => r.captura);
assert.equal(antes.length, 46); assert.equal(despues.length, 46);
for (const captura of [...antes, ...despues]) assert.ok(fs.existsSync(evidencia + captura.captura));
const cambiosD7 = new Set([
  'apps/web/src/styles.css', 'apps/web/src/componentes/LlegadaClinica.tsx',
  'apps/web/src/vistas/App.tsx', 'apps/web/src/vistas/Admin.tsx',
  'apps/web/src/identidadVisual.test.ts', 'apps/web/src/acentoIdentidad.test.tsx',
]);
const anterior = leer(evidencia + 'ajuste-4/04-archivos-entregados.json');
const conservados = anterior.archivos.filter(({ ruta }) =>
  !cambiosD7.has(ruta) && (ruta.startsWith('apps/web/') || ruta === 'pnpm-lock.yaml' ||
    (ruta.startsWith(evidencia) && !/^04-/.test(ruta.slice(evidencia.length)))));
for (const archivo of conservados) assert.equal(hash(archivo.ruta), archivo.sha256, `Previo alterado: ${archivo.ruta}`);

const lista = [...new Set([
  ...git('diff', '--name-only', '-z').split('\0'),
  ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
].filter(Boolean))].sort();
const excluidos = ['.claude/launch.json', manifiesto];
const entregados = lista.filter(ruta => !excluidos.includes(ruta));
for (const ruta of entregados) assert.ok(ruta.startsWith('apps/web/') || ruta === 'pnpm-lock.yaml' || ruta.startsWith(cambio), `Fuera del alcance: ${ruta}`);
const prueba = leer(evidencia + '07-solo-presentacion.json');
assert.equal(prueba.cssAnteriorSinCambios, true);
assert.ok(prueba.resultados.every(r => r.soloPresentacion));
const rutasEnlaces = [cambio + 'implementacion.md', evidencia + '07-verde.md'];
for (const archivo of rutasEnlaces) {
  for (const [, enlace] of fs.readFileSync(archivo, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|#|\/)/.test(enlace)) continue;
    const base = archivo.slice(0, archivo.lastIndexOf('/') + 1);
    assert.ok(fs.existsSync(base + enlace), `Enlace local ausente: ${enlace}`);
  }
}
const resultado = {
  cambio: 'marca-salud-digna-360', revision: 'Ajuste 5 D7 autorizado, 2026-11-25',
  rama: git('branch', '--show-current'), base: head, originMain: git('rev-parse', 'origin/main'),
  mainLocal: git('rev-parse', 'main'), commitsPropios: 0, staged: [],
  autorizacion: {
    referencia: 'handoff.md, ajuste 5 y petición explícita del responsable en esta sesión',
    alcance: 'Solo D7, 7.1–7.3 y repetir 4.1; sin commits',
    excepcionMarca: 'Conservar marca verde como excepción, elegido por el usuario',
    hashesIniciales: {
      propuesta: '6a65e5eb589c06388c5305ec9d5d4559df25edb85f3047fce11b09aac7675fa2',
      diseno: 'ea0c82919681aa9a85f0856802142c6bb644b0ebf85a0a8828d6b23ef30695fd',
      tareas: 'e4212cc46936e934952c6302073bc077057c52fd9ff33b68959a20dd18ef45a9',
      delta: '4d99af95cdeca9ed40a3541d4628efc1b5c2a164624ed918e54ddc9271070982',
    },
  },
  archivos: entregados.map(ruta => ({ ruta, sha256: hash(ruta) })),
  excluidos: ['.claude/launch.json: preexistente ajeno al cambio, intacto', 'El propio manifiesto para evitar un hash circular'],
  preservacion: { archivosPreviosVerificados: conservados.length, productosPreviosSinCambios: conservados.filter(a => !a.ruta.startsWith(cambio)).length, cssAnteriorSinCambios: true, soloPresentacion: true },
  validaciones: {
    controles, total, web, estado41: controlesAprobados ? 'PASS' : 'BLOQUEADO por error TS2353 en main; pendiente por decisión del usuario',
    suiteBaseInicial: resumen(fs.readFileSync(evidencia + 'ajuste-5-base-inicial/04-test.txt', 'utf8')),
    rojo: { codigoEsperado: 1, fallos: 5, correctas: 7 },
    capturasAntes: antes.length, capturasDespues: despues.length,
    altoMaximoBarraMovil: Math.max(...despues.filter(r => r.modo === 'mock' && r.ancho === 375).map(r => r.barra.alto)),
    contrasteExito: prueba.contrasteExitoSobreFondoExito,
    controlesVerdesSalvoMarca: despues.flatMap(r => r.controlesVerdes).length,
    diffCheck: 0, testIntegracion: 'NO APLICA según 4.1: solo frontend',
  },
  evidenciaAnterior: ['evidencias/ajuste-4/', 'evidencias/ajuste-3/', 'evidencias/revision-2/', 'evidencias/pre-rebase/'],
};
assert.equal(resultado.validaciones.controlesVerdesSalvoMarca, 0);
fs.writeFileSync(manifiesto, JSON.stringify(resultado, null, 2) + '\n');
process.stdout.write(JSON.stringify({ archivos: resultado.archivos.length, preservacion: resultado.preservacion, base: head, pruebas: total }) + '\n');
