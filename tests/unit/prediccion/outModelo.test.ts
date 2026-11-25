import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FACTORES_RIESGO } from '../../../packages/domain/src/index.ts';
import { CalendarioSedeMemoria } from '../../../packages/adapters/memory/src/index.ts';
import {
  CalendarioSedeDateFns, cargarModeloRiesgo, leerModeloRiesgo, ModeloInvalido, ModeloRiesgoLogistico,
} from '../../../packages/adapters/out-modelo/src/index.ts';

const ceros = FACTORES_RIESGO.map(() => 0);
const modelo = {
  version: 'prueba', factores: FACTORES_RIESGO, medias: ceros,
  desviaciones: ceros.map(() => 1), coeficientes: ceros, intercepto: 0,
};

it('calcula una probabilidad de 0.5 con coeficientes e intercepto en cero', async () => {
  const adaptador = new ModeloRiesgoLogistico(leerModeloRiesgo(JSON.stringify(modelo)));
  await expect(adaptador.estimar(ceros.map(() => 5))).resolves.toEqual({ probabilidad: 0.5, versionModelo: 'prueba' });
});

it.each([
  [{ factores: [...FACTORES_RIESGO].reverse() }, /factores/],
  [{ medias: [0] }, /medias/],
  [{ coeficientes: [Infinity, ...ceros.slice(1)] }, /coeficientes/],
  [{ desviaciones: ceros }, /desviaciones/],
] as const)('rechaza un modelo inválido e identifica el campo', (cambio, motivo) => {
  const leer = () => leerModeloRiesgo(JSON.stringify({ ...modelo, ...cambio }).replace('null', '1e309'));
  expect(leer).toThrow(ModeloInvalido);
  expect(leer).toThrow(motivo);
});

it('carga el modelo generado desde disco', async () => {
  const ruta = '../../../packages/adapters/out-modelo/modelo/riesgo-inasistencia.json';
  const adaptador = await cargarModeloRiesgo(fileURLToPath(new URL(ruta, import.meta.url)));
  const resultado = await adaptador.estimar(ceros);
  expect(resultado.versionModelo).toBe('riesgo-inasistencia@1');
  expect(resultado.probabilidad).toBeGreaterThan(0);
  expect(resultado.probabilidad).toBeLessThan(1);
});

describe.each([CalendarioSedeDateFns, CalendarioSedeMemoria])('calendario %s', (Adaptador) => {
  it.each([
    ['America/Mazatlan', 12],
    ['America/Bahia_Banderas', 13],
  ] as const)('convierte en ambas direcciones para %s', (zona, hora) => {
    const calendario = new Adaptador();
    const instante = '2026-12-11T19:30:00.000Z';
    expect(calendario.local(instante, zona)).toEqual({ fecha: '2026-12-11', hora, minuto: 30, diaSemana: 5 });
    expect(calendario.aUtc('2026-12-11', hora, 30, zona)).toBe(instante);
  });
});
