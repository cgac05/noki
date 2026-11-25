import { expect, it } from 'vitest';
import { CANALES } from '../../../packages/domain/src/index.ts';
import { canalOrigen, fechaCorta, fechaLarga, requisito } from '../../../packages/adapters/in-http/src/textosWa.ts';

it('formatea día y hora de Tepic en español', () => {
  const inicio = '2026-11-26T16:15:00Z';
  expect(fechaCorta(inicio, 'America/Mazatlan')).toBe('jue 26 nov · 09:15');
  expect(fechaLarga(inicio, 'America/Mazatlan')).toBe('jueves 26 de noviembre, 09:15');
});

it('define una etiqueta para cada canal y requisito', () => {
  expect(Object.keys(canalOrigen).sort()).toEqual([...CANALES].sort());
  expect(Object.keys(requisito).sort()).toEqual([
    'ACEPTAR_PREPARACION', 'CONSENTIMIENTO', 'DATOS_PACIENTE', 'ORDEN_MEDICA',
  ]);
});
