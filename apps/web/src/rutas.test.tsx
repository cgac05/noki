import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { rutas } from './rutas.tsx';
import { ProveedorCliente } from './cliente/ProveedorCliente.tsx';
import { ClienteMock } from './cliente/mock/ClienteMock.ts';

afterEach(cleanup);

function abrir(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={new ClienteMock({ latenciaMs: 0 })}><RouterProvider router={router} /></ProveedorCliente>);
  return router;
}

describe('Navegación de canales', () => {
  it.each([
    ['/web', 'Web'],
    ['/wa', 'WhatsApp'],
    ['/app', 'App'],
    ['/callcenter', 'Call Center'],
    ['/clinica', 'Clínica'],
    ['/admin', 'Administración'],
    ['/bandeja', 'Bandeja simulada'],
  ])('Cada ruta renderiza: %s', (ruta, titulo) => {
    abrir(ruta);
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeDefined();
    const navegacion = screen.getByRole('navigation', { name: 'Canales de la demo' });
    expect(navegacion.querySelectorAll('a')).toHaveLength(7);
    expect(navegacion.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(ruta);
  });

  it('conserva el contenido de la portada', () => {
    abrir('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Un mismo hilo, en cada canal.' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Canales de atención' })).toBeDefined();
  });

  it('Ruta desconocida: permite volver a la portada', async () => {
    const usuario = userEvent.setup();
    const router = abrir('/inexistente');
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeDefined();
    await usuario.click(screen.getByRole('link', { name: 'Volver a la portada' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Un mismo hilo, en cada canal.' })).toBeDefined();
  });

  it('cambia de canal mediante la barra de demo', async () => {
    const usuario = userEvent.setup();
    const router = abrir('/callcenter');
    await usuario.click(screen.getByRole('link', { name: 'WhatsApp' }));
    expect(router.state.location.pathname).toBe('/wa');
    expect(screen.getByRole('heading', { level: 1, name: 'WhatsApp' })).toBeDefined();
  });
});
