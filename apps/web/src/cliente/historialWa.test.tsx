import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { RespuestaMensajeWa } from '@noki/contracts';
import { HistorialWa } from './historialWa.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { CONTACTO_DEMO } from './ClienteApi.ts';
import { ProveedorCliente } from './ProveedorCliente.tsx';
import { useConversacionWa } from './useConversacionWa.ts';

const numero = CONTACTO_DEMO;
const respuesta: RespuestaMensajeWa = { mensajes: [{ tipo: 'texto', texto: 'Respuesta ficticia' }] };
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
function preparar() {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const enviar = vi.spyOn(cliente, 'enviarMensajeWa').mockResolvedValue(respuesta);
  return { cliente, enviar, historial: new HistorialWa(cliente) };
}

it('Historial acumulado: conserva usuario y bot en orden, por número e hidrata tras recarga', async () => {
  const { cliente, historial } = preparar();
  await historial.enviar({ waId: numero, texto: 'Uno' }, { tipo: 'texto', texto: 'Uno' });
  await historial.enviar({ waId: numero, texto: 'Dos' }, { tipo: 'texto', texto: 'Dos' });
  const entradas = historial.leer(numero).entradas;
  expect(entradas.map(e => e.origen)).toEqual(['usuario', 'bot', 'usuario', 'bot']);
  expect(entradas.filter(e => e.origen === 'usuario').map(e => e.texto)).toEqual(['Uno', 'Dos']);
  expect(historial.leer('5210000000002').entradas).toEqual([]);
  expect(new HistorialWa(cliente).leer(numero).entradas).toEqual(entradas);
  expect(localStorage.length).toBe(0);
});

it('Código de continuación redactado y Flow: solo persiste burbujas sin valores ni solicitudes', async () => {
  const { historial } = preparar();
  await historial.enviar({ waId: numero, texto: 'CONTINUAR codigo-ficticio-protegido' }, { tipo: 'texto', texto: 'CONTINUAR codigo-ficticio-protegido' });
  await historial.enviar({ waId: numero, flowResponse: { fechaNac: 'valor-flow-ficticio' } }, { tipo: 'flow-resumen', texto: 'Fecha de nacimiento ••••' });
  const guardado = sessionStorage.getItem(`noki:wa:${numero}`)!;
  expect(guardado).toContain('CONTINUAR ••••');
  expect(guardado).toContain('Fecha de nacimiento ••••');
  expect(guardado).not.toMatch(/codigo-ficticio-protegido|valor-flow-ficticio|flowResponse|solicitud|idempotencyKey/);
  expect(JSON.stringify(historial.leer(numero))).not.toMatch(/codigo-ficticio-protegido|valor-flow-ficticio/);
});

it('Clave por mensaje y en reintento: misma solicitud/clave sin duplicar burbuja', async () => {
  const { historial, enviar } = preparar();
  enviar.mockRejectedValueOnce(new Error('No debe mostrarse este error interno'));
  const solicitud = { waId: numero, texto: 'Hola' };
  expect(await historial.enviar(solicitud, { tipo: 'texto', texto: 'Hola' })).toBe(false);
  const entrada = historial.leer(numero).entradas[0]!;
  expect(entrada.estado).toBe('error');
  expect(JSON.stringify(entrada)).not.toContain('error interno');
  expect(await historial.reintentar(numero, entrada.id)).toBe(true);
  expect(enviar.mock.calls[1]).toEqual(enviar.mock.calls[0]);
  await historial.enviar({ waId: numero, texto: 'Otro' }, { tipo: 'texto', texto: 'Otro' });
  expect(enviar.mock.calls[2]![1]?.idempotencyKey).not.toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  expect(historial.leer(numero).entradas).toHaveLength(4);
});

it('bloquea dos envíos síncronos antes del primer await y notifica al terminar', async () => {
  const { historial, enviar } = preparar();
  let resolver!: (valor: RespuestaMensajeWa) => void;
  enviar.mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
  const cambio = vi.fn(); const dejar = historial.suscribir(numero, cambio);
  const pendiente = historial.enviar({ waId: numero, texto: 'Uno' }, { tipo: 'texto', texto: 'Uno' });
  expect(historial.leer(numero).enviando).toBe(true);
  expect(await historial.enviar({ waId: numero, texto: 'Dos' }, { tipo: 'texto', texto: 'Dos' })).toBe(false);
  expect(enviar).toHaveBeenCalledTimes(1);
  resolver(respuesta); await pendiente;
  expect(historial.leer(numero).enviando).toBe(false); expect(cambio).toHaveBeenCalled(); dejar();
});

