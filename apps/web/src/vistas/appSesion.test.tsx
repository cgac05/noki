import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { CATALOGO_DEMO } from '../cliente/mock/datosWeb.ts';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { entrarSesionDemo } from '../pruebas/entrarSesionDemo.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';

const citaAna = GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.citasPaciente[0]!;
const idBeto = '019aff10-0000-7000-8000-000000000012';
const citaBeto = { ...citaAna, tramite: { ...citaAna.tramite, id: IDS.reserva }, servicio: 'Ultrasonido abdominal', tokenQr: 'demo.qr.beto' };
const telefonoContinuacion = '3112111830';
const cotizada = GUION_FLUJO_A.find(paso => paso.paso.id === 'COTIZADO')!.lecturas.tramite;
const pendientePaciente = { ...cotizada, id: IDS.reserva, estado: 'HORARIO_RESERVADO' };

afterEach(() => { cleanup(); sessionStorage.clear(); });

function abrir(modo: 'mock' | 'real', conPendientes = false) {
  const socket = new SocketFalso();
  let confirmada = false;
  const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    const ruta = String(url);
    if (ruta.endsWith('/sesion-web/' + telefonoContinuacion)) return Response.json({
      pacienteId: IDS.paciente, nombreVisible: 'Ana P.', tramitesEnProceso: confirmada ? [] : [cotizada],
    });
    if (ruta.endsWith('/sesion-web/5210000000007')) return Response.json({
      pacienteId: null, nombreVisible: null, tramitesEnProceso: [cotizada],
    });
    if (ruta.endsWith('/api/catalogo')) return Response.json([CATALOGO_DEMO]);
    if (ruta.endsWith('/api/canales/wa/mensajes')) {
      const entrada = JSON.parse(String(opciones?.body));
      if (entrada.waId !== telefonoContinuacion) throw new Error('Teléfono de sesión inesperado');
      if (entrada.payloadBoton === 'confirmar-demo') confirmada = true;
      return Response.json({ mensajes: confirmada
        ? [{ tipo: 'texto', texto: 'Cita confirmada.' }]
        : [{ tipo: 'botones', texto: 'Elige el horario pendiente', botones: [{ id: 'confirmar', titulo: 'Confirmar horario', payload: 'confirmar-demo' }] }],
      });
    }
    if (ruta.endsWith('/sesion-web/5210000000001')) return Response.json({ pacienteId: IDS.paciente, nombreVisible: 'Ana P.', tramitesEnProceso: [] });
    if (ruta.endsWith('/sesion-web/5210000000002')) return Response.json({ pacienteId: idBeto, nombreVisible: 'Beto R.', tramitesEnProceso: [] });
    if (ruta.endsWith('/sesion-web/5210000000008')) return Response.json({ pacienteId: null, nombreVisible: null, tramitesEnProceso: [] });
    if (ruta.endsWith('/sesion-web/5210000000009')) return Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Sin registro.' } }, { status: 404 });
    if (ruta.endsWith(`/${IDS.paciente}/tramites-abiertos`)) return Response.json(conPendientes
      ? [pendientePaciente, ...(confirmada ? [citaAna.tramite] : [cotizada]), { ...cotizada, id: idBeto, tipo: 'FACTURA' }]
      : [citaAna.tramite, { ...citaBeto.tramite, estado: 'ATENDIDA' }]);
    if (ruta.endsWith(`/${idBeto}/tramites-abiertos`)) return Response.json([]);
    if (ruta.endsWith(`/${IDS.paciente}/citas`)) return Response.json(conPendientes && !confirmada ? [] : [citaAna]);
    if (ruta.endsWith(`/${idBeto}/citas`)) return Response.json([citaBeto]);
    throw new Error('Consulta inesperada');
  });
  const cliente = modo === 'mock'
    ? new ClienteMock({ latenciaMs: 0, sesionWebDemo: true })
    : new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => socket });
  const consultar = vi.spyOn(cliente, 'consultar');
  const router = createMemoryRouter(rutas, { initialEntries: ['/app'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  const confirmar = async () => {
    if (cliente.modo !== 'mock') return;
    await act(async () => {
      for (const paso of GUION_FLUJO_A.slice(1)) {
        const espera = paso.espera;
        if (espera?.tipo === 'comando') await cliente.enviarComando(espera.comando);
        else if (espera?.tipo === 'comandos') for (const comando of espera.comandos) await cliente.enviarComando(comando);
        else if (espera?.tipo === 'wa') await cliente.enviarMensajeWa(espera.mensaje);
        if (paso.paso.id === 'CONFIRMADA') break;
      }
    });
  };
  return { usuario: userEvent.setup(), consultar, peticion, socket, confirmar, router };
}

it('une los trámites sin duplicarlos y permite retomar y confirmar dentro de la app', async () => {
  const { usuario, router } = abrir('real', true);
  await entrarSesionDemo(usuario, telefonoContinuacion);
  const pendientes = within(await screen.findByRole('region', { name: 'Citas por terminar' }));
  await waitFor(() => expect(pendientes.getAllByText(CATALOGO_DEMO.servicio)).toHaveLength(2));
  expect(pendientes.getAllByText(CATALOGO_DEMO.sede)).toHaveLength(2);
  const botones = pendientes.getAllByRole('button', { name: 'Termina tu cita' });
  expect(botones).toHaveLength(2);
  await usuario.click(botones[1]!);
  expect(await screen.findByText('Elige el horario pendiente')).toBeDefined();
  expect(router.state.location.pathname).toBe('/app');
  await usuario.click(screen.getByRole('button', { name: 'Confirmar horario' }));
  await screen.findByText('Cita confirmada.');
  await usuario.click(screen.getByRole('button', { name: 'Volver' }));
  expect(await screen.findByRole('img', { name: 'Código QR de la cita' })).toBeDefined();
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Termina tu cita' })).toHaveLength(1));
});

it('muestra el trámite del número sin paciente vinculado', async () => {
  const { usuario, consultar } = abrir('real');
  await entrarSesionDemo(usuario, '5210000000007');
  const pendientes = within(await screen.findByRole('region', { name: 'Citas por terminar' }));
  expect(await pendientes.findByText(CATALOGO_DEMO.servicio)).toBeDefined();
  expect(screen.queryByRole('heading', { name: 'No encontramos citas para este número' })).toBeNull();
  expect(consultar.mock.calls.map(([nombre]) => nombre)).toEqual(['sesionWebDemo', 'catalogo']);
});

it('conserva las citas y omite la sección cuando no hay trámites en proceso', async () => {
  const { usuario } = abrir('real');
  await entrarSesionDemo(usuario);
  expect(await screen.findByRole('img', { name: 'Código QR de la cita' })).toBeDefined();
  expect(screen.getByText('CONFIRMADA')).toBeDefined();
  expect(screen.queryByRole('heading', { name: 'Citas por terminar' })).toBeNull();
});

it.each(['mock', 'real'] as const)('entra con el número de Ana y muestra su estado y QR en modo %s', async modo => {
  const { usuario, consultar, confirmar } = abrir(modo);
  await confirmar();
  expect(consultar).not.toHaveBeenCalled();
  await entrarSesionDemo(usuario);
  expect(await screen.findByRole('heading', { name: 'Hola, Ana P.' })).toBeDefined();
  expect(await screen.findByRole('img', { name: 'Código QR de la cita' })).toBeDefined();
  expect(screen.getByText('CONFIRMADA')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Cancelar cita' })).toBeDefined();
  expect(consultar).toHaveBeenCalledWith('citasPaciente', { pacienteId: IDS.paciente });
  expect(consultar).not.toHaveBeenCalledWith('contextoDemo', {});
});

it.each(['mock', 'real'] as const)('sale de Ana y muestra solo las citas de Beto en modo %s', async modo => {
  const { usuario, consultar, socket, confirmar } = abrir(modo);
  await confirmar();
  await entrarSesionDemo(usuario);
  await screen.findByText(citaAna.servicio);
  if (modo === 'real') {
    act(() => socket.recibir('connect'));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `paciente:${IDS.paciente}`);
  }
  await usuario.click(screen.getByRole('button', { name: 'Salir' }));
  expect(screen.getByRole('heading', { name: 'Identifícate' })).toBeDefined();
  expect(screen.queryByText(citaAna.servicio)).toBeNull();
  await entrarSesionDemo(usuario, '5210000000002');
  expect(await screen.findByRole('heading', { name: /^Hola, Beto/ })).toBeDefined();
  expect(await screen.findByText(citaBeto.servicio)).toBeDefined();
  expect(screen.queryByText(citaAna.servicio)).toBeNull();
  expect(consultar).toHaveBeenCalledWith('citasPaciente', { pacienteId: idBeto });
  if (modo === 'real') {
    expect(socket.emit).toHaveBeenCalledWith('sala:salir', `paciente:${IDS.paciente}`);
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `paciente:${idBeto}`);
  }
});

it.each(['mock', 'real'] as const)('rechaza la contraseña incorrecta sin consultar en modo %s', async modo => {
  const { usuario, consultar, peticion } = abrir(modo);
  await entrarSesionDemo(usuario, '5210000000001', 'incorrecta');
  expect(screen.getByRole('alert').textContent).toBe('Contraseña incorrecta.');
  expect(consultar).not.toHaveBeenCalled();
  expect(peticion).not.toHaveBeenCalled();
});

it.each([
  ['mock', '5210000000009'], ['real', '5210000000009'], ['real', '5210000000008'],
] as const)('muestra enlaces si falta el paciente en modo %s (%s)', async (modo, telefono) => {
  const { usuario, consultar } = abrir(modo);
  await entrarSesionDemo(usuario, telefono);
  await screen.findByRole('heading', { name: 'No encontramos citas para este número' });
  expect(screen.getByRole('link', { name: 'Agendar en Web' }).getAttribute('href')).toBe('/web');
  expect(screen.getByRole('link', { name: 'Agendar por WhatsApp' }).getAttribute('href')).toBe('/wa');
  expect(consultar.mock.calls).toEqual([['sesionWebDemo', { telefono }]]);
  await usuario.click(screen.getByRole('button', { name: 'Salir' }));
  expect(screen.getByRole('heading', { name: 'Identifícate' })).toBeDefined();
});
