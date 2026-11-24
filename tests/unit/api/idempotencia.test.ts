import { expect, it, vi } from 'vitest';
import { CuerpoErrorSchema } from '../../../packages/contracts/src/index.ts';
import { ejecutarIdempotente } from '../../../packages/adapters/in-http/src/idempotencia.ts';
import { RegistroComandosMemoria, RelojFalso } from '../../../packages/adapters/memory/src/index.ts';

const clave = '01937954-6c40-7000-8000-000000000003';
const ruta = '/api/comandos';

function escenario() {
  const tieneEventos = vi.fn(async () => false);
  return {
    deps: { registro: new RegistroComandosMemoria(), reloj: new RelojFalso(new Date('2026-11-24T12:00:00Z')), tieneEventos },
    error: () => ({ codigo: 422, cuerpo: CuerpoErrorSchema.parse({
      error: { codigo: 'REGLA_VIOLADA', mensaje: 'El horario no está disponible.' },
    }) }),
  };
}

it('Reintento tras perder la respuesta y clave reutilizada con otro cuerpo', async () => {
  const { deps, error } = escenario();
  const ejecutar = vi.fn(async () => ({ codigo: 200, cuerpo: { ok: true } }));
  const primera = await ejecutarIdempotente(deps, clave, ruta, { b: 2, a: 1 }, ejecutar, error);
  expect(await ejecutarIdempotente(deps, clave, ruta, { a: 1, b: 2 }, ejecutar, error)).toEqual(primera);
  expect((await ejecutarIdempotente(deps, clave, ruta, { a: 0 }, ejecutar, error)).codigo).toBe(400);
  expect((await ejecutarIdempotente(deps, clave, '/api/canales/wa/mensajes', { a: 1, b: 2 }, ejecutar, error)).codigo).toBe(400);
  expect(ejecutar).toHaveBeenCalledTimes(1);
});

it('Error con efectos guardados se repite y un error sin efectos permite reintento', async () => {
  const { deps, error } = escenario();
  const ejecutar = vi.fn(async () => { throw new Error('simulado'); });
  expect(await ejecutarIdempotente(deps, clave, ruta, {}, ejecutar, error)).toEqual(error());
  deps.tieneEventos.mockResolvedValue(true);
  expect(await ejecutarIdempotente(deps, clave, ruta, {}, ejecutar, error)).toEqual(error());
  expect(await ejecutarIdempotente(deps, clave, ruta, {}, ejecutar, error)).toEqual(error());
  expect(ejecutar).toHaveBeenCalledTimes(2);
});
