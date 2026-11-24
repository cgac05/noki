import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import type { MensajeBot, RespuestaMensajeWa } from '@noki/contracts';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { rutas } from '../rutas.tsx';
import '../pruebas/dialogo.ts';

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
function abrir(cliente: ClienteApi = new ClienteMock({ latenciaMs: 0 }), ruta = '/wa') {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const vista = render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return { ...vista, router, usuario: userEvent.setup() };
}
function respuestas(mensajes: MensajeBot[]) {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  const enviar = vi.spyOn(cliente, 'enviarMensajeWa').mockResolvedValue({ mensajes });
  return { cliente, enviar };
}
async function texto(usuario: ReturnType<typeof userEvent.setup>, valor = 'Hola') {
  await usuario.type(screen.getByRole('textbox', { name: 'Mensaje' }), valor);
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
}

it('Historial acumulado: muestra cuatro burbujas en orden en un log accesible', async () => {
  const { cliente } = respuestas([{ tipo: 'texto', texto: 'Respuesta del bot' }]); const { usuario } = abrir(cliente);
  await texto(usuario, 'Uno'); await texto(usuario, 'Dos');
  const log = screen.getByRole('log');
  await waitFor(() => expect(within(log).getAllByText('Respuesta del bot')).toHaveLength(2));
  expect(log.textContent).toMatch(/Uno.*Respuesta del bot.*Dos.*Respuesta del bot/);
  expect(log.getAttribute('aria-live')).toBe('polite');
});

it('Cambio de vista y recarga: conserva la sesión y Nueva conversación borra solo el número activo', async () => {
  const { cliente } = respuestas([{ tipo: 'texto', texto: 'Respuesta conservada' }]);
  const vista = abrir(cliente); await texto(vista.usuario);
  await screen.findByText('Respuesta conservada');
  await act(async () => { await vista.router.navigate('/app'); await vista.router.navigate('/wa'); });
  expect(screen.getByText('Respuesta conservada')).toBeDefined(); vista.unmount();
  const nueva = abrir(cliente); expect(await screen.findByText('Respuesta conservada')).toBeDefined();
  await nueva.usuario.clear(screen.getByLabelText('Número de WhatsApp'));
  await nueva.usuario.type(screen.getByLabelText('Número de WhatsApp'), '5210000000002');
  expect(screen.queryByText('Respuesta conservada')).toBeNull();
  await nueva.usuario.clear(screen.getByLabelText('Número de WhatsApp')); await nueva.usuario.type(screen.getByLabelText('Número de WhatsApp'), CONTACTO_DEMO);
  expect(screen.getByText('Respuesta conservada')).toBeDefined();
  await nueva.usuario.click(screen.getByRole('button', { name: 'Nueva conversación' }));
  expect(screen.queryByText('Respuesta conservada')).toBeNull(); expect(sessionStorage.getItem(`noki:wa:${CONTACTO_DEMO}`)).toBeNull();
});

it('Modo real: conversa solo con POST y no muestra la insignia simulada', async () => {
  const peticion = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ mensajes: [{ tipo: 'texto', texto: 'Respuesta real de prueba' }] }));
  const { usuario } = abrir(new ClienteReal({ fetch: peticion })); await texto(usuario);
  expect(await screen.findByText('Respuesta real de prueba')).toBeDefined(); expect(peticion).toHaveBeenCalledTimes(1);
  expect(peticion.mock.calls[0]![0]).toBe('http://localhost:4000/api/canales/wa/mensajes');
  expect(screen.queryByText('Modo simulado')).toBeNull();
});

it('Número inválido: explica el patrón de 10 a 15 dígitos e impide el envío', async () => {
  const { cliente, enviar } = respuestas([]); const { usuario } = abrir(cliente);
  const numero = screen.getByLabelText('Número de WhatsApp'); expect(numero.getAttribute('inputmode')).toBe('numeric');
  await usuario.clear(numero); await usuario.type(numero, '12345'); await usuario.type(screen.getByLabelText('Mensaje'), 'Hola');
  expect(screen.getByText(/10 a 15 dígitos/)).toBeDefined(); expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true);
  expect(enviar).not.toHaveBeenCalled();
});

it('Doble toque e indicador de espera: la misma opción se envía una sola vez', async () => {
  const { cliente, enviar } = respuestas([{ tipo: 'botones', texto: 'Elige', botones: [{ id: 'uno', titulo: 'Elegir uno', payload: 'opaco:uno' }] }]);
  const { usuario } = abrir(cliente); await texto(usuario);
  let resolver!: (valor: RespuestaMensajeWa) => void;
  enviar.mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
  const boton = await screen.findByRole('button', { name: 'Elegir uno' });
  act(() => { fireEvent.click(boton); fireEvent.click(boton); });
  expect(enviar).toHaveBeenCalledTimes(2); expect(screen.getByText('escribiendo…')).toBeDefined();
  expect((screen.getByLabelText('Mensaje') as HTMLInputElement).disabled).toBe(true);
  await act(async () => { resolver({ mensajes: [{ tipo: 'texto', texto: 'Elegido' }] }); });
  expect(screen.queryByText('escribiendo…')).toBeNull();
});

