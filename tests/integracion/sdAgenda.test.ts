import { randomUUID } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { AgendaExternaMemoria } from '../../packages/adapters/memory/src/index.ts';
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

it.each([[10, 3], [1, 2]])('emite folios distintos entre arranques separados por %i segundos', async (segundos, cantidad) => {
  const instante = Date.parse('2026-11-25T12:00:00Z');
  const folios: string[] = [];
  for (const ahora of [instante, instante + segundos * 1000]) {
    const servidor = crearSdMock(false, () => ahora);
    try {
      for (let indice = 0; indice < cantidad; indice++) {
        const respuesta = await servidor.inject({
          method: 'POST', url: '/agenda/citas', payload: { ...cita, reservaId: randomUUID() },
        });
        expect(respuesta.statusCode).toBe(200);
        folios.push(respuesta.json<{ folio: string }>().folio);
      }
    } finally { await servidor.close(); }
  }
  expect(new Set(folios).size).toBe(cantidad * 2);
  for (const folio of folios) expect(folio).toMatch(/^\d{9}$/);
});

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

it('Cita cancelada no se reactiva y una respuesta 4xx no se reintenta', async () => {
  const servidor = crearSdMock(false);
  try {
    const base = await servidor.listen({ host: '127.0.0.1', port: 0 });
    const reintentos: number[] = [];
    const cliente = new AgendaExternaSd(base, ({ intento }) => reintentos.push(intento));
    const folio = await cliente.registrarCita(cita, 'alta');
    await cliente.cancelarCita(folio, 'baja');
    const respuesta = await servidor.inject({ method: 'POST', url: '/agenda/citas', payload: cita });
    expect(respuesta.statusCode).toBe(409);
    expect(respuesta.json()).toEqual({ codigo: 'CITA_CANCELADA' });
    await expect(cliente.registrarCita(cita, 'otra-alta')).rejects.toMatchObject({ regla: 'AGENDA_NO_DISPONIBLE' });
    expect(reintentos).toEqual([]);
  } finally { await servidor.close(); }
});

it('Disponibilidad por el puerto coincide en memoria y sd-mock', async () => {
  const servidor = crearSdMock(false);
  try {
    const base = await servidor.listen({ host: '127.0.0.1', port: 0 });
    const cliente = new AgendaExternaSd(base);
    const memoria = new AgendaExternaMemoria();
    const consulta = { sedeId: cita.sedeId, servicioId: cita.servicioId, fecha: '2026-11-26', zonaHoraria: 'America/Mazatlan' };
    const horarios = await cliente.disponibilidad(consulta, 'disponibilidad');
    expect(horarios).toEqual(await memoria.disponibilidad(consulta));
    expect(horarios).toHaveLength(15);
    expect(horarios[0]).toBe('2026-11-26T16:00:00.000Z');
    expect(horarios.at(-1)).toBe('2026-11-26T23:00:00.000Z');
    const tijuana = { ...consulta, zonaHoraria: 'America/Tijuana' };
    const horariosTijuana = await cliente.disponibilidad(tijuana, 'tijuana');
    expect(horariosTijuana).toEqual(await memoria.disponibilidad(tijuana));
    expect(horariosTijuana[0]).toBe('2026-11-26T17:00:00.000Z');
    for (const zonaHoraria of ['', 'Marte/Base']) {
      const query = new URLSearchParams({ ...consulta, zonaHoraria });
      if (!zonaHoraria) query.delete('zonaHoraria');
      const invalida = await servidor.inject({ url: '/agenda/disponibilidad?' + query });
      expect(invalida.statusCode).toBe(400);
      expect(invalida.json()).toEqual({ codigo: 'ENTRADA_INVALIDA' });
    }
  } finally { await servidor.close(); }
});
