import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { FACTORES_RIESGO } from '../../../packages/domain/src/prediccion/factores.ts';
import { evaluar } from '../../../ml/evaluar.ts';
import { entrenar } from '../../../ml/entrenar.ts';

it('repite el entrenamiento en memoria con la misma semilla', () => {
  expect(entrenar(71, 100)).toEqual(entrenar(71, 100));
});

it('calcula AUC con empates y el error de Brier', () => {
  const resultados = evaluar([0, 1, 0, 1], [0, 0.5, 0.5, 1]);
  expect(resultados).toEqual({ auc: 0.875, brier: 0.125 });
});

it('el modelo guardado supera el umbral de AUC y el resultado de las reglas', () => {
  const metricas = JSON.parse(readFileSync(new URL('../../../ml/metricas.json', import.meta.url), 'utf8'));
  expect(metricas.sinteticos).toBe(true);
  expect(metricas.modelo.auc).toBeGreaterThanOrEqual(0.70);
  expect(metricas.modelo.auc).toBeGreaterThanOrEqual(metricas.reglas.auc);
});

it('el modelo guardado tiene versión y los factores en orden', () => {
  const ruta = '../../../packages/adapters/out-modelo/modelo/riesgo-inasistencia.json';
  const modelo = JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));
  expect(modelo.version).toMatch(/\S/);
  expect(modelo.factores).toEqual(FACTORES_RIESGO);
});
