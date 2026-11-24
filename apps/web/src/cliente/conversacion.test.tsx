import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ESQUEMAS_DEMO } from './demo.ts';
import { GUION_FLUJO_A } from './mock/guionFlujoA.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { ProveedorCliente } from './ProveedorCliente.tsx';
import { rutas } from '../rutas.tsx';

afterEach(() => { cleanup(); sessionStorage.clear(); });
it('Sin conversación de demo: solo existe el historial de mensajes enviados y recibidos', () => {
  expect(ESQUEMAS_DEMO).not.toHaveProperty('conversacion');
  for (const paso of GUION_FLUJO_A) expect(paso.lecturas).not.toHaveProperty('conversacion');
});

it('la vista envía por el almacén y acumula la respuesta sin consultar lecturas de conversación', async () => {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const consultar = vi.spyOn(cliente, 'consultar');
  const router = createMemoryRouter(rutas, { initialEntries: ['/wa'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByRole('textbox', { name: 'Mensaje' }), 'otra cosa');
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByText('otra cosa', { exact: true })).toBeDefined();
  expect(await screen.findByText('Abre Call Center y pulsa Llamada entrante para comenzar.')).toBeDefined();
  expect(consultar).not.toHaveBeenCalled();
});
