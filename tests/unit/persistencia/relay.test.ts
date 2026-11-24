import { expect, it, vi } from 'vitest';
import { RelayOutbox } from '../../../packages/application/src/index.ts';
import { OutboxMemoria, PublicadorEventosMemoria, RelojFalso } from '../../../packages/adapters/memory/src/index.ts';
import type { EventoDominio, HiloId } from '../../../packages/domain/src/index.ts';

it('publica en orden, conserva la partición con error y omite la tomada', async () => {
  const outbox = new OutboxMemoria();
  const publicador = new PublicadorEventosMemoria();
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const evento: EventoDominio = {
    tipo: 'IntentoVerificacionFallido', actor: 'paciente', canal: 'web', nivelAuth: 0, correlationId: 'prueba',
    idempotencyKey: 'prueba', ts: reloj.ahora().toISOString(), version: 0, tramiteId: null, hiloId: 'hilo' as HiloId,
    payload: { metodo: 'OTP_SMS', intentos: 1 },
  };
  for (const [id, particion] of [['uno', 0], ['dos', 0], ['tres', 1], ['cuatro', 2]] as const) {
    outbox.agregar(particion, { id, evento: { ...evento, idempotencyKey: id } });
  }
  const ocupada = await outbox.tomarParticion(2);
  vi.spyOn(publicador, 'publicar').mockImplementationOnce(async () => { throw new Error('secreto de prueba'); });
  const relay = new RelayOutbox(outbox, publicador, reloj);
  expect(await relay.publicarPendientes()).toBe(false);
  expect(publicador.eventos().map(({ evento }) => evento.idempotencyKey)).toEqual(['tres']);
  expect(outbox.estado('uno')).toMatchObject({ intentos: 1, ultimoError: 'PUBLICACION_FALLIDA' });
  expect(outbox.estado('dos')).toMatchObject({ intentos: 0 });
  await ocupada?.liberar();
  expect(await relay.publicarPendientes()).toBe(true);
  expect(publicador.eventos().map(({ evento }) => evento.idempotencyKey)).toEqual(['tres', 'uno', 'dos', 'cuatro']);
  expect(publicador.publicar).toHaveBeenCalledTimes(5);
});
