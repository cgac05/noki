import { expect, it } from 'vitest';
import { particionEvento } from '../../../packages/adapters/out-postgres/src/index.ts';

it('elige por FNV-1a la misma partición para el paciente y usa el hilo cuando no hay paciente', () => {
  expect(particionEvento('paciente', 'hilo')).toBe(2);
  expect(particionEvento('paciente', 'otro hilo')).toBe(2);
  expect(particionEvento(undefined, 'hilo')).toBe(7);
});
