import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { ComandoRequestSchema } from '@noki/contracts';
import type { ComandoRequest } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import '../pruebas/dialogo.ts';

afterEach(() => { cleanup(); sessionStorage.clear(); });

function abrirWeb({ conPaciente = true, demo = true } = {}) {
  const id = '019aff20-0000-7000-8000-000000000001';
  const hiloId = '019aff20-0000-7000-8000-000000000002';
  const oferta = {
    servicioId: '019aff20-0000-7000-8000-000000000003', servicio: 'Ultrasonido abdominal',
    sedeId: '019aff20-0000-7000-8000-000000000004', sede: 'Bahía de Banderas', precioCentavos: 25850,
  };
  const tramite = { id, hiloId, tipo: 'AGENDAR', estado: 'BORRADOR', version: 1 };
  const cotizado = { ...tramite, estado: 'COTIZADO', version: 3, servicioId: oferta.servicioId, sedeId: oferta.sedeId };
  const comandos: ComandoRequest[] = [];
  const pacienteId = '019aff20-0000-7000-8000-000000000005';
  const rutasConsultadas: string[] = [];
  const peticion: typeof fetch = async (url, opciones) => {
    const ruta = new URL(String(url)).pathname;
    rutasConsultadas.push(ruta);
    if (ruta === '/api/demo/contexto') return Response.json({ hiloId, pacienteId: conPaciente ? pacienteId : null, sedeId: oferta.sedeId });
    if (ruta === `/api/pacientes/${pacienteId}/citas`) {
      const cita = { servicio: oferta.servicio, sede: oferta.sede, inicio: '2026-11-26T15:05:00.000Z', zonaHoraria: 'America/Mazatlan', tokenQr: 'qr-cita-demo' };
      return Response.json([
        { ...cita, tramite: { ...cotizado, estado: 'CONFIRMADA', folioExterno: '12345678', pacienteId } },
        { ...cita, servicio: 'Estudio cancelado', tramite: { ...cotizado, estado: 'CANCELADA', pacienteId, id: '019aff20-0000-7000-8000-000000000006' } },
      ]);
    }
    if (ruta === '/api/catalogo') return Response.json([{ ...oferta, sedeId: hiloId, precioCentavos: 100 }, oferta]);
    if (ruta === '/api/comandos' && opciones?.method === 'POST') {
      const comando = ComandoRequestSchema.parse(JSON.parse(String(opciones.body)));
      comandos.push(comando);
      return Response.json({
        tramite: comando.tipo === 'IniciarTramite' ? tramite : cotizado,
        siguientePregunta: { tipo: 'COMPLETO' },
        eventos: [],
      });
    }
    if (ruta === `/api/hilos/${hiloId}/ficha`) return Response.json({
      hiloId, tramites: [cotizado], lineaTiempo: [], soloLectura: false,
      nombrePila: null, telefonoEnmascarado: null, oferta,
      codigoContinuacion: comandos.some(({ tipo }) => tipo === 'SolicitarContinuacion') ? 'CONTINUAR codigo.demo' : null,
    });
    throw new Error(`Ruta inesperada: ${ruta}`);
  };
  const cliente = new ClienteReal({ demo, fetch: peticion, fabricaSocket: () => new SocketFalso() });
  return { id, hiloId, oferta, comandos, rutasConsultadas, cliente, usuario: montarWeb(cliente) };
}

