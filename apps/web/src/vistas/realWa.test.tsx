import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { rutas } from '../rutas.tsx';
afterEach(() => { cleanup(); sessionStorage.clear(); });

it('sin API real muestra el error en la burbuja y Reintentar conserva mensaje y clave', async () => {
  const peticion = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('sin conexión'));
  const cliente = new ClienteReal({ fetch: peticion });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/wa'] })} /></ProveedorCliente>);
  const usuario = userEvent.setup(); await usuario.type(screen.getByLabelText('Mensaje'), 'Hola');
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
  const error = await screen.findByRole('alert'); expect(error.textContent).toContain('No pudimos conectar con la API');
  await usuario.click(within(error).getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('alert')).toBeDefined(); expect(peticion).toHaveBeenCalledTimes(4);
  const claves = peticion.mock.calls.map(([, opciones]) => new Headers(opciones?.headers).get('Idempotency-Key'));
  expect(new Set(claves).size).toBe(1); expect(within(screen.getByRole('log')).getAllByText('Hola')).toHaveLength(1);
  expect(screen.queryByText('Modo simulado')).toBeNull();
});
