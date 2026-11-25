import { expect, it } from 'vitest';
import { planPorNivel, varianteDesde } from '../../../packages/domain/src/index.ts';
import { horaEnvio } from '../../../packages/application/src/index.ts';
import { CalendarioSedeMemoria } from '../../../packages/adapters/memory/src/index.ts';

const perfil = ['T48', 'PREPARACION', 'T2'] as const;
const variante = 'CONFIRMAR_Y_FACILITAR_CAMBIO';

it('añade refuerzo al nivel alto y habilita la devolución solo si se solicita', () => {
  expect(planPorNivel('ALTO', perfil)).toEqual([...perfil, 'REFUERZO'].map((tipo) => ({ tipo, variante })));
  expect(planPorNivel('ALTO', perfil, { devolucionLlamada: true }).at(-1)).toEqual({
    tipo: 'DEVOLUCION_LLAMADA', variante,
  });
});

it('conserva los recordatorios del perfil para nivel bajo y medio', () => {
  expect(planPorNivel('BAJO', perfil, { devolucionLlamada: true }))
    .toEqual(perfil.map((tipo) => ({ tipo, variante: 'ESTANDAR' })));
  expect(planPorNivel('MEDIO', ['T2', 'POST'])).toEqual([
    { tipo: 'T2', variante: 'CONFIRMAR' }, { tipo: 'POST', variante: 'ESTANDAR' },
  ]);
  expect(varianteDesde('MEDIO')).toBe('CONFIRMAR');
});

const calendario = new CalendarioSedeMemoria();
const silencio = { desde: '21:00', hasta: '08:00' };
const zona = 'America/Mazatlan';
const ahora = '2026-12-01T00:00:00.000Z';
const envio = (tipo: Parameters<typeof horaEnvio>[0], inicio: string) =>
  horaEnvio(tipo, inicio, zona, silencio, ahora, calendario);

it('envía la preparación a las 18:00 locales del día anterior', () => {
  expect(envio('PREPARACION', '2026-12-10T15:05:00Z')).toBe('2026-12-10T01:00:00.000Z');
});

it('conserva la hora nominal fuera del silencio y mueve la de la mañana al final', () => {
  expect(envio('T2', '2026-12-10T18:00:00Z')).toBe('2026-12-10T16:00:00.000Z');
  expect(envio('T48', '2026-12-10T18:00:00Z')).toBe('2026-12-08T18:00:00.000Z');
  expect(envio('T48', '2026-12-10T14:00:00Z')).toBe('2026-12-08T15:00:00.000Z');
});

it('mueve la hora nocturna al día siguiente cuando el silencio cruza medianoche', () => {
  expect(envio('REFUERZO', '2026-12-11T05:00:00Z')).toBe('2026-12-10T15:00:00.000Z');
});

it('devuelve null para una hora pasada, margen insuficiente y tipos sin hora nominal', () => {
  expect(envio('T2', '2026-12-10T15:15:00Z')).toBeNull();
  expect(envio('T48', '2026-12-01T18:00:00Z')).toBeNull();
  expect(envio('POST', '2026-12-10T15:15:00Z')).toBeNull();
  expect(envio('DEVOLUCION_LLAMADA', '2026-12-10T15:15:00Z')).toBeNull();
});
