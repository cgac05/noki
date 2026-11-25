import { expect, it } from 'vitest';
import { ProgramadorMemoria, RelojFalso } from '../../../packages/adapters/memory/src/index.ts';
import { RelojDemo, type ProgramadorTemporizadores, type Temporizador } from '../../../packages/application/src/index.ts';
import type { TramiteId } from '../../../packages/domain/src/index.ts';
import { bateriaProgramador } from './bateriaProgramador.ts';

bateriaProgramador(() => new ProgramadorMemoria(async () => {}));

it('reemplaza el trabajo, conserva uno por tipo y trámite y cancela por id lógico', async () => {
  const programador = new ProgramadorMemoria();
  const puerto: ProgramadorTemporizadores = programador;
  const ahora = '2026-11-24T12:00:00.000Z';
  const trabajo: Temporizador = { tipo: 'INACTIVIDAD', tramiteId: 'tramite' as TramiteId, venceEn: ahora, version: 1 };
  await puerto.programar(trabajo, ahora);
  await puerto.programar(trabajo, ahora);
  expect(programador.vencidos(ahora)).toEqual([trabajo]);
  const nuevo = { ...trabajo, version: 2, venceEn: '2026-11-24T12:01:00.000Z' };
  await puerto.programar(nuevo, ahora);
  expect(await programador.adelantarVencidos(ahora)).toBe(0);
  expect(programador.vencidos(nuevo.venceEn)).toEqual([nuevo]);
  await programador.cancelar(nuevo.tipo, nuevo.tramiteId);
  expect(programador.vencidos(nuevo.venceEn)).toEqual([]);
});

it('adelanta el reloj y entrega al ejecutor solo trabajos cuyo plazo venció', async () => {
  const ejecutados: Temporizador[] = [];
  const programador = new ProgramadorMemoria(async trabajo => { ejecutados.push(trabajo); });
  const ahora = '2026-11-24T12:00:00.000Z';
  const reloj = new RelojFalso(new Date(ahora));
  const demo = new RelojDemo(reloj, programador);
  const trabajo: Temporizador = {
    tipo: 'HOLD', tramiteId: 'tramite' as TramiteId, version: 1, venceEn: '2026-11-24T12:10:00.000Z',
  };
  await programador.programar(trabajo);
  expect(await demo.adelantar(5)).toBe('2026-11-24T12:05:00.000Z');
  expect(ejecutados).toEqual([]);
  expect(await demo.adelantar(6)).toBe('2026-11-24T12:11:00.000Z');
  expect(ejecutados).toEqual([trabajo]);
  expect(programador.vencidos(reloj.ahora().toISOString())).toEqual([]);
});

it('vence y cancela OFERTA usando su identificador de oferta', async () => {
  const ejecutados: Temporizador[] = [];
  const programador = new ProgramadorMemoria(async trabajo => { ejecutados.push(trabajo); });
  const ahora = '2026-11-25T12:00:00.000Z';
  const oferta: Temporizador = { tipo: 'OFERTA', ofertaId: 'oferta-beto', venceEn: ahora };
  const otra: Temporizador = { ...oferta, ofertaId: 'oferta-carla' };
  await programador.programar(oferta);
  await programador.programar(otra);
  await programador.cancelar('OFERTA', otra.ofertaId);
  expect(await programador.adelantarVencidos(ahora)).toBe(1);
  expect(ejecutados).toEqual([oferta]);
});
