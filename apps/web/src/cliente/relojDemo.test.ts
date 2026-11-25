import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './ClienteApi.ts';
import { crearCliente } from './crearCliente.ts';
import { ClienteReal } from './real/ClienteReal.ts';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Reloj de demo en el cliente', () => {
  it.each([15, 10_080])('adelanta %i minutos con el contrato y sin clave de idempotencia', async minutos => {
    const ahora = '2026-11-25T18:00:00.000Z';
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ahora }));
    const cliente: ClienteApi = new ClienteReal({ demo: true, url: 'http://api.test/', fetch: peticion });
    expect(cliente.relojDemo).toBeDefined();
    await expect(cliente.relojDemo!.adelantar(minutos)).resolves.toEqual({ ahora });
    expect(peticion).toHaveBeenCalledExactlyOnceWith('http://api.test/api/demo/reloj', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adelantarMinutos: minutos }),
    });
  });

  it.each([0, 10_081, -1, 1.5, NaN])('rechaza %s minutos antes de acceder a la red', async minutos => {
    const peticion = vi.fn<typeof fetch>();
    const cliente: ClienteApi = new ClienteReal({ demo: true, fetch: peticion });
    await expect(cliente.relojDemo!.adelantar(minutos)).rejects.toMatchObject({ tipo: 'CONTRATO' });
    expect(peticion).not.toHaveBeenCalled();
  });

  it('solo ofrece el reloj con VITE_DEMO=true y cliente real', () => {
    vi.stubEnv('VITE_DEMO', 'false');
    expect(crearCliente({ modo: 'real' }).relojDemo).toBeUndefined();
    vi.stubEnv('VITE_DEMO', 'true');
    expect(crearCliente({ modo: 'real' }).relojDemo).toBeDefined();
    expect(crearCliente({ modo: 'mock' }).relojDemo).toBeUndefined();
  });

  it('rechaza una respuesta con hora mal formada', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ahora: 'ayer' }));
    const cliente: ClienteApi = new ClienteReal({ demo: true, fetch: peticion });
    await expect(cliente.relojDemo!.adelantar(60)).rejects.toMatchObject({ tipo: 'CONTRATO' });
  });

  it('no repite automáticamente un adelanto que falla por red', async () => {
    const peticion = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    const cliente: ClienteApi = new ClienteReal({ demo: true, fetch: peticion });
    await expect(cliente.relojDemo!.adelantar(60)).rejects.toMatchObject({ tipo: 'RED' });
    expect(peticion).toHaveBeenCalledTimes(1);
  });

  it('conserva código y mensaje públicos de un error HTTP', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Reloj no disponible' } }, { status: 404 }));
    const cliente: ClienteApi = new ClienteReal({ demo: true, fetch: peticion });
    await expect(cliente.relojDemo!.adelantar(60)).rejects.toMatchObject({ tipo: 'API', codigo: 'NO_ENCONTRADO', mensaje: 'Reloj no disponible' });
    expect(peticion).toHaveBeenCalledTimes(1);
  });
});
