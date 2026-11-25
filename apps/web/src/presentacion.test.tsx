import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { ClienteReal } from './cliente/real/ClienteReal.ts';
import { ClienteMock } from './cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './cliente/mock/guionFlujoA.ts';
import { ProveedorCliente } from './cliente/ProveedorCliente.tsx';
import { SocketFalso } from './pruebas/socketFalso.ts';
import { rutas } from './rutas.tsx';

afterEach(cleanup);

function abrir(ruta: string, sinContexto = false) {
  const lecturas = GUION_FLUJO_A[0]!.lecturas;
  const cliente = new ClienteReal({ demo: true, fabricaSocket: () => new SocketFalso(), fetch: async url => {
    const destino = String(url);
    if (destino.endsWith('/contexto')) return Response.json(sinContexto ? { hiloId: null, pacienteId: null, sedeId: null } : { hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede });
    if (destino.endsWith('/kpis')) return Response.json({ porEstado: [{ estado: 'CONFIRMADA', cantidad: 3 }], kpis: { citasConfirmadas: 3 } });
    if (destino.endsWith('/ficha')) return Response.json({ ...lecturas.fichaHilo, lineaTiempo: [] });
    if (['/citas', '/llegadas', '/huecos', '/alertas', '/bandeja'].some(fin => destino.endsWith(fin))) return Response.json([]);
    throw new Error('Consulta inesperada al comprobar la presentación.');
  } });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} /></ProveedorCliente>);
}

it('Indicadores en tarjetas: solo las dos series de Admin usan la variante y conservan dt antes de dd', async () => {
  abrir('/admin');
  await screen.findByText('CONFIRMADA');
  for (const titulo of ['Trámites por estado', 'Indicadores disponibles']) {
    const seccion = screen.getByRole('heading', { name: titulo }).parentElement!;
    const lista = seccion.querySelector('dl')!;
    expect(lista.classList.contains('datos-tarjetas')).toBe(true);
    expect([...lista.children].map(tarjeta => [...tarjeta.children].map(campo => campo.tagName))).toEqual([['DT', 'DD']]);
    expect(within(seccion).getByText('3')).toBeDefined();
  }
  expect(document.querySelectorAll('.datos-tarjetas')).toHaveLength(2);
});

it.each([
  ['/app', 'Aún no hay citas para mostrar.', 'DIV'],
  ['/clinica', 'Aún no hay llegadas esperadas. Confirma una cita en WhatsApp.', 'P'],
  ['/admin', 'No hay huecos liberados.', 'P'],
  ['/admin', 'Sin alertas de seguridad', 'P'],
  ['/admin', 'Aún no hay eventos en este hilo.', 'P'],
  ['/bandeja', 'No hay mensajes simulados todavía.', 'P'],
])('Estado vacío en %s conserva el texto y el elemento: %s', async (ruta, texto, etiqueta) => {
  abrir(ruta);
  const mensaje = await screen.findByText(texto);
  const superficie = etiqueta === 'DIV' ? mensaje.parentElement! : mensaje;
  expect(mensaje.tagName).toBe('P');
  expect(superficie.tagName).toBe(etiqueta);
  expect(superficie.classList.contains('estado-vacio')).toBe(true);
  if (ruta === '/app') {
    const enlace = within(superficie).getByRole('link', { name: 'Iniciar atención en Call Center' });
    expect(enlace.getAttribute('href')).toBe('/callcenter');
  }
});

it.each([
  ['/app', 'Aún no hay un paciente en el contexto de atención. Confirma una cita y vuelve a actualizar para ver tus citas.'],
  ['/clinica', 'Aún no hay llegadas que mostrar: falta la sede de atención. Confirma una cita y vuelve a actualizar.'],
  ['/admin', 'Aún no hay un hilo que mostrar. Inicia la atención o confirma una cita y vuelve a actualizar.'],
])('Estado vacío de contexto en %s conserva su mensaje y Actualizar', async (ruta, texto) => {
  abrir(ruta, true);
  const mensaje = await screen.findByText(texto);
  const superficie = mensaje.parentElement!;
  expect(superficie.tagName).toBe('DIV');
  expect(superficie.classList.contains('estado-vacio')).toBe(true);
  expect(within(superficie).getByRole('button', { name: 'Actualizar' })).toBeDefined();
});

it('Celular compacto conserva el texto completo del estado y el nombre accesible del progreso', () => {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/'] })} /></ProveedorCliente>);
  const barra = screen.getByRole('navigation', { name: 'Canales de la demo' });
  const texto = 'Paso 1 de 14 · Esperando llamada';
  expect(within(barra).getByRole('status').textContent).toBe(texto);
  expect(within(barra).getByRole('progressbar', { name: texto })).toBeDefined();
  expect(within(barra).getByRole('combobox', { name: 'Guion de demo' })).toBeDefined();
  expect(screen.getByRole('heading', { level: 1 }).classList.contains('titulo-portada')).toBe(true);
});