it('Elegir una fila: abre las dos secciones, envía su payload y guarda el título', async () => {
  const { cliente, enviar } = respuestas([{ tipo: 'lista', texto: 'Horarios disponibles', secciones: [
    { titulo: 'Mañana', filas: [{ id: 'a', titulo: '09:15', payload: 'opaco:a' }] },
    { titulo: 'Tarde', filas: [{ id: 'b', titulo: '12:15', payload: 'opaco:b' }] },
  ] }]);
  const { usuario } = abrir(cliente); await texto(usuario); enviar.mockResolvedValue({ mensajes: [{ tipo: 'texto', texto: 'Horario elegido' }] });
  await usuario.click(await screen.findByRole('button', { name: /Ver opciones/ }));
  const hoja = screen.getByRole('dialog', { name: 'Horarios disponibles' });
  expect(within(hoja).getByRole('heading', { name: 'Mañana' })).toBeDefined(); expect(within(hoja).getByRole('heading', { name: 'Tarde' })).toBeDefined();
  await usuario.click(within(hoja).getByRole('button', { name: '12:15' }));
  expect(await screen.findByText('Horario elegido')).toBeDefined(); expect(screen.queryByRole('dialog')).toBeNull();
  expect(within(screen.getByRole('log')).getByText('12:15')).toBeDefined();
  expect(enviar).toHaveBeenLastCalledWith({ waId: CONTACTO_DEMO, payloadBoton: 'opaco:b' }, { idempotencyKey: expect.any(String) });
});

it('Opciones de mensajes anteriores: no reutiliza botones después de otra respuesta del bot', async () => {
  const { cliente, enviar } = respuestas([{ tipo: 'botones', texto: 'Elige', botones: [{ id: 'uno', titulo: 'Elegir uno', payload: 'uno' }] }]);
  const { usuario } = abrir(cliente); await texto(usuario); enviar.mockResolvedValue({ mensajes: [{ tipo: 'texto', texto: 'Respuesta posterior' }] });
  await texto(usuario, 'Otra cosa'); await screen.findByText('Respuesta posterior');
  expect((screen.getByRole('button', { name: 'Elegir uno' }) as HTMLButtonElement).disabled).toBe(true);
});

it('Enlace del call center: envía una vez, retira el código de la URL y lo redacta', async () => {
  const { cliente, enviar } = respuestas([{ tipo: 'texto', texto: 'Continuación recibida' }]);
  const { router } = abrir(cliente, '/wa?continuar=codigo-ficticio-protegido');
  expect(await screen.findByText('Continuación recibida')).toBeDefined();
  expect(enviar).toHaveBeenCalledExactlyOnceWith({ waId: CONTACTO_DEMO, texto: 'CONTINUAR codigo-ficticio-protegido' }, { idempotencyKey: expect.any(String) });
  expect(router.state.location.search).toBe(''); expect(screen.getByText('CONTINUAR ••••')).toBeDefined();
  await act(async () => { await router.navigate('/app'); await router.navigate('/wa?continuar=codigo-ficticio-protegido'); });
  expect(enviar).toHaveBeenCalledTimes(1); expect(router.state.location.search).toBe('');
  expect(sessionStorage.getItem(`noki:wa:${CONTACTO_DEMO}`)).not.toContain('codigo-ficticio-protegido');
});

it('Código inválido: un parámetro vacío no envía nada', async () => {
  const { cliente, enviar } = respuestas([]); abrir(cliente, '/wa?continuar=');
  expect(screen.getByLabelText('Mensaje')).toBeDefined(); expect(enviar).not.toHaveBeenCalled();
});

it('Call center solicita continuación con consentimiento y muestra enlace y QR de la lectura', async () => {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  for (const paso of GUION_FLUJO_A.slice(1, 3)) {
    if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
    else if (paso.espera?.tipo === 'comandos') for (const comando of paso.espera.comandos) await cliente.enviarComando(comando);
  }
  const enviar = vi.spyOn(cliente, 'enviarMensajeWa'); const { usuario } = abrir(cliente, '/callcenter');
  await usuario.click(await screen.findByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' }));
  await usuario.click(await screen.findByRole('button', { name: 'Continuar por WhatsApp' }));
  expect((await screen.findByRole('link', { name: 'Abrir WhatsApp' })).getAttribute('href')).toBe(`/wa?continuar=${IDS.tokenContinuacion}`);
  expect(await screen.findByRole('img', { name: 'Código QR de continuación' })).toBeDefined();
  expect(enviar).not.toHaveBeenCalled(); expect(cliente.demo.paso().id).toBe('CONTINUACION_SOLICITADA');
});

it('Modo simulado: la insignia es visible en cualquier ruta', async () => {
  const { router } = abrir();
  for (const ruta of ['/web', '/wa', '/app', '/callcenter', '/clinica', '/admin', '/bandeja']) {
    await act(async () => { await router.navigate(ruta); }); expect(screen.getByText('Modo simulado')).toBeDefined();
  }
});
