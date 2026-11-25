import { expect, it } from 'vitest';
import type { ProgramadorTemporizadores, Temporizador } from '../../../packages/application/src/index.ts';
import type { TramiteId } from '../../../packages/domain/src/index.ts';

export function bateriaProgramador(crear: () => ProgramadorTemporizadores): void {
  it('reemplaza, deduplica, cancela y adelanta solo los vencidos', async () => {
    const puerto = crear();
    const ahora = '2026-11-24T12:00:00.000Z';
    const venceEn = '2026-11-24T12:01:00.000Z';
    const futuro = '2026-11-24T12:02:00.000Z';
    const trabajo: Temporizador = {
      tipo: 'INACTIVIDAD', tramiteId: '019ab990-01b0-7000-8000-000000000001' as TramiteId, venceEn, version: 1,
    };
    await puerto.programar(trabajo, ahora);
    await puerto.programar(trabajo, ahora);
    await puerto.programar({ ...trabajo, tipo: 'HOLD', venceEn: futuro }, ahora);
    expect(await puerto.adelantarVencidos(venceEn)).toBe(1);
    await puerto.programar({ ...trabajo, version: 2, venceEn: futuro }, ahora);
    expect(await puerto.adelantarVencidos(venceEn)).toBe(0);
    await puerto.cancelar('HOLD', trabajo.tramiteId);
    expect(await puerto.adelantarVencidos(futuro)).toBe(1);
  });
}
