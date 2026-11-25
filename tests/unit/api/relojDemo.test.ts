import { expect, it, vi } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { RelojAjustable } from '../../../apps/api/src/sistema/RelojAjustable.ts';
import type { SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

it('valida el adelanto y usa el mismo reloj para los casos de uso', async () => {
  const { app, reloj, catalogo, casos, ids } = crearApiPruebas();
  try {
    const url = '/api/demo/reloj';
    for (const adelantarMinutos of [0, -5, 1.5, 10_081]) {
      const antes = reloj.ahora().getTime();
      const respuesta = await app.inject({ method: 'POST', url, payload: { adelantarMinutos } });
      expect(respuesta.statusCode).toBe(400);
      expect(reloj.ahora().getTime()).toBe(antes);
    }
    const respuesta = await app.inject({ method: 'POST', url, payload: { adelantarMinutos: 60 } });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ ahora: '2026-11-24T13:00:00.000Z' });
    expect(reloj.ahora().toISOString()).toBe('2026-11-24T13:00:00.000Z');
    const servicioId = ids.nuevo() as ServicioId;
    const sedeId = ids.nuevo() as SedeId;
    catalogo.registrar(servicioId, {
      tipo: 'ESTUDIO', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
      duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 15, limiteCambiosHoras: 4,
      anticipacionMinimaHoras: 0, recordatorios: [],
    }, new Map([[sedeId, 5_500]]));
    const comando = () => ({
      canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false, factores: new Set<never>(),
      correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
    } as const);
    const { tramite } = await casos.iniciar('AGENDAR', '0000000020', comando());
    await casos.seleccionarServicio(tramite.id, servicioId, comando());
    const { eventos } = await casos.seleccionarSede(tramite.id, sedeId, comando());
    expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'CotizacionGenerada', ts: respuesta.json().ahora }));
  } finally { await app.close(); }
});

it('devuelve 404 fuera de modo demo', async () => {
  const { app } = crearApiPruebas({ demo: false });
  try {
    const respuesta = await app.inject({ method: 'POST', url: '/api/demo/reloj', payload: { adelantarMinutos: 60 } });
    expect(respuesta.statusCode).toBe(404);
  } finally { await app.close(); }
});

it('restablece el desfase al recrear el reloj de la API', () => {
  const ahora = '2026-11-24T12:00:00.000Z';
  const sistema = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(ahora));
  try {
    const demo = new RelojAjustable(true);
    demo.adelantar(60_000);
    expect(demo.ahora().toISOString()).toBe('2026-11-24T12:01:00.000Z');
    expect(new RelojAjustable(true).ahora().toISOString()).toBe(ahora);
    const real = new RelojAjustable(false);
    real.adelantar(60_000);
    expect(real.ahora().toISOString()).toBe(ahora);
  } finally { sistema.mockRestore(); }
});
