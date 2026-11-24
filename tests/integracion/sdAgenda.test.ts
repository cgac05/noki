import { afterEach, expect, it } from 'vitest';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { AgendaExternaSd } from '../../packages/adapters/out-sd/src/index.ts';
import type { ReservaId, SedeId, ServicioId } from '../../packages/domain/src/index.ts';

const app = crearSdMock(false);
afterEach(async () => { await app.inject({ method: 'PUT', url: '/simulacion', payload: { latenciaMs: 0, falloPorcentaje: 0 } }); });
const cita = {
  reservaId: '01234567-89ab-7def-8123-456789abcdef' as ReservaId,
  sedeId: '01234567-89ab-7def-8123-456789abcde1' as SedeId,
  servicioId: '01234567-89ab-7def-8123-456789abcde2' as ServicioId,
  inicio: '2026-11-25T12:00:00Z',
};

it('registra de forma idempotente, rechaza entradas inválidas y simula fallos y latencia', async () => {
  const enviar = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });
  expect((await enviar('/agenda/citas', { ...cita, sedeId: undefined })).statusCode).toBe(400);
  expect((await enviar('/agenda/citas?fallo=100', cita)).statusCode).toBe(503);
  const inicio = performance.now();
  const primera = await enviar('/agenda/citas?latencia=300', cita);
  expect(performance.now() - inicio).toBeGreaterThanOrEqual(300);
  const segunda = await enviar('/agenda/citas', cita);
  expect(primera.statusCode).toBe(200);
  expect(segunda.json()).toEqual(primera.json());
  expect(primera.json<{ folio: string }>().folio).toMatch(/^\d{8,9}$/);
});

it('se recupera tras dos fallos y señala cuando se agotan los tres intentos', async () => {
  const servidor = crearSdMock(false);
  try {
    const base = await servidor.listen({ host: '127.0.0.1', port: 0 });
    const registros: string[] = [];
    const cliente = new AgendaExternaSd(base, (entrada) => registros.push(entrada.correlation_id));
    await servidor.inject({ method: 'PUT', url: '/simulacion', payload: { latenciaMs: 0, falloPorcentaje: 0, fallarSiguientes: 2 } });
    const folio = await cliente.registrarCita(cita, 'correlacion');
    expect(folio).toMatch(/^\d{8,9}$/);
    expect(await cliente.registrarCita(cita, 'correlacion')).toBe(folio);
    expect(registros).toEqual(['correlacion', 'correlacion']);
    await servidor.inject({ method: 'PUT', url: '/simulacion', payload: { latenciaMs: 0, falloPorcentaje: 100 } });
    await expect(cliente.registrarCita(cita, 'otro')).rejects.toMatchObject({ regla: 'AGENDA_NO_DISPONIBLE' });
    expect(registros.filter((id) => id === 'otro')).toHaveLength(2);
  } finally { await servidor.close(); }
});
