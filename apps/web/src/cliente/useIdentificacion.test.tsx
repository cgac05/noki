import { act, cleanup, renderHook } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { RespuestaComando } from '@noki/contracts';
import { ProveedorCliente, useRespuestaComando } from './ProveedorCliente.tsx';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { useIdentificacion } from './useIdentificacion.ts';
import { ErrorCliente } from './errores.ts';

afterEach(cleanup);
const comando = { tipo: 'IdentificarPaciente', canal: 'callcenter', actor: 'asesor:asesor1', tramiteId: IDS.tramite, payload: { paso: 'FECHA_NAC', fechaNac: '2000-01-02' } } as const;
function abrir() {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const enviar = vi.spyOn(cliente, 'enviarComando');
  const wrapper = ({ children }: { children: ReactNode }) => <ProveedorCliente cliente={cliente}>{children}</ProveedorCliente>;
  const vista = renderHook(() => ({ accion: useIdentificacion(), respuesta: useRespuestaComando().respuesta, consultas: useQueryClient() }), { wrapper });
  return { ...vista, enviar };
}
it('doble clic envía una vez, recuerda e invalida sin mutaciones con datos', async () => {
  const { result, enviar } = abrir();
  let resolver!: (respuesta: RespuestaComando) => void;
  enviar.mockImplementation(() => new Promise(resuelve => { resolver = resuelve; }));
  const invalidar = vi.spyOn(result.current.consultas, 'invalidateQueries');
  let solicitud!: Promise<boolean>;
  act(() => { solicitud = result.current.accion.enviar(comando); void result.current.accion.enviar(comando); });
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(result.current.consultas.getMutationCache().getAll()).toEqual([]);
  await act(async () => { resolver(GUION_FLUJO_A[1]!.respuesta); expect(await solicitud).toBe(true); });
  expect(result.current.respuesta).toEqual(GUION_FLUJO_A[1]!.respuesta);
  expect(invalidar).toHaveBeenCalled();
  await act(async () => { expect(await result.current.accion.reintentar()).toBe(false); });
  expect(enviar).toHaveBeenCalledTimes(1);
});
it('reintenta con los mismos valores y clave; un envío nuevo usa otra clave', async () => {
  const { result, enviar } = abrir();
  enviar.mockRejectedValueOnce(new ErrorCliente('RED', 'Sin conexión')).mockResolvedValue(GUION_FLUJO_A[1]!.respuesta);
  await act(async () => { expect(await result.current.accion.enviar(comando)).toBe(false); });
  expect(result.current.accion.error?.mensaje).toBe('Sin conexión');
  await act(async () => { expect(await result.current.accion.reintentar()).toBe(true); });
  expect(enviar.mock.calls[1]).toEqual(enviar.mock.calls[0]);
  await act(async () => { await result.current.accion.enviar(comando); });
  expect(enviar.mock.calls[2]![1]?.idempotencyKey).not.toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  expect(JSON.stringify(result.current.consultas.getQueryCache().getAll())).not.toContain('2000-01-02');
  expect(result.current.consultas.getMutationCache().getAll()).toEqual([]);
});
it.each([
  { caso: 'otra opción de destinatario', paso: 'DESTINATARIO', anterior: { para: 'MI' }, siguiente: { para: 'OTRA_PERSONA' } },
  { caso: 'CURP capturada después de No la tengo', paso: 'CURP', anterior: { curp: null }, siguiente: { curp: 'PEMA000102MNTXXX00' } },
] as const)('H-01: reemplaza el pendiente fallido al elegir $caso', async ({ paso, anterior, siguiente }) => {
  const { result, enviar } = abrir();
  const { ComandoRequestSchema } = await import('@noki/contracts');
  const previo = ComandoRequestSchema.parse({ ...comando, payload: { paso, ...anterior } });
  const nuevo = ComandoRequestSchema.parse({ ...comando, payload: { paso, ...siguiente } });
  enviar.mockRejectedValueOnce(new ErrorCliente('RED', 'Sin conexión'))
    .mockRejectedValueOnce(new ErrorCliente('RED', 'Sin conexión'))
    .mockResolvedValue(GUION_FLUJO_A[1]!.respuesta);
  await act(async () => { expect(await result.current.accion.enviar(previo)).toBe(false); });
  await act(async () => { expect(await result.current.accion.enviar(nuevo)).toBe(false); });
  expect(enviar.mock.calls[1]![0]).toEqual(nuevo);
  expect(enviar.mock.calls[1]![1]?.idempotencyKey).not.toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  await act(async () => { expect(await result.current.accion.reintentar()).toBe(true); });
  expect(enviar.mock.calls[2]).toEqual(enviar.mock.calls[1]);
  expect(result.current.consultas.getMutationCache().getAll()).toEqual([]);
});
it('conserva el pendiente al reenviar un comando idéntico creado de nuevo', async () => {
  const { result, enviar } = abrir();
  enviar.mockRejectedValueOnce(new ErrorCliente('API', 'Identificación bloqueada temporalmente.', 'REGLA_VIOLADA')).mockResolvedValue(GUION_FLUJO_A[1]!.respuesta);
  await act(async () => { expect(await result.current.accion.enviar(comando)).toBe(false); });
  await act(async () => { expect(await result.current.accion.enviar(structuredClone(comando))).toBe(true); });
  expect(enviar.mock.calls[1]).toEqual(enviar.mock.calls[0]);
});
it.each(['cancelar', 'desmontar'])('descarta el pendiente al %s e ignora la respuesta tardía', async modo => {
  const { result, enviar, unmount } = abrir();
  let resolver!: (respuesta: RespuestaComando) => void;
  enviar.mockImplementation(() => new Promise(resuelve => { resolver = resuelve; }));
  let solicitud!: Promise<boolean>;
  act(() => { solicitud = result.current.accion.enviar(comando); });
  const accion = result.current.accion;
  if (modo === 'cancelar') act(() => accion.descartar()); else unmount();
  await act(async () => { expect(await accion.reintentar()).toBe(false); resolver(GUION_FLUJO_A[1]!.respuesta); expect(await solicitud).toBe(false); });
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(result.current.respuesta).toBeUndefined();
});
