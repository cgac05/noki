import { afterEach, expect, it, vi } from 'vitest';
import { EVENTOS_CLIENTE_SOCKET, ESQUEMAS_EVENTOS_SOCKET } from '@noki/contracts';
import { ClienteReal } from './real/ClienteReal.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';

afterEach(() => vi.restoreAllMocks());
const hilo = `hilo:${IDS.hilo}`;
const sede = `sede:${IDS.sede}`;
function preparar() {
  const socket = new SocketFalso();
  const fabricaSocket = vi.fn(() => socket);
  const cliente = new ClienteReal({ url: 'http://api.test/', fabricaSocket });
  return { cliente, socket, fabricaSocket };
}

it('rechaza una sala inválida sin crear conexión ni emitir', () => {
  const { cliente, socket, fabricaSocket } = preparar();
  expect(() => cliente.unirse('hilo:123')).toThrow();
  expect(socket.emit).not.toHaveBeenCalled(); expect(fabricaSocket).not.toHaveBeenCalled();
});
it('conecta de forma perezosa y cuenta referencias con una sola unión y salida', () => {
  const { cliente, socket, fabricaSocket } = preparar();
  expect(fabricaSocket).not.toHaveBeenCalled();
  const dejar = cliente.unirse(hilo); const dejarOtra = cliente.unirse(hilo);
  expect(fabricaSocket).toHaveBeenCalledExactlyOnceWith('http://api.test', { transports: ['websocket'], autoConnect: false });
  expect(socket.connect).toHaveBeenCalledTimes(1); expect(socket.emit).not.toHaveBeenCalled();
  socket.recibir('connect');
  expect(socket.emit.mock.calls).toEqual([[EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, hilo]]);
  dejar(); dejar(); expect(socket.emit).toHaveBeenCalledTimes(1);
  dejarOtra(); dejarOtra();
  expect(socket.emit.mock.calls).toEqual([[EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, hilo], [EVENTOS_CLIENTE_SOCKET.SALA_SALIR, hilo]]);
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});
it('reúne solo las salas activas tras reconectar, sin encolar salas abandonadas', () => {
  const { cliente, socket } = preparar();
  const dejarHilo = cliente.unirse(hilo); const dejarSede = cliente.unirse(sede);
  socket.recibir('connect'); socket.emit.mockClear();
  socket.connected = false; socket.recibir('connect');
  expect(socket.emit.mock.calls).toEqual([[EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, hilo], [EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, sede]]);
  socket.connected = false; dejarHilo(); socket.emit.mockClear(); socket.recibir('connect');
  expect(socket.emit.mock.calls).toEqual([[EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, sede]]); dejarSede();
});
it('valida todos los eventos y descarta datos mal formados sin lanzar ni registrar', () => {
  const { cliente, socket } = preparar();
  const logs = (['log', 'warn', 'error', 'info', 'debug'] as const).map(nombre => vi.spyOn(console, nombre).mockImplementation(() => {}));
  for (const evento of GUION_FLUJO_A.at(-1)!.eventosSocket) {
    const recibir = vi.fn(); const dejar = cliente.suscribir(evento.nombre, recibir);
    const invalido = evento.nombre === 'tramite:actualizado' ? { id: IDS.tramite, tipo: 'AGENDAR' } : null;
    expect(() => socket.recibir(evento.nombre, invalido)).not.toThrow();
    expect(recibir).not.toHaveBeenCalled();
    socket.recibir(evento.nombre, evento.datos);
    expect(recibir).toHaveBeenCalledExactlyOnceWith(ESQUEMAS_EVENTOS_SOCKET[evento.nombre].parse(evento.datos));
    dejar(); socket.recibir(evento.nombre, evento.datos); expect(recibir).toHaveBeenCalledTimes(1);
  }
  expect(logs.every(log => log.mock.calls.length === 0)).toBe(true);
});
it('en modo simulado unirse y salir no altera el guion ni sus eventos', async () => {
  const cliente = new ClienteMock({ latenciaMs: 0 }); const recibir = vi.fn();
  cliente.suscribir('tramite:actualizado', recibir);
  const dejar = cliente.unirse(hilo); dejar(); dejar();
  expect(cliente.demo.paso().id).toBe('INICIO'); expect(recibir).not.toHaveBeenCalled();
  const paso = GUION_FLUJO_A[1]!;
  if (paso.espera?.tipo !== 'comando') throw new Error('Falta la llamada');
  await cliente.enviarComando(paso.espera.comando);
  expect(recibir).toHaveBeenCalledWith(paso.respuesta.tramite);
});