it('Nueva conversación borra el número activo y descarta respuestas tardías', async () => {
  const { historial, enviar } = preparar();
  let resolver!: (valor: RespuestaMensajeWa) => void;
  enviar.mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
  const pendiente = historial.enviar({ waId: numero, texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' });
  historial.borrar(numero); resolver(respuesta); await pendiente;
  expect(historial.leer(numero).entradas).toEqual([]);
  expect(sessionStorage.getItem(`noki:wa:${numero}`)).toBeNull();
});

it('registra los códigos enviados solo en memoria y los libera al reiniciar el guion', async () => {
  const { historial, enviar } = preparar();
  expect(await historial.continuar(numero, '')).toBe(false);
  expect(await historial.continuar(numero, 'codigo-ficticio')).toBe(true);
  expect(await historial.continuar(numero, 'codigo-ficticio')).toBe(false);
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem(`noki:wa:${numero}`)).not.toContain('codigo-ficticio');
  historial.reiniciar();
  expect(historial.leer(numero).entradas).toEqual([]);
  expect(sessionStorage.getItem(`noki:wa:${numero}`)).toBeNull();
  expect(await historial.continuar(numero, 'codigo-ficticio')).toBe(true);
});

it('conserva en memoria aunque sessionStorage no esté disponible o tenga contenido inválido', async () => {
  const { cliente } = preparar();
  const almacenamiento = { getItem: () => { throw new Error('no disponible'); }, setItem: () => { throw new Error('no disponible'); }, removeItem: () => { throw new Error('no disponible'); } };
  const historial = new HistorialWa(cliente, { almacenamiento });
  expect(await historial.enviar({ waId: numero, texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' })).toBe(true);
  expect(historial.leer(numero).entradas).toHaveLength(2); historial.borrar(numero);
  sessionStorage.setItem(`noki:wa:${numero}`, '{incorrecto');
  expect(new HistorialWa(cliente).leer(numero).entradas).toEqual([]);
});

it('el cierre descarta la solicitud protegida pendiente y ya no puede reintentarse', async () => {
  const { historial, enviar } = preparar(); enviar.mockRejectedValueOnce(new Error('red'));
  await historial.enviar({ waId: numero, flowResponse: { fechaNac: 'valor-flow-ficticio' } }, { tipo: 'flow-resumen', texto: 'Fecha de nacimiento ••••' });
  const entrada = historial.leer(numero).entradas[0]!;
  historial.descartarPendiente(numero, entrada.id);
  expect(await historial.reintentar(numero, entrada.id)).toBe(false);
  expect(enviar).toHaveBeenCalledTimes(1);
});

it('el proveedor comparte el historial con el hook y reiniciar el guion vacía la sesión', async () => {
  const { cliente } = preparar();
  let conversacion!: ReturnType<typeof useConversacionWa>;
  function Vista() { conversacion = useConversacionWa(numero); return <p>{conversacion.entradas.length}</p>; }
  render(<ProveedorCliente cliente={cliente}><Vista /></ProveedorCliente>);
  await act(async () => { await conversacion.enviar({ waId: numero, texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' }); });
  expect(screen.getByText('2')).toBeDefined();
  act(() => cliente.demo.reiniciar());
  expect(screen.getByText('0')).toBeDefined();
  expect(sessionStorage.getItem(`noki:wa:${numero}`)).toBeNull();
});

it('agrega mensajes iniciados por la empresa con redacción, orden y persistencia solo de sesión', () => {
  const { cliente, historial } = preparar();
  historial.recibirMensajes(numero, [
    { tipo: 'texto', texto: 'CONTINUAR referencia-protegida' },
    { tipo: 'flow', titulo: 'Verifica', campos: [{ id: 'dato', etiqueta: 'Dato protegido', captura: 'sensitive', requerido: true, valorInicial: '1234' }] },
  ]);
  expect(historial.leer(numero).entradas.map(e => e.origen)).toEqual(['bot', 'bot']);
  const guardado = sessionStorage.getItem(`noki:wa:${numero}`)!;
  expect(guardado).toContain('CONTINUAR ••••');
  expect(guardado).not.toMatch(/referencia-protegida|valorInicial|1234/);
  expect(new HistorialWa(cliente).leer(numero).entradas).toEqual(historial.leer(numero).entradas);
  expect(localStorage.length).toBe(0);
});

it('registra los tres números de demo y los conversados, ignora ajenos y marca solo los no visibles', async () => {
  const { historial } = preparar();
  expect(historial.numerosSesion()).toEqual(['5210000000001', '5210000000002', '5210000000003']);
  historial.mostrar(numero);
  historial.recibirMensajes(numero, respuesta.mensajes);
  expect(historial.numerosNuevos()).toEqual([]);
  historial.recibirMensajes('5210000000003', respuesta.mensajes);
  expect(historial.numerosNuevos()).toEqual(['5210000000003']);
  historial.mostrar('5210000000003');
  expect(historial.numerosNuevos()).toEqual([]);
  historial.recibirMensajes('5210000000009', respuesta.mensajes);
  expect(sessionStorage.getItem('noki:wa:5210000000009')).toBeNull();
  expect(historial.numerosNuevos()).toEqual([]);
  await historial.enviar({ waId: '5210000000008', texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' });
  expect(historial.numerosSesion()).toContain('5210000000008');
});