function montarWeb(cliente: ClienteApi) {
  const router = createMemoryRouter(rutas, { initialEntries: ['/web'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return userEvent.setup({ delay: null });
}

async function abrirCotizacion() {
  const vista = abrirWeb();
  await vista.usuario.click(screen.getByRole('button', { name: '¿Aún no tienes cita? Cotiza un estudio' }));
  const cotizar = await screen.findByRole('button', { name: 'Cotizar Ultrasonido abdominal en Bahía de Banderas · $258.50' });
  return { ...vista, cotizar };
}

const telefono = '5210000000001';

it('cotiza con el teléfono y genera una sola continuación aunque se pulse dos veces', async () => {
  const { id, hiloId, oferta, comandos, usuario, cotizar } = await abrirCotizacion();
  await usuario.type(screen.getByRole('textbox', { name: 'Teléfono' }), telefono);
  await usuario.dblClick(cotizar);
  const continuar = await screen.findByRole('button', { name: 'Continuar en WhatsApp' });
  expect(screen.getByText('$258.50')).toBeTruthy();
  await usuario.dblClick(continuar);
  const enlace = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
  expect(enlace.getAttribute('href')).toBe('/wa?continuar=codigo.demo');
  expect(screen.getByText('CONTINUAR codigo.demo')).toBeTruthy();
  expect(await screen.findByRole('img', { name: 'Código QR de continuación' })).toBeTruthy();
  expect(comandos).toEqual([
    { tipo: 'IniciarTramite', canal: 'web', actor: 'paciente', payload: { tipoTramite: 'AGENDAR', contacto: telefono } },
    { tipo: 'SeleccionarServicio', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { servicioId: oferta.servicioId } },
    { tipo: 'SeleccionarSede', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { sedeId: oferta.sedeId } },
    { tipo: 'SolicitarContinuacion', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { destino: 'whatsapp' } },
  ]);
});

it.each(['', '123456789', '1234567890123456', '521 0000000001'])('no cotiza con el teléfono inválido %j', async valor => {
  const { comandos, usuario, cotizar } = await abrirCotizacion();
  if (valor) await usuario.type(screen.getByRole('textbox', { name: 'Teléfono' }), valor);
  await usuario.click(cotizar);
  expect(cotizar.hasAttribute('disabled')).toBe(true);
  expect(screen.getByText(/10 a 15 dígitos/)).toBeTruthy();
  expect(comandos).toEqual([]);
});

const boton = (name: string) => screen.getByRole('button', { name });

it.each(['', '123456789', '1234567890123456', '521 0000000001'])('no consulta citas con el teléfono inválido %j', async valor => {
  const { usuario, rutasConsultadas } = abrirWeb();
  if (valor) await usuario.type(screen.getByLabelText('Teléfono'), valor);
  await usuario.click(boton('Ver citas'));
  expect(boton('Ver citas').hasAttribute('disabled')).toBe(true);
  expect(rutasConsultadas).toEqual([]);
});

async function verCitas(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Teléfono'), telefono);
  await usuario.click(boton('Ver citas'));
}

it.each([
  ['clic', null],
  ['Enter', '{Enter}'],
  ['Espacio', '[Space]'],
] as const)('registra por %s un pago con CoDi que persiste al reabrir la web', async (_, tecla) => {
  const { usuario, cliente, comandos } = abrirWeb();
  await verCitas(usuario);
  const cita = await screen.findByRole('region', { name: 'Ultrasonido abdominal' });
  expect(within(cita).getByText('Bahía de Banderas')).toBeTruthy();
  expect(await within(cita).findByText('$258.50')).toBeTruthy();
  expect(within(cita).getByText(/8:05/)).toBeTruthy();
  expect(screen.getByText('•••• 0001')).toBeTruthy();
  expect(screen.queryByText('Estudio cancelado')).toBeNull();

  await usuario.click(boton('Pagar con CoDi'));
  expect(await within(boton('Simular pago con CoDi')).findByRole('img', { name: 'Código QR de CoDi' })).toBeTruthy();
  expect(screen.getByText('Escanea con tu app bancaria (simulación)')).toBeTruthy();
  await usuario.click(boton('Volver'));
  expect(screen.queryByRole('button', { name: 'Simular pago con CoDi' })).toBeNull();
  expect(screen.queryByText('Pago simulado registrado')).toBeNull();
  expect(screen.queryByText('Pagada')).toBeNull();
  expect(sessionStorage.length).toBe(0);
  await usuario.click(boton('Pagar con CoDi'));
  const qr = boton('Simular pago con CoDi');
  expect(qr.tabIndex).toBe(0);
  if (tecla === null) {
    await usuario.click(qr);
  } else {
    qr.focus();
    await usuario.keyboard(tecla);
  }
  expect(screen.getByText('Pago simulado registrado')).toBeTruthy();
  expect(screen.getByText(/Folio de pago: SIM-/).textContent).not.toContain('12345678');
  expect(screen.getByText('Simulación: no se realiza ningún cobro')).toBeTruthy();
  expect(comandos).toEqual([]);

  await usuario.click(boton('Volver'));
  expect(screen.getByRole('heading', { name: 'Pago con CoDi' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Simular pago con CoDi' })).toBeNull();
  await usuario.click(boton('Volver'));
  expect(screen.getByText('Pagada')).toBeTruthy();
  await usuario.click(boton('Volver'));
  expect(screen.getByLabelText<HTMLInputElement>('Teléfono').value).toBe(telefono);

  cleanup();
  await verCitas(montarWeb(cliente));
  expect(await screen.findByText('Pagada')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Pagar con CoDi' })).toBeNull();
});

it.each([{ conPaciente: false }, { demo: false }])('ofrece otros canales cuando no hay contexto de demo %j', async opciones => {
  const { usuario, rutasConsultadas } = abrirWeb(opciones);
  await verCitas(usuario);
  expect(await screen.findByText('No encontramos citas pendientes')).toBeTruthy();
  const contenido = within(screen.getByRole('main'));
  expect(contenido.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe('/wa');
  expect(contenido.getByRole('link', { name: 'Call Center' }).getAttribute('href')).toBe('/callcenter');
  expect(rutasConsultadas).toEqual(opciones.demo === false ? [] : ['/api/demo/contexto']);
});

it('permite volver de la cotización a los servicios y al pago', async () => {
  const { usuario, cotizar } = await abrirCotizacion();
  await usuario.type(screen.getByRole('textbox', { name: 'Teléfono' }), telefono);
  await usuario.click(cotizar);
  await screen.findByRole('heading', { name: 'Tu cotización' });
  await usuario.click(boton('Volver'));
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Teléfono' }).value).toBe(telefono);
  await usuario.click(boton('Volver'));
  expect(screen.getByRole('heading', { name: 'Paga tu cita' })).toBeTruthy();
});

it('conserva la cotización del modo simulado', async () => {
  montarWeb(new ClienteMock({ latenciaMs: 0 }));
  expect(await screen.findByRole('heading', { name: 'Tu cotización' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Paga tu cita' })).toBeNull();
});
