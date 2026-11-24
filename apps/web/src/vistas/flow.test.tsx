import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { MensajeBot } from '@noki/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { ErrorCliente } from '../cliente/errores.ts';
import { rutas } from '../rutas.tsx';
import '../pruebas/dialogo.ts';

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
const flow: MensajeBot = { tipo: 'flow', titulo: 'Verificación protegida', campos: [
  { id: 'nombre', etiqueta: 'Nombre de prueba', captura: 'texto', requerido: true },
  { id: 'fecha', etiqueta: 'Fecha de prueba', captura: 'fecha', requerido: true },
  { id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true },
  { id: 'pin', etiqueta: 'PIN', captura: 'passcode', requerido: true },
] };
const valores = { nombre: 'persona ficticia', fecha: '2020-02-03', fechaNac: '2000-01-02', pin: '5678' };
async function abrir() {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const enviar = vi.spyOn(cliente, 'enviarMensajeWa').mockResolvedValue({ mensajes: [flow, { tipo: 'texto', texto: 'Abre el formulario protegido para continuar.' }] });
  let cache!: QueryClient;
  function Observar() { cache = useQueryClient(); return null; }
  const router = createMemoryRouter(rutas, { initialEntries: ['/wa'] });
  render(<ProveedorCliente cliente={cliente}><Observar /><RouterProvider router={router} /></ProveedorCliente>);
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Mensaje'), 'Hola'); await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
  await usuario.click(await screen.findByRole('button', { name: 'Abrir formulario' }));
  return { usuario, cliente, enviar, cache };
}
async function completar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Nombre de prueba'), valores.nombre);
  fireEvent.change(screen.getByLabelText('Fecha de prueba'), { target: { value: valores.fecha } });
  await usuario.type(screen.getByLabelText('Fecha de nacimiento', { exact: true }), valores.fechaNac);
  await usuario.type(screen.getByLabelText('PIN', { exact: true }), valores.pin);
}

it('Envío del Flow: controles según captura y resumen enmascarado sin valores en mutaciones ni almacenamiento', async () => {
  const consola = ['log', 'warn', 'error', 'info', 'debug'] as const;
  const espias = consola.map(nombre => vi.spyOn(console, nombre).mockImplementation(() => {}));
  const { usuario, enviar, cache } = await abrir();
  expect(screen.getByRole('dialog', { name: 'Verificación protegida' })).toBeDefined();
  expect(screen.getByLabelText('Nombre de prueba').getAttribute('type')).toBe('text');
  expect(screen.getByLabelText('Fecha de prueba').getAttribute('type')).toBe('date');
  for (const nombre of ['Fecha de nacimiento', 'PIN']) expect(screen.getByLabelText(nombre, { exact: true }).getAttribute('type')).toBe('password');
  expect(screen.getByLabelText('PIN', { exact: true }).getAttribute('inputmode')).toBe('numeric');
  await completar(usuario);
  enviar.mockResolvedValue({ mensajes: [{ tipo: 'texto', texto: 'Captura recibida.' }] });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await screen.findByText('Captura recibida.');
  expect(enviar).toHaveBeenLastCalledWith({ waId: CONTACTO_DEMO, flowResponse: valores }, { idempotencyKey: expect.any(String) });
  expect(screen.queryByRole('dialog')).toBeNull();
  for (const etiqueta of ['Nombre de prueba', 'Fecha de prueba', 'Fecha de nacimiento', 'PIN']) expect(screen.getByText(new RegExp(`${etiqueta} ••••`))).toBeDefined();
  const guardado = sessionStorage.getItem(`noki:wa:${CONTACTO_DEMO}`)!;
  for (const valor of Object.values(valores)) {
    expect(document.body.textContent).not.toContain(valor); expect(guardado).not.toContain(valor);
    expect(JSON.stringify(cache.getMutationCache().getAll())).not.toContain(valor);
    for (const espia of espias) expect(JSON.stringify(espia.mock.calls)).not.toContain(valor);
  }
  expect(localStorage.length).toBe(0); expect(cache.getMutationCache().getAll()).toEqual([]);
});

it('Campo requerido vacío: no envía y señala el campo', async () => {
  const { usuario, enviar } = await abrir();
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Fecha de nacimiento', { exact: true }).getAttribute('aria-invalid')).toBe('true');
  expect(screen.getAllByText('Completa este campo.').length).toBeGreaterThan(0);
});

it('atrapa el foco con Tab y Shift+Tab entre el primer campo y Cancelar', async () => {
  const { usuario } = await abrir();
  const primero = screen.getByLabelText('Nombre de prueba'); const ultimo = screen.getByRole('button', { name: 'Cancelar' });
  primero.focus(); await usuario.tab({ shift: true }); expect(document.activeElement).toBe(ultimo);
  await usuario.tab(); expect(document.activeElement).toBe(primero);
});

it('Escape y valores descartados: cancela sin enviar y abre campos vacíos', async () => {
  const { usuario, enviar } = await abrir(); await completar(usuario);
  await usuario.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull(); expect(enviar).toHaveBeenCalledTimes(1);
  await usuario.click(screen.getByRole('button', { name: 'Abrir formulario' }));
  for (const campo of ['Nombre de prueba', 'Fecha de prueba', 'Fecha de nacimiento', 'PIN']) expect((screen.getByLabelText(campo, { exact: true }) as HTMLInputElement).value).toBe('');
});

it('reintenta el Flow con la misma solicitud y clave; cerrar descarta el pendiente protegido', async () => {
  const { usuario, enviar } = await abrir(); await completar(usuario);
  enviar.mockRejectedValueOnce(new ErrorCliente('RED', 'Sin conexión. Intenta de nuevo.')).mockResolvedValue({ mensajes: [{ tipo: 'texto', texto: 'Enviado al reintentar' }] });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await usuario.click(await screen.findByRole('button', { name: 'Reintentar envío' }));
  expect(await screen.findByText('Enviado al reintentar')).toBeDefined(); expect(enviar.mock.calls[2]).toEqual(enviar.mock.calls[1]);
  expect(screen.getAllByText(/Fecha de nacimiento ••••/)).toHaveLength(1);
});

it('cerrar después de un error borra los valores y elimina el reintento del historial', async () => {
  const { usuario, enviar } = await abrir(); await completar(usuario);
  enviar.mockRejectedValue(new ErrorCliente('RED', 'Sin conexión. Intenta de nuevo.'));
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await screen.findByRole('button', { name: 'Reintentar envío' });
  await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
  await usuario.click(screen.getByRole('button', { name: 'Abrir formulario' }));
  expect((screen.getByLabelText('Fecha de nacimiento', { exact: true }) as HTMLInputElement).value).toBe('');
  expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
});
