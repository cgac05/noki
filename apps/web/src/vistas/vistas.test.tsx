import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import { ErrorCliente } from '../cliente/errores.ts';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { MensajeBot, EntradaPregunta } from '../componentes/MensajeBot.tsx';
import { rutas } from '../rutas.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn().mockResolvedValue('<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>') } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function abrir(ruta = '/callcenter', cliente: ClienteApi = new ClienteMock({ latenciaMs: 0 })) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return { cliente, router, usuario: userEvent.setup() };
}

async function confirmarGuion(cliente: ClienteApi) {
  for (const paso of GUION_FLUJO_A.slice(1, 8)) {
    if (paso.espera!.tipo === 'comando') await cliente.enviarComando(paso.espera!.comando);
    else await cliente.enviarMensajeWa(paso.espera!.mensaje);
  }
}

describe('Mensajes y siguiente pregunta', () => {
  it('Mensaje de lista: presenta secciones y envía el payload sin interpretarlo', async () => {
    const elegir = vi.fn();
    const usuario = userEvent.setup();
    render(<MensajeBot mensaje={{ tipo: 'lista', texto: 'Elige horario', secciones: [
      { titulo: 'Mañana', filas: [{ id: 'a', titulo: '09:15', payload: 'opaco:a' }] },
      { titulo: 'Tarde', filas: [{ id: 'b', titulo: '12:15', payload: 'opaco:b' }] },
    ] }} onElegir={elegir} />);
    expect(screen.getByRole('heading', { name: 'Mañana' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Tarde' })).toBeDefined();
    await usuario.click(screen.getByRole('button', { name: '12:15' }));
    expect(elegir).toHaveBeenCalledWith('opaco:b');
  });

  it('Flow fuera de alcance: no captura ni repite valores de los campos', () => {
    render(<MensajeBot mensaje={{ tipo: 'flow', titulo: 'Verificación', campos: [{ id: 'secreto', etiqueta: 'Dato protegido', captura: 'sensitive', valorInicial: 'no revelar' }] }} onElegir={vi.fn()} />);
    expect(screen.getByText(/simulador de WhatsApp/)).toBeDefined();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('no revelar')).toBeNull();
  });

  it('Interfaz guiada por la siguiente pregunta: exactamente tres opciones y su payload', async () => {
    const elegir = vi.fn();
    const usuario = userEvent.setup();
    render(<EntradaPregunta pregunta={{ tipo: 'PREGUNTA', casilla: 'horario', pista: { entrada: 'BOTONES', opciones: [
      { id: 'a', titulo: 'Uno', payload: '1' }, { id: 'b', titulo: 'Dos', payload: '2' }, { id: 'c', titulo: 'Tres', payload: '3' },
    ] } }} onElegir={elegir} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    await usuario.click(screen.getByRole('button', { name: 'Dos' }));
    expect(elegir).toHaveBeenCalledWith('2');
  });
});

describe('Vistas del guion', () => {
  it('Ficha del call center: muestra teléfono enmascarado y datos públicos', async () => {
    const { usuario } = abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Llamada entrante' }));
    expect(await screen.findByText('•••• 0001')).toBeDefined();
    expect(screen.getByText('Ana')).toBeDefined();
    expect(document.body.textContent).not.toMatch(/5210000000001|fecha de nacimiento|246810/);
    expect(await screen.findByRole('button', { name: 'Cotizar paquete en Tepic' })).toBeDefined();
  });

  it('recorre Call Center → WhatsApp → App → Clínica y conserva el paso entre canales', async () => {
    const { usuario, cliente } = abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Llamada entrante' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar paquete en Tepic' }));
    await usuario.click(await screen.findByRole('button', { name: 'Continuar por WhatsApp' }));
    await usuario.click(screen.getByRole('link', { name: 'WhatsApp' }));
    expect(await screen.findByText(/Retomamos en el horario/)).toBeDefined();
    await usuario.click(await screen.findByRole('button', { name: 'Ver horarios' }));
    await usuario.click(await screen.findByRole('button', { name: 'Jueves 26 · 09:15' }));
    await usuario.click(await screen.findByRole('button', { name: 'Revisar cita' }));
    expect(await screen.findByText(/simulador de WhatsApp/)).toBeDefined();
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar cita' }));
    await usuario.click(screen.getByRole('link', { name: 'App' }));
    expect(await screen.findByText('CONFIRMADA')).toBeDefined();
    expect(await screen.findByRole('img', { name: 'Código QR de la cita' })).toBeDefined();
    expect(QRCode.toString).toHaveBeenLastCalledWith(IDS.tokenQr, expect.objectContaining({ type: 'svg' }));
    expect(document.body.textContent).not.toContain('246810');
    await usuario.click(screen.getByRole('link', { name: 'Clínica' }));
    await usuario.click(await screen.findByRole('button', { name: 'Registrar llegada' }));
    expect(await screen.findByText('Llegada registrada')).toBeDefined();
    expect(cliente.demo?.paso().id).toBe('EN_CLINICA');
    expect(screen.getByText(/Paso 9 de 9/).textContent).toContain('Llegada registrada · Clínica');
    await usuario.click(screen.getByRole('link', { name: 'Admin' }));
    expect(await screen.findByRole('heading', { name: 'Línea de tiempo' })).toBeDefined();
    const linea = screen.getByRole('list', { name: 'Eventos del hilo' });
    const filas = within(linea).getAllByRole('listitem');
    expect(filas.at(-1)?.textContent).toContain('PacienteLlego');
    expect(linea.textContent).toContain('CanalCambiado');
    for (const canal of ['Call Center', 'WhatsApp', 'App', 'Clínica']) expect(linea.textContent).toContain(canal);
    await usuario.click(screen.getByRole('button', { name: 'Reiniciar guion' }));
    await waitFor(() => expect(cliente.demo?.paso().id).toBe('INICIO'));
    await usuario.click(screen.getByRole('link', { name: 'App' }));
    expect(await screen.findByText('Aún no hay citas para mostrar.')).toBeDefined();
    expect(screen.queryByRole('img', { name: 'Código QR de la cita' })).toBeNull();
  });

  it('Estado desde el cliente y QR con token, no con folio', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await confirmarGuion(cliente);
    const consultar = cliente.consultar.bind(cliente);
    vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => {
      const dato = await consultar(nombre, parametros);
      if (nombre === 'citas' && Array.isArray(dato)) {
        return [{ ...GUION_FLUJO_A[7]!.lecturas.citas[0]!, tramite: { ...GUION_FLUJO_A[7]!.respuesta.tramite, estado: 'EN_CLINICA' } }] as typeof dato;
      }
      return dato;
    });
    abrir('/app', cliente);
    expect(await screen.findByText('EN_CLINICA')).toBeDefined();
    expect(await screen.findByRole('img', { name: 'Código QR de la cita' })).toBeDefined();
    expect(QRCode.toString).toHaveBeenCalledWith(IDS.tokenQr, expect.objectContaining({ type: 'svg' }));
    expect(screen.queryByText(/folio/i)).toBeNull();
    expect(await screen.findByText(/09:15/)).toBeDefined();
    expect(screen.getByText(/America\/Mazatlan/)).toBeDefined();
  });

  it('la web muestra cotización y código de continuación sin cambiar el Flujo A', async () => {
    const { usuario, cliente } = abrir('/web');
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar en Tepic' }));
    expect(await screen.findByText('$250.00')).toBeDefined();
    await usuario.click(await screen.findByRole('button', { name: 'Continuar en WhatsApp' }));
    expect(screen.getByText('CONTINUAR demo.web.continuacion-opaca')).toBeDefined();
    expect(cliente.demo?.paso().id).toBe('INICIO');
  });

  it('solo la bandeja de demo muestra el OTP simulado', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await confirmarGuion(cliente);
    abrir('/bandeja', cliente);
    expect(await screen.findByText(/Código ficticio: 246810/)).toBeDefined();
    expect(screen.getByText('SMS')).toBeDefined();
    expect(screen.getByText('Correo')).toBeDefined();
  });

  it('permite escribir texto fuera del guion y muestra ayuda sin avanzar', async () => {
    const { usuario, cliente } = abrir('/wa');
    await usuario.type(await screen.findByRole('textbox', { name: 'Mensaje' }), 'otra cosa');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Abre Call Center y pulsa Llamada entrante para comenzar.')).toBeDefined();
    expect(cliente.demo?.paso().id).toBe('INICIO');
  });

  it('el reintento de una acción desde la vista conserva la clave de idempotencia', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const original = cliente.enviarComando.bind(cliente);
    const enviar = vi.spyOn(cliente, 'enviarComando').mockRejectedValueOnce(new ErrorCliente('RED', 'Fallo de red simulado')).mockImplementation(original);
    const { usuario } = abrir('/callcenter', cliente);
    await usuario.click(await screen.findByRole('button', { name: 'Llamada entrante' }));
    await usuario.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Cotizar paquete en Tepic' })).toBeDefined();
    expect(enviar.mock.calls[0]![1]?.idempotencyKey).toBeTruthy();
    expect(enviar.mock.calls[1]![1]?.idempotencyKey).toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  });

  it('Estados de carga y error: explica el fallo sin mostrar detalles internos', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    let fallar: (error: unknown) => void = () => {};
    vi.spyOn(cliente, 'consultar').mockImplementation(() => new Promise((_resolver, rechazar) => { fallar = rechazar; }));
    abrir('/callcenter', cliente);
    expect(screen.getByText('Cargando información…').getAttribute('role')).toBe('status');
    await act(async () => { fallar(new ErrorCliente('RED', 'No pudimos conectar con la API.')); });
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('No pudimos conectar'));
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
    expect(document.body.textContent).not.toContain('ErrorCliente');
  });
});
