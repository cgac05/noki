import { describe, expect, it } from 'vitest';
import { crearApi } from '../../apps/api/src/index.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';

const databaseUrl = process.env['TEST_DATABASE_URL'] ?? '';
const redisUrl = process.env['REDIS_URL'] ?? '';
describe('salud y disponibilidad con dependencias reales', () => {
  it('responde salud aunque las dependencias no estén accesibles', async () => {
    const api = crearApi({ databaseUrl: 'postgres://demo:demo@127.0.0.1:1/demo', redisUrl: 'redis://127.0.0.1:1', logger: false });
    const mock = crearSdMock(false);
    try {
      for (const app of [api, mock]) {
        const salida = await app.inject('/health');
        expect(salida.statusCode).toBe(200);
        expect(salida.json()).toEqual({ estado: 'ok' });
      }
    } finally { await api.close(); await mock.close(); }
  });
  it('está lista únicamente si Postgres y Redis responden', async () => {
    const api = crearApi({ databaseUrl, redisUrl, logger: false });
    try {
      const salida = await api.inject('/ready');
      expect(salida.statusCode).toBe(200);
      expect(salida.json()).toEqual({ estado: 'ok', postgres: 'ok', redis: 'ok' });
    } finally { await api.close(); }
  });
  it('señala Redis caído y no muestra la URL ni credenciales', async () => {
    const api = crearApi({ databaseUrl, redisUrl: 'redis://:secreto-no-revelar@127.0.0.1:1', logger: false });
    try {
      const comienzo = performance.now();
      const salida = await api.inject('/ready');
      expect(salida.statusCode).toBe(503);
      expect(salida.json()).toEqual({ estado: 'error', postgres: 'ok', redis: 'error' });
      expect(performance.now() - comienzo).toBeLessThan(1500);
      expect(salida.body).not.toMatch(/redis:\/\/|secreto|127\.0\.0\.1/);
    } finally { await api.close(); }
  });
  it('señala Postgres caído dentro del límite', async () => {
    const api = crearApi({ databaseUrl: 'postgres://demo:secreto-no-revelar@192.0.2.1:5432/demo', redisUrl, logger: false });
    try {
      const comienzo = performance.now();
      const salida = await api.inject('/ready');
      expect(salida.statusCode).toBe(503);
      expect(salida.json()).toEqual({ estado: 'error', postgres: 'error', redis: 'ok' });
      expect(performance.now() - comienzo).toBeLessThan(1500);
      expect(salida.body).not.toMatch(/postgres:\/\/|secreto|192\.0\.2/);
    } finally { await api.close(); }
  });
});
