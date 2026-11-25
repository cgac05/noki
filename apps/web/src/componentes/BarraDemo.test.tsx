import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { BarraDemo } from './BarraDemo.tsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function abrir(cliente: ClienteApi) {
  const router = createMemoryRouter([{ path: '*', element: <BarraDemo /> }], { initialEntries: ['/callcenter'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return router;
}

describe('Barra de demo con grupos separados', () => {
  it('presenta la simulación y el progreso con el texto del paso como nombre accesible', () => {
    abrir(new ClienteMock({ latenciaMs: 0 }));
    const barra = screen.getByRole('navigation', { name: 'Canales de la demo' });
    expect(within(barra).getByText('Simulación')).toBeDefined();
    expect(within(barra).getByRole('status').textContent).toBe('Paso 1 de 14 · Esperando llamada');
    const progreso = within(barra).getByRole<HTMLProgressElement>('progressbar', { name: 'Paso 1 de 14 · Esperando llamada' });
    expect(progreso.value).toBe(1);
    expect(progreso.max).toBe(14);
    expect(within(barra).getByRole('link', { name: 'Call Center' }).getAttribute('aria-current')).toBe('page');
    expect(within(barra).getAllByRole('link')).toHaveLength(7);
  });

  it('con el cliente real presenta solo los canales, sin controles ni progreso de simulación', () => {
    const cliente = new ClienteReal();
    vi.spyOn(cliente, 'suscribir').mockImplementation(() => () => {});
    abrir(cliente);
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.queryByText('Simulación')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reiniciar guion' })).toBeNull();
  });

  it('actualiza el progreso al avanzar y conserva el paso al navegar entre canales', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const usuario = userEvent.setup();
    const router = abrir(cliente);
    const entrada = GUION_FLUJO_A[1]!.espera;
    if (entrada?.tipo !== 'comando') throw new Error('El segundo paso debe ser la llamada entrante.');
    await act(async () => { await cliente.enviarComando(entrada.comando); });
    await usuario.click(screen.getByRole('link', { name: 'WhatsApp' }));
    expect(router.state.location.pathname).toBe('/wa');
    expect(screen.getByRole<HTMLProgressElement>('progressbar', { name: 'Paso 2 de 14 · Llamada en Call Center' }).value).toBe(2);
    expect(screen.getByRole('status').textContent).toBe('Paso 2 de 14 · Llamada en Call Center');
  });

  it('conserva el selector y el reinicio y ajusta el máximo al guion elegido', async () => {
    const usuario = userEvent.setup();
    abrir(new ClienteMock({ latenciaMs: 0 }));
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Guion de demo' }), 'flujoC');
    const progreso = screen.getByRole<HTMLProgressElement>('progressbar', { name: 'Paso 1 de 4 · Flujo C · Cita confirmada en App' });
    expect(progreso.value).toBe(1);
    expect(progreso.max).toBe(4);
    await usuario.click(screen.getByRole('button', { name: 'Reiniciar guion' }));
    expect(screen.getByRole<HTMLProgressElement>('progressbar').value).toBe(1);
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('flujoC');
  });
});
