import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import type { HuecoVista } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';

afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });
const hueco: HuecoVista = {
  id: '019aff10-0000-7000-8000-000000000001', servicio: 'Ultrasonido abdominal', sede: 'Clínica Tepic',
  inicio: '2026-11-26T16:15:00.000Z', zonaHoraria: 'America/Mazatlan', estado: 'OFRECIDO',
  ofertas: [{ estado: 'OFRECIDA', enviadaEn: '2026-11-25T15:00:00.000Z', expiraEn: '2026-11-25T15:15:00.000Z' }],
};
function abrir(huecos: HuecoVista[] = [hueco], fallarInicial = false) {
  const socket = new SocketFalso();
  const lecturas = structuredClone(GUION_FLUJO_A[0]!.lecturas);
  let panel = huecos; let fallar = fallarInicial;
  const peticion = vi.fn<typeof fetch>().mockImplementation(async url => {
    const ruta = String(url);
    if (ruta.endsWith('/huecos')) {
      if (fallar) return Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'No se pudo consultar el panel' } }, { status: 503 });
      return Response.json(panel.map(dato => ({ ...dato, paciente: 'No revelar paciente', ofertas: dato.ofertas.map(oferta => ({ ...oferta, canal: 'whatsapp', pacienteId: 'no-revelar' })) })));
    }
    if (ruta.endsWith('/kpis')) return Response.json({ ...lecturas.metricas, kpis: { huecosLiberados: 3, huecosRecuperados: 1, horasRecursoRecuperadas: 1.5, diasAdelantadosPromedio: 2 } });
    if (ruta.endsWith('/alertas')) return Response.json([]);
    if (ruta.endsWith('/contexto')) return Response.json({ hiloId: null, pacienteId: null, sedeId: null });
    throw new Error('Consulta inesperada de prueba');
  });
  const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => socket });
  const vista = render(<ProveedorCliente cliente={cliente}><RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/admin'] })} /></ProveedorCliente>);
  return { ...vista, usuario: userEvent.setup(), socket, peticion, cambiar: (datos: HuecoVista[]) => { panel = datos; }, fallar: (valor: boolean) => { fallar = valor; } };
}

it('muestra hueco y ofertas en orden recibido, con fecha de Tepic y sin canal ni datos de pacientes', async () => {
  abrir([{ ...hueco, servicio: 'Primero recibido', ofertas: [
    { ...hueco.ofertas[0]!, estado: 'RECHAZADA' }, hueco.ofertas[0]!,
  ] }, { ...hueco, id: '019aff10-0000-7000-8000-000000000002', servicio: 'Segundo recibido', estado: 'DETECTADO' }]);
  const panel = await screen.findByRole('region', { name: 'Panel de huecos' });
  await within(panel).findByText('Primero recibido');
  expect(panel.textContent).toMatch(/Primero recibido.*Rechazada.*Ofrecida.*Segundo recibido/s);
  expect(within(panel).getAllByText('Clínica Tepic')).toHaveLength(2);
  expect(panel.textContent).toMatch(/26 de noviembre de 2026.*09:15/s);
  expect(within(panel).getAllByText('America/Mazatlan')).toHaveLength(2);
  const hora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  expect(panel.textContent).toContain(hora.format(new Date(hueco.ofertas[0]!.enviadaEn)));
  expect(panel.textContent).toContain(hora.format(new Date(hueco.ofertas[0]!.expiraEn)));
  expect(panel.textContent).not.toMatch(/whatsapp|No revelar|no-revelar|paciente/i);
});

it('panel vacío conserva el resto del tablero', async () => {
  abrir([]);
  expect(await screen.findByText('No hay huecos liberados.')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Trámites por estado' })).toBeDefined();
});

it('error independiente permite reintentar sin ocultar métricas ni alertas', async () => {
  const vista = abrir([hueco], true);
  expect(await screen.findByText('No se pudo consultar el panel')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Indicadores disponibles' })).toBeDefined();
  expect(await screen.findByText('Sin alertas de seguridad')).toBeDefined();
  vista.fallar(false);
  await vista.usuario.click(within(screen.getByRole('region', { name: 'Panel de huecos' })).getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Ultrasonido abdominal')).toBeDefined();
});

it('un evento de admin refresca el panel sin recargar', async () => {
  const vista = abrir();
  const panel = await screen.findByRole('region', { name: 'Panel de huecos' });
  await within(panel).findByText('Ofrecido');
  act(() => vista.socket.recibir('connect'));
  expect(vista.socket.emit).toHaveBeenCalledWith('sala:unirse', 'admin');
  vista.cambiar([{ ...hueco, estado: 'ASIGNADO', ofertas: [{ ...hueco.ofertas[0]!, estado: 'ACEPTADA' }] }]);
  act(() => vista.socket.recibir('admin:metricas', { huecosRecuperados: 1 }));
  expect(await within(panel).findByText('Asignado')).toBeDefined();
  expect(within(panel).getByText('Aceptada')).toBeDefined();
  await waitFor(() => expect(vista.peticion.mock.calls.filter(([url]) => String(url).endsWith('/huecos'))).toHaveLength(2));
});

it('presenta las cuatro etiquetas de KPI de huecos y su valor recibido', async () => {
  abrir();
  for (const etiqueta of ['Huecos liberados', 'Huecos recuperados', 'Horas de recurso recuperadas', 'Días adelantados en promedio']) expect(await screen.findByText(etiqueta)).toBeDefined();
  expect(screen.getByText('Horas de recurso recuperadas').parentElement?.textContent).toBe('Horas de recurso recuperadas1.5');
});
