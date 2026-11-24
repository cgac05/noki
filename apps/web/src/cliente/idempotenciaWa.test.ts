import { expect, it, vi } from 'vitest';
import { ClienteReal } from './real/ClienteReal.ts';

it('Clave por mensaje: conserva la elegida y genera otra para un mensaje nuevo', async () => {
  const peticion = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ mensajes: [] }));
  const cliente = new ClienteReal({ fetch: peticion });
  const idempotencyKey = crypto.randomUUID();
  await cliente.enviarMensajeWa({ waId: '5210000000001', texto: 'Hola' }, { idempotencyKey });
  await cliente.enviarMensajeWa({ waId: '5210000000001', texto: 'Otro' });
  const claves = peticion.mock.calls.map(([, opciones]) => new Headers(opciones?.headers).get('Idempotency-Key'));
  expect(claves[0]).toBe(idempotencyKey); expect(claves[1]).not.toBe(idempotencyKey);
});

it('Clave en el reintento: conserva el UUID en red y en el reenvío del usuario', async () => {
  const peticion = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('sin red')).mockImplementation(async () => Response.json({ mensajes: [] }));
  const cliente = new ClienteReal({ fetch: peticion }); const idempotencyKey = crypto.randomUUID();
  const solicitud = { waId: '5210000000001', texto: 'Hola' };
  await cliente.enviarMensajeWa(solicitud, { idempotencyKey });
  await cliente.enviarMensajeWa(solicitud, { idempotencyKey });
  expect(peticion).toHaveBeenCalledTimes(3);
  for (const [, opciones] of peticion.mock.calls) expect(new Headers(opciones?.headers).get('Idempotency-Key')).toBe(idempotencyKey);
});
