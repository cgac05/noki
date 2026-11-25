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
import '../pruebas/dialogo.ts';
import { rutas } from '../rutas.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn().mockResolvedValue('<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>') } }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });

function abrir(ruta = '/callcenter', cliente: ClienteApi = new ClienteMock({ latenciaMs: 0 })) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return { cliente, router, usuario: userEvent.setup() };
}

async function confirmarGuion(cliente: ClienteApi) {
  for (const paso of GUION_FLUJO_A.slice(1)) {
    if (paso.espera!.tipo === 'comando') await cliente.enviarComando(paso.espera!.comando);
    else if (paso.espera!.tipo === 'comandos') { for (const comando of paso.espera!.comandos) await cliente.enviarComando(comando); }
    else await cliente.enviarMensajeWa(paso.espera!.mensaje);
    if (paso.paso.id === 'CONFIRMADA') break;
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

  it('Flow protegido: ofrece abrir el formulario sin repetir valores iniciales', () => {
    render(<MensajeBot mensaje={{ tipo: 'flow', titulo: 'Verificación', campos: [{ id: 'secreto', etiqueta: 'Dato protegido', captura: 'sensitive', valorInicial: 'no revelar' }] }} onElegir={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Abrir formulario' })).toBeDefined();
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
  it('muestra los campos ausentes de la ficha del Call Center sin inventar datos', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const consultar = cliente.consultar.bind(cliente);
    vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => {
      const dato = await consultar(nombre, parametros);
      return nombre === 'fichaHilo' ? { ...dato, nombrePila: null, telefonoEnmascarado: null } : dato;
    });

    abrir('/callcenter', cliente);

    const ficha = await screen.findByRole('region', { name: 'Ficha del hilo' });
    expect(within(ficha).getAllByText('—')).toHaveLength(2);
    expect(within(ficha).queryByText('Ana')).toBeNull();
    expect(within(ficha).queryByText('•••• 0001')).toBeNull();
  });
  it('Registrar llegada desde la cita: copia el token elegido y el canal clinica, sin un comando en la lectura', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await confirmarGuion(cliente);
    const llegada = structuredClone(GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.llegadasSede[0]!);
    llegada.cita.tokenQr = 'demo.qr.cita-elegida.token-distinto';
    llegada.cita.tramite.id = '019aff00-0000-7000-8000-000000000012';
    expect(llegada).not.toHaveProperty('accion');
    const consultar = cliente.consultar.bind(cliente);
    vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => {
      const dato = await consultar(nombre, parametros);
      return nombre === 'llegadasSede' ? [llegada] as typeof dato : dato;
    });
    const enviar = vi.spyOn(cliente, 'enviarComando').mockResolvedValue(GUION_FLUJO_A.find(paso => paso.paso.id === 'EN_CLINICA')!.respuesta);
    const { usuario } = abrir('/clinica', cliente);
    await usuario.click(await screen.findByRole('button', { name: 'Registrar llegada' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledExactlyOnceWith({
      canal: 'clinica', actor: 'recepcion:tepic', tipo: 'RegistrarLlegada', tramiteId: llegada.cita.tramite.id,
      payload: { token: llegada.cita.tokenQr },
    }, { idempotencyKey: expect.any(String) }));
  });

  it('Selección de catálogo en call center: copia los IDs de otra oferta y envía servicio antes de sede', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: '5210000000001' } });
    const oferta = { servicioId: '019aff00-0000-7000-8000-000000000013', servicio: 'Otra oferta ficticia', sedeId: '019aff00-0000-7000-8000-000000000014', sede: 'Compostela', precioCentavos: 30000 };
    const consultar = cliente.consultar.bind(cliente);
    vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => {
      const dato = await consultar(nombre, parametros);
      return nombre === 'catalogo' ? [oferta] as typeof dato : dato;
    });
    const enviar = vi.spyOn(cliente, 'enviarComando').mockResolvedValue(GUION_FLUJO_A[2]!.respuesta);
    const { usuario } = abrir('/callcenter', cliente);
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar Otra oferta ficticia en Compostela · $300.00' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(enviar.mock.calls.map(([comando]) => comando)).toEqual([
      { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarServicio', tramiteId: IDS.tramite, payload: { servicioId: oferta.servicioId } },
      { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarSede', tramiteId: IDS.tramite, payload: { sedeId: oferta.sedeId } },
    ]);
    expect(enviar.mock.calls[0]![1]?.idempotencyKey).not.toBe(enviar.mock.calls[1]![1]?.idempotencyKey);
  });

  it('reintenta solo la sede pendiente y conserva su clave después de seleccionar el servicio', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: '5210000000001' } });
    const original = cliente.enviarComando.bind(cliente);
    let falloPendiente = true;
    const enviar = vi.spyOn(cliente, 'enviarComando').mockImplementation(async (comando, opciones) => {
      if (comando.tipo === 'SeleccionarSede' && falloPendiente) {
        falloPendiente = false;
        throw new ErrorCliente('RED', 'Fallo de red simulado al elegir sede');
      }
      return original(comando, opciones);
    });
    const { usuario } = abrir('/callcenter', cliente);
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' }));
    await usuario.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Continuar por WhatsApp' })).toBeDefined();
    expect(enviar.mock.calls.map(([comando]) => comando.tipo)).toEqual(['SeleccionarServicio', 'SeleccionarSede', 'SeleccionarSede']);
    expect(enviar.mock.calls[1]![1]?.idempotencyKey).toBe(enviar.mock.calls[2]![1]?.idempotencyKey);
  });
  it('Ficha del call center: muestra teléfono enmascarado y datos públicos', async () => {
    const { usuario } = abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Llamada entrante' }));
    expect(await screen.findByText('•••• 0001')).toBeDefined();
    expect(screen.getByText('Ana')).toBeDefined();
    expect(document.body.textContent).not.toMatch(/5210000000001|fecha de nacimiento|246810/);
    expect(await screen.findByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' })).toBeDefined();
  });

  it('recorre Call Center → WhatsApp → App → Clínica y conserva el paso entre canales', async () => {
    const { cliente } = abrir();
    // Este recorrido verifica respuestas y navegación, sin pausas artificiales entre teclas.
    const usuario = userEvent.setup({ delay: null });
    await usuario.click(await screen.findByRole('button', { name: 'Llamada entrante' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' }));
    const consentimiento = await screen.findByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' });
    await waitFor(() => expect((consentimiento as HTMLInputElement).disabled).toBe(false));
    await usuario.click(consentimiento);
    await usuario.click(await screen.findByRole('button', { name: 'Continuar por WhatsApp' }));
    await usuario.click(await screen.findByRole('link', { name: 'Abrir WhatsApp' }));
    expect(await screen.findByText(/Retomamos en el horario/)).toBeDefined();
    expect(screen.getByText('CONTINUAR ••••', { exact: true })).toBeDefined();
    await usuario.click(await screen.findByRole('button', { name: 'Ver horarios' }));
    await usuario.click(await screen.findByRole('button', { name: 'Ver opciones' }));
    await usuario.click(await screen.findByRole('button', { name: 'Jueves 26 · 09:15' }));
    await usuario.click(await screen.findByRole('button', { name: 'Revisar cita' }));
    await usuario.click(await screen.findByRole('button', { name: 'Para mí' }));
    await usuario.click((await screen.findAllByRole('button', { name: 'Ver opciones' })).find(boton => !(boton as HTMLButtonElement).disabled)!);
    await usuario.click(await screen.findByRole('button', { name: 'Soy Ana P.' }));
    await usuario.click(await screen.findByRole('button', { name: 'Abrir formulario' }));
    await usuario.type(screen.getByLabelText('Fecha de nacimiento', { exact: true, selector: 'input' }), '2000-01-02');
    await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.textContent).not.toContain('2000-01-02');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('2000-01-02');
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
    expect(screen.getByText('Turno 1')).toBeDefined();
    await usuario.click(screen.getByRole('button', { name: 'Cerrar atención' }));
    await waitFor(() => expect(cliente.demo?.paso().id).toBe('ATENDIDA'));
    expect(await screen.findByText(/Aún no hay llegadas esperadas/)).toBeDefined();
    expect(screen.getByText(new RegExp('Paso ' + GUION_FLUJO_A.length + ' de ' + GUION_FLUJO_A.length)).textContent).toContain('Atención cerrada');
    await usuario.click(screen.getByRole('link', { name: 'Admin' }));
    expect(await screen.findByRole('heading', { name: 'Línea de tiempo' })).toBeDefined();
    const linea = screen.getByRole('list', { name: 'Eventos del hilo' });
    const filas = within(linea).getAllByRole('listitem');
    expect(filas.at(-1)?.textContent).toContain('AtencionCerrada');
    expect(await screen.findByText('Sin alertas de seguridad')).toBeDefined();
    expect(linea.textContent).toContain('CanalCambiado');
    expect(linea.textContent).toContain('DestinatarioDeclarado');
    expect(linea.textContent).toContain('IdentidadComprobada');
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
      if (nombre === 'citasPaciente' && Array.isArray(dato)) {
        return [{ ...GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.citasPaciente[0]!, tramite: { ...GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.respuesta.tramite, estado: 'EN_CLINICA' } }] as typeof dato;
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
    expect(await screen.findByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' })).toBeDefined();
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
