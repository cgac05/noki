import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { ClienteMock } from './cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './cliente/mock/guionFlujoA.ts';
import { ProveedorCliente } from './cliente/ProveedorCliente.tsx';
import { LlegadaClinica } from './componentes/LlegadaClinica.tsx';
import { rutas } from './rutas.tsx';

afterEach(() => { cleanup(); sessionStorage.clear(); });

function abrir(ruta: string) {
  const cliente = new ClienteMock({ latenciaMs: 0, guionActivo: 'flujoC' });
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return { cliente, router, usuario: userEvent.setup({ delay: null }) };
}

it('Acento verde de identidad: la llegada conserva su párrafo y texto sin añadir un role', () => {
  const llegada = GUION_FLUJO_A.find(paso => paso.paso.id === 'EN_CLINICA')!.lecturas.llegadasSede[0]!;
  expect(llegada.registrada).toBe(true);
  render(<ProveedorCliente cliente={new ClienteMock({ latenciaMs: 0 })}><LlegadaClinica llegada={llegada} sedeContextoId={IDS.sede} /></ProveedorCliente>);
  const estado = screen.getByText('Llegada registrada');
  expect(estado.tagName).toBe('P');
  expect(estado.getAttribute('role')).toBeNull();
  expect(estado.classList.contains('estado-exito')).toBe(true);
  expect(estado.children).toHaveLength(0);
});

it('Acento verde de identidad: solo la cancelación completada es éxito y conserva role status', async () => {
  const { usuario, router } = abrir('/app');
  await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  const pendiente = await screen.findByText('La cancelación espera aprobación en WhatsApp.');
  expect(pendiente.getAttribute('role')).toBe('status');
  expect(pendiente.classList.contains('estado-exito')).toBe(false);
  await usuario.click(screen.getByRole('link', { name: 'Abrir WhatsApp' }));
  await usuario.click(await screen.findByRole('button', { name: 'Sí, cancelar' }));
  await act(async () => { await router.navigate('/app'); });
  const estado = await screen.findByText('La cita se canceló.');
  expect(estado.tagName).toBe('P');
  expect(estado.getAttribute('role')).toBe('status');
  expect(estado.classList.contains('estado-exito')).toBe(true);
  expect(estado.children).toHaveLength(0);
});

it('Acento verde de identidad: solo las tres tarjetas de logro llevan el acento, incluso si valen cero', async () => {
  abrir('/admin');
  await screen.findByText('Horas de recurso recuperadas');
  const seccion = screen.getByRole('heading', { name: 'Indicadores disponibles' }).parentElement!;
  const logros = [...seccion.querySelectorAll('.tarjeta-logro')];
  expect(logros.map(tarjeta => tarjeta.querySelector('dt')?.textContent)).toEqual([
    'Huecos recuperados', 'Horas de recurso recuperadas', 'Días adelantados en promedio',
  ]);
  for (const logro of logros) {
    expect([...logro.children].map(hijo => hijo.tagName)).toEqual(['DT', 'DD']);
    expect(within(logro as HTMLElement).getByText('0')).toBeDefined();
  }
  expect(screen.getByText('Huecos liberados').parentElement?.classList.contains('tarjeta-logro')).toBe(false);
  expect(document.querySelectorAll('.tarjeta-logro')).toHaveLength(3);
});
