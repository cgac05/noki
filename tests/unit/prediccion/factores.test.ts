import { expect, it } from 'vitest';
import { FACTORES_RIESGO, factoresDesde, vectorFactores } from '../../../packages/domain/src/prediccion/factores.ts';
import { nivelDesde, probabilidadPorReglas } from '../../../packages/domain/src/prediccion/nivel.ts';

const cita = {
  inicio: '2026-12-11T19:30:00Z', ahora: '2026-12-01T12:00:00Z',
  local: { hora: 12, diaSemana: 5 }, historial: { atenciones: 0, inasistencias: 0 },
  perfil: { tipo: 'CONSULTA' }, canal: 'clinica',
} as const;

it('usa la hora y el día locales entregados', () => {
  expect(factoresDesde(cita)).toMatchObject({ franjaTarde: 1, finDeSemana: 0 });
  expect(factoresDesde({ ...cita, local: { hora: 11, diaSemana: 0 } }))
    .toMatchObject({ franjaTarde: 0, finDeSemana: 1 });
});

it('identifica al paciente sin historial y aplica los topes de los conteos', () => {
  expect(factoresDesde(cita)).toMatchObject({ primeraCita: 1, inasistenciasPrevias: 0, atencionesPrevias: 0 });
  expect(factoresDesde({ ...cita, historial: { inasistencias: 7, atenciones: 12 } }))
    .toMatchObject({ primeraCita: 0, inasistenciasPrevias: 5, atencionesPrevias: 10 });
});

it('solo contiene los factores permitidos y fija el orden del vector', () => {
  const factores = factoresDesde(cita);
  expect(Object.keys(factores)).toEqual([
    'anticipacionLog', 'inasistenciasPrevias', 'atencionesPrevias', 'requierePreparacion',
    'esConsulta', 'franjaTarde', 'finDeSemana', 'canalWeb', 'canalWhatsapp', 'canalApp',
    'canalCallcenter', 'primeraCita',
  ]);
  expect(vectorFactores(factores)).toEqual(FACTORES_RIESGO.map((factor) => factores[factor]));
});

it('respeta los límites de los niveles', () => {
  expect([0.19, 0.20, 0.39, 0.40].map(nivelDesde)).toEqual(['BAJO', 'MEDIO', 'MEDIO', 'ALTO']);
});

it.each([1.2, -0.1, NaN, Infinity])('rechaza la probabilidad inválida %s', (p) => {
  expect(() => nivelDesde(p)).toThrow(expect.objectContaining({ regla: 'PROBABILIDAD_INVALIDA' }));
});

it('acota la probabilidad por reglas para conteos extremos', () => {
  const factores = factoresDesde(cita);
  expect(probabilidadPorReglas({ ...factores, atencionesPrevias: 1e9 })).toBeGreaterThanOrEqual(0.01);
  expect(probabilidadPorReglas({ ...factores, inasistenciasPrevias: 1e9 })).toBeLessThanOrEqual(0.95);
});
