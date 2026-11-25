import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import type { RespuestaComando } from '@noki/contracts';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { ErrorCliente } from '../cliente/errores.ts';
import { rutas } from '../rutas.tsx';

const confirmada = GUION_FLUJO_A.find(p => p.paso.id === 'CONFIRMADA')!;
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });
function abrir(estado: 'CONFIRMADA' | 'ATENDIDA' = 'CONFIRMADA') {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const consultar = cliente.consultar.bind(cliente);
  const cita = { ...confirmada.lecturas.citasPaciente[0]!, tramite: { ...confirmada.respuesta.tramite, id: '019aff00-0000-7000-8000-000000000099', estado } };
  vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => nombre === 'citasPaciente' ? [cita] as Awaited<ReturnType<typeof consultar<typeof nombre>>> : consultar(nombre, parametros));
  const enviar = vi.spyOn(cliente, 'enviarComando').mockResolvedValue(confirmada.respuesta);
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/app'] })} /></ProveedorCliente>);
  return { cita, enviar, usuario: userEvent.setup() };
}

it('confirma una sola vez con el trámite elegido y muestra aprobación pendiente sin alterar la cita', async () => {
  const { cita, enviar, usuario } = abrir();
  await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
  expect(enviar).not.toHaveBeenCalled();
  let rechazar!: (error: ErrorCliente) => void;
  enviar.mockImplementation(() => new Promise<RespuestaComando>((_resolve, reject) => { rechazar = reject; }));
  const confirmar = screen.getByRole('button', { name: 'Confirmar cancelación' });
  act(() => { fireEvent.click(confirmar); fireEvent.click(confirmar); });
  await waitFor(() => expect(enviar).toHaveBeenCalledExactlyOnceWith({ tipo: 'CancelarCita', canal: 'app', actor: 'paciente', tramiteId: cita.tramite.id, payload: {} }, { idempotencyKey: expect.any(String) }));
  await act(async () => rechazar(new ErrorCliente('API', 'Verificación requerida', 'STEP_UP_REQUERIDO')));
  expect(await screen.findByText(/cancelación espera aprobación en WhatsApp/i)).toBeDefined();
  expect(screen.getByRole('link', { name: 'Abrir WhatsApp' }).getAttribute('href')).toBe('/wa');
  expect(within(screen.getByRole('region', { name: 'Cita del paciente' })).getByText('CONFIRMADA')).toBeDefined();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('pedir otra aprobación crea una clave distinta y no reutiliza el rechazo anterior', async () => {
  const { enviar, usuario } = abrir();
  enviar.mockRejectedValue(new ErrorCliente('API', 'Verificación requerida', 'STEP_UP_REQUERIDO'));
  for (let intento = 0; intento < 2; intento++) {
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    await screen.findByText(/cancelación espera aprobación en WhatsApp/i);
  }
  expect(enviar).toHaveBeenCalledTimes(2);
  expect(enviar.mock.calls[1]![1]?.idempotencyKey).not.toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  expect(enviar.mock.calls[1]![0]).toEqual(enviar.mock.calls[0]![0]);
});

it('desistir conserva la cita sin enviar comandos', async () => {
  const { enviar, usuario } = abrir();
  await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
  await usuario.click(screen.getByRole('button', { name: 'Conservar cita' }));
  expect(enviar).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Confirmar cancelación' })).toBeNull();
  expect(screen.getByText('CONFIRMADA')).toBeDefined();
});

it('una cita atendida no ofrece cancelar', async () => {
  abrir('ATENDIDA');
  await screen.findByText('ATENDIDA');
  expect(screen.queryByRole('button', { name: 'Cancelar cita' })).toBeNull();
});

it('reintenta el mismo comando y clave tras error de red y presenta el resultado CANCELADA', async () => {
  const { enviar, usuario } = abrir();
  enviar.mockRejectedValueOnce(new ErrorCliente('RED', 'No hay conexión de prueba')).mockResolvedValue({ ...confirmada.respuesta, tramite: { ...confirmada.respuesta.tramite, estado: 'CANCELADA' } });
  await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  expect(await screen.findByText('No hay conexión de prueba')).toBeDefined();
  await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('La cita se canceló.')).toBeDefined();
  await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
  expect(enviar.mock.calls[1]).toEqual(enviar.mock.calls[0]);
  expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).toBeNull();
});
