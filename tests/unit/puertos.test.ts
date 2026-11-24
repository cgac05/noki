import { describe, expect, it } from 'vitest';
import { RelojFalso, GeneradorIdSecuencial } from '../../packages/adapters/memory/src/index.ts';
import { RelojSistema } from '../../apps/api/src/sistema/RelojSistema.ts';
import { GeneradorIdUuidV7 } from '../../apps/api/src/sistema/GeneradorIdUuidV7.ts';

describe('reloj e identificadores por puertos', () => {
  it('controla el reloj falso sin depender del sistema ni compartir fechas mutables', () => {
    const origen = new Date('2026-01-01T00:00:00Z');
    const reloj = new RelojFalso(origen);
    origen.setUTCFullYear(2030);
    reloj.adelantar(15 * 60 * 1000);
    expect(reloj.ahora().toISOString()).toBe('2026-01-01T00:15:00.000Z');
    reloj.ahora().setUTCFullYear(2040);
    reloj.fijar(new Date('2026-02-01T00:00:00Z'));
    expect(reloj.ahora().toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('produce una secuencia determinista y reproducible', () => {
    const uno = new GeneradorIdSecuencial(); const dos = new GeneradorIdSecuencial();
    expect([uno.nuevo(), uno.nuevo(), uno.nuevo()]).toEqual([dos.nuevo(), dos.nuevo(), dos.nuevo()]);
    expect(uno.nuevo()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produce UUID v7 válidos en orden y reloj de sistema externo al núcleo', () => {
    const ids = new GeneradorIdUuidV7();
    const primero = ids.nuevo(); const segundo = ids.nuevo();
    for (const id of [primero, segundo]) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(segundo >= primero).toBe(true);
    expect(new RelojSistema().ahora()).toBeInstanceOf(Date);
  });
});
