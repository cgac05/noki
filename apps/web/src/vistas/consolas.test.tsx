import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import { ComandoRequestSchema } from '@noki/contracts';
import type { ContextoDemo } from '@noki/contracts';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente, useRespuestaComando } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { ErrorCliente } from '../cliente/errores.ts';
import { entrarSesionDemo } from '../pruebas/entrarSesionDemo.ts';
import { rutas } from '../rutas.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg></svg>') } }));
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
function CambiarHilo() {
  const { recordar } = useRespuestaComando();
  return <button onClick={() => recordar({ ...GUION_FLUJO_A[1]!.respuesta, tramite: { ...GUION_FLUJO_A[1]!.respuesta.tramite, hiloId: IDS.paciente } })}>Cambiar hilo de prueba</button>;
}
function abrir(cliente: ClienteApi, ruta = '/callcenter', cambiar = false) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const vista = render(<ProveedorCliente cliente={cliente}>{cambiar && <CambiarHilo />}<RouterProvider router={router} /></ProveedorCliente>);
  return { ...vista, router, usuario: userEvent.setup() };
}
async function avanzarHasta(cliente: ClienteMock, id: string) {
  for (const paso of GUION_FLUJO_A.slice(1)) {
    if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
    else if (paso.espera?.tipo === 'comandos') for (const comando of paso.espera.comandos) await cliente.enviarComando(comando);
    else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
    if (paso.paso.id === id) return;
  }
}

describe('Call center autorizado', () => {
  it('exige validar la fecha de nacimiento y la desmarca en la siguiente llamada', async () => {
    const pasos = GUION_FLUJO_A.map(paso => paso.paso.id === 'COTIZADO' ? {
      ...paso, lecturas: { ...paso.lecturas, fichaHilo: { ...paso.lecturas.fichaHilo,
        tramites: paso.lecturas.fichaHilo.tramites.map(tramite => ({ ...tramite, pacienteId: IDS.paciente })),
      } },
    } : paso);
    const original = new ClienteMock();
    const ids = original.demo.ids;
    const cliente = new ClienteMock({ latenciaMs: 0, guiones: {
      flujoA: { pasos, ids }, flujoC: { pasos, ids },
    } });
    await avanzarHasta(cliente, 'COTIZADO');
    const { usuario } = abrir(cliente);
    const llamar = async () => {
      await usuario.click(await screen.findByRole('button', { name: 'Volver a nueva llamada' }));
      await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
      await screen.findByText('01/01/1990');
      await screen.findByRole('button', { name: 'Nueva cita' });
    };
    await llamar();
    const casilla = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Validé la fecha de nacimiento con el cliente' });
    const acciones = ['Continuar con este estudio', 'Nueva cita', 'Completar la cita aquí']
      .map(name => screen.getByRole<HTMLButtonElement>('button', { name }));
    expect(acciones.every(boton => boton.disabled)).toBe(true);
    await usuario.click(casilla);
    expect(acciones.every(boton => !boton.disabled)).toBe(true);
    await llamar();
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Validé la fecha de nacimiento con el cliente' }).checked).toBe(false);
  });

  it.each(['Continuar con este estudio', 'Nueva cita'])('permite elegir %s al retomar', async opcion => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await avanzarHasta(cliente, 'COTIZADO');
    const enviar = vi.spyOn(cliente, 'enviarComando');
    const { usuario } = abrir(cliente);
    await usuario.click(await screen.findByRole('button', { name: 'Volver a nueva llamada' }));
    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    await screen.findByText('Este número tiene un estudio en proceso: Paquete US mamario + Papanicolaou en Tepic');
    expect(screen.queryByRole('checkbox', { name: /fecha de nacimiento/i })).toBeNull();
    const boton = screen.getByRole('button', { name: opcion });
    await waitFor(() => expect(boton).toHaveProperty('disabled', false));
    act(() => { fireEvent.click(boton); fireEvent.click(boton); });
    await waitFor(() => expect(screen.queryByRole('button', { name: opcion })).toBeNull());
    if (opcion === 'Nueva cita') {
      expect(enviar.mock.calls).toHaveLength(2);
      expect(enviar.mock.calls[1]?.[0]).toMatchObject({ tipo: 'IniciarTramite',
        payload: { contacto: CONTACTO_DEMO, nuevo: true } });
      await screen.findByText('BORRADOR');
      expect(screen.queryByRole('button', { name: 'Completar la cita aquí' })).toBeNull();
      const cotizar = screen.getByRole('button', { name: /^Cotizar Paquete/ });
      await usuario.click(cotizar);
      await screen.findByText('COTIZADO');
      const completar = await screen.findByRole('button', { name: 'Completar la cita aquí' });
      const tramiteId = (await enviar.mock.results[1]!.value).tramite.id;
      expect(tramiteId).not.toBe(IDS.tramite);
      expect(enviar.mock.calls.slice(2).map(([comando]) => [comando.tipo, comando.tramiteId])).toEqual([
        ['SeleccionarServicio', tramiteId], ['SeleccionarSede', tramiteId],
      ]);
      const mensaje = vi.spyOn(cliente, 'enviarMensajeWa');
      await usuario.click(completar);
      await waitFor(() => expect(mensaje).toHaveBeenCalledExactlyOnceWith({ waId: CONTACTO_DEMO, texto: 'Hola' }, expect.anything()));
    } else {
      expect(enviar.mock.calls).toHaveLength(1);
      expect(screen.getByText('COTIZADO')).toBeTruthy();
    }
  });

  it('completa la cita en la ficha usando el ANI de la llamada', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const enviarComando = cliente.enviarComando.bind(cliente);
    vi.spyOn(cliente, 'enviarComando').mockImplementation((comando, opciones) =>
      enviarComando(comando.tipo === 'IniciarTramite'
        ? { ...comando, payload: { ...comando.payload, contacto: CONTACTO_DEMO } }
        : comando, opciones));
    const enviar = vi.spyOn(cliente, 'enviarMensajeWa')
      .mockResolvedValueOnce({ mensajes: [{ tipo: 'texto', texto: '¿Qué día prefieres?' }] })
      .mockResolvedValueOnce({ mensajes: [{ tipo: 'botones', texto: 'Horario disponible', botones: [{ id: 'confirmar', titulo: 'Confirmar cita', payload: 'confirmar' }] }] })
      .mockResolvedValueOnce({ mensajes: [{ tipo: 'texto', texto: 'Cita confirmada' }] });
    const ani = '3119990003';
    const { usuario, router } = abrir(cliente);
    const campo = screen.getByLabelText('Número de la llamada (ANI)');
    await usuario.clear(campo);
    await usuario.type(campo, ani);
    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    const cotizar = await screen.findByRole('button', { name: /^Cotizar Paquete/ });
    expect(screen.queryByRole('button', { name: 'Nueva cita' })).toBeNull();
    await usuario.click(cotizar);
    await screen.findByText('COTIZADO');
    const ficha = within(screen.getByRole('region', { name: 'Ficha del hilo' }));
    await usuario.dblClick(ficha.getByRole('button', { name: 'Completar la cita aquí' }));
    expect(await ficha.findByText('¿Qué día prefieres?')).toBeTruthy();
    expect(enviar.mock.calls.map(([mensaje]) => mensaje)).toEqual([{ waId: ani, texto: 'Hola' }]);
    await usuario.type(ficha.getByRole('textbox', { name: 'Mensaje' }), 'Mañana');
    await usuario.click(ficha.getByRole('button', { name: 'Enviar' }));
    await usuario.click(await ficha.findByRole('button', { name: 'Confirmar cita' }));
    expect(await ficha.findByText('Cita confirmada')).toBeTruthy();
    expect(enviar.mock.calls.map(([mensaje]) => mensaje)).toEqual([
      { waId: ani, texto: 'Hola' }, { waId: ani, texto: 'Mañana' }, { waId: ani, payloadBoton: 'confirmar' },
    ]);
    expect(router.state.location.pathname).toBe('/callcenter');
    await usuario.click(screen.getByRole('button', { name: 'Volver a nueva llamada' }));
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).toBeNull();
  });

  it('no ofrece completar la cita en una ficha sin ANI de la pestaña', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await avanzarHasta(cliente, 'COTIZADO');
    const enviar = vi.spyOn(cliente, 'enviarMensajeWa');
    abrir(cliente);
    const ficha = within(await screen.findByRole('region', { name: 'Ficha del hilo' }));
    expect(ficha.getByText('COTIZADO')).toBeTruthy();
    expect(ficha.queryByRole('button', { name: 'Completar la cita aquí' })).toBeNull();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('incluye el número de la llamada en el enlace y el QR de continuación', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const enviarComando = cliente.enviarComando.bind(cliente);
    const enviar = vi.spyOn(cliente, 'enviarComando').mockImplementation((comando, opciones) =>
      enviarComando(comando.tipo === 'IniciarTramite'
        ? { ...comando, payload: { ...comando.payload, contacto: CONTACTO_DEMO } }
        : comando, opciones));
    const numero = '3110000000';
    const { usuario } = abrir(cliente);
    const campo = screen.getByLabelText('Número de la llamada (ANI)');
    await usuario.clear(campo);
    await usuario.type(campo, numero);
    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: numero },
    }), { idempotencyKey: expect.any(String) });
    await usuario.click(await screen.findByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar atención (llamada cortada)' }));
    const enlace = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    const ruta = `/wa?continuar=${IDS.tokenContinuacion}&numero=${numero}`;
    expect(enlace.getAttribute('href')).toBe(ruta);
    expect(await screen.findByRole('img', { name: 'Código QR de continuación' })).toBeDefined();
    expect(QRCode.toString).toHaveBeenCalledWith(new URL(ruta, location.origin).toString(), expect.objectContaining({ type: 'svg' }));
  });
  it('cierra la llamada sin marcar la casilla y solicita la continuación una sola vez', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await avanzarHasta(cliente, 'COTIZADO');
    const enviar = vi.spyOn(cliente, 'enviarComando');
    abrir(cliente);
    const boton = await screen.findByRole('button', { name: 'Cerrar atención (llamada cortada)' });
    act(() => { fireEvent.click(boton); fireEvent.click(boton); });
    expect(await screen.findByText('Llamada cerrada')).toBeDefined();
    expect(await screen.findByRole('link', { name: 'Abrir WhatsApp' })).toBeDefined();
    expect(enviar).toHaveBeenCalledExactlyOnceWith({
      canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SolicitarContinuacion',
      tramiteId: IDS.tramite, payload: { destino: 'whatsapp' },
    }, { idempotencyKey: expect.any(String) });
  });
  it('inicia con ANI de demo, valida el formato y descarta la captura al mostrar la ficha', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 }); const enviar = vi.spyOn(cliente, 'enviarComando');
    const { usuario } = abrir(cliente);
    const campo = screen.getByLabelText('Número de la llamada (ANI)') as HTMLInputElement;
    expect(campo.type).toBe('tel'); expect(campo.value).toBe(CONTACTO_DEMO);
    await usuario.clear(campo); await usuario.type(campo, '12345');
    expect((screen.getByRole('button', { name: 'Llamada entrante' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/10 a 15 dígitos/)).toBeDefined(); expect(enviar).not.toHaveBeenCalled();
    await usuario.clear(campo); await usuario.type(campo, CONTACTO_DEMO);
    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    expect(await screen.findByText('•••• 0001')).toBeDefined();
    expect(enviar).toHaveBeenCalledExactlyOnceWith({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: CONTACTO_DEMO } }, { idempotencyKey: expect.any(String) });
    expect(screen.queryByLabelText('Número de la llamada (ANI)')).toBeNull();
    expect(document.body.innerHTML).not.toContain(CONTACTO_DEMO);
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain(CONTACTO_DEMO);
  });
  it('vuelve al ANI sin enviar comandos y limpia el consentimiento y el error para otra llamada', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await avanzarHasta(cliente, 'COTIZADO');
    const enviar = vi.spyOn(cliente, 'enviarComando')
      .mockRejectedValueOnce(new ErrorCliente('RED', 'Fallo simulado de continuación'))
      .mockResolvedValueOnce(structuredClone(GUION_FLUJO_A[1]!.respuesta));
    const { usuario } = abrir(cliente);
    await usuario.click(await screen.findByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar por WhatsApp' }));
    await screen.findByRole('alert');

    await usuario.click(screen.getByRole('button', { name: 'Volver a nueva llamada' }));
    expect(screen.getByLabelText('Número de la llamada (ANI)')).toHaveProperty('value', CONTACTO_DEMO);
    expect(screen.queryByRole('region', { name: 'Ficha del hilo' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(enviar).toHaveBeenCalledTimes(1);

    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    expect(await screen.findByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' })).toHaveProperty('checked', false);
    expect(screen.getByRole('button', { name: 'Continuar por WhatsApp' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(enviar).toHaveBeenCalledTimes(2);
  });
  it('tolera nulos y deshabilita todas las operaciones en solo lectura', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 }); await avanzarHasta(cliente, 'LLAMADA_ENTRANTE');
    const original = cliente.consultar.bind(cliente);
    vi.spyOn(cliente, 'consultar').mockImplementation(async (nombre, parametros) => {
      const dato = await original(nombre, parametros);
      return nombre === 'fichaHilo' ? { ...dato, nombrePila: null, telefonoEnmascarado: null, soloLectura: true } : dato;
    });
    abrir(cliente); const ficha = await screen.findByRole('region', { name: 'Ficha del hilo' });
    expect(within(ficha).getAllByText('—')).toHaveLength(2);
    expect(within(ficha).getByText(/solo lectura/)).toBeDefined();
    expect((screen.getByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Tepic · $250.00' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Continuar por WhatsApp' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });
  it('exige consentimiento, envía una sola solicitud con doble clic y muestra el código de la lectura', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 }); await avanzarHasta(cliente, 'COTIZADO');
    const enviar = vi.spyOn(cliente, 'enviarComando'); const { usuario } = abrir(cliente);
    const boton = await screen.findByRole('button', { name: 'Continuar por WhatsApp' }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true); expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).toBeNull();
    await usuario.click(screen.getByRole('checkbox', { name: 'El paciente aceptó continuar por WhatsApp' }));
    act(() => { fireEvent.click(boton); fireEvent.click(boton); });
    const enlace = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(enviar).toHaveBeenCalledExactlyOnceWith({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SolicitarContinuacion', tramiteId: IDS.tramite, payload: { destino: 'whatsapp' } }, { idempotencyKey: expect.any(String) });
    expect(enlace.getAttribute('href')).toBe(`/wa?continuar=${IDS.tokenContinuacion}`);
    expect(await screen.findByRole('img', { name: 'Código QR de continuación' })).toBeDefined();
    expect(QRCode.toString).toHaveBeenCalledWith(new URL(`/wa?continuar=${IDS.tokenContinuacion}`, location.origin).toString(), expect.objectContaining({ type: 'svg' }));
    expect(boton.disabled).toBe(true);
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain(IDS.tokenContinuacion);
  });
  it('permite reintentar la continuación fallida con la misma clave', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 }); await avanzarHasta(cliente, 'COTIZADO');
    const original = cliente.enviarComando.bind(cliente);
    const enviar = vi.spyOn(cliente, 'enviarComando').mockRejectedValueOnce(new ErrorCliente('RED', 'Fallo simulado de continuación')).mockImplementation(original);
    const { usuario } = abrir(cliente);
    await usuario.click(await screen.findByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: 'Continuar por WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Fallo simulado'));
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: 'Abrir WhatsApp' })).toBeDefined();
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar.mock.calls[1]![1]?.idempotencyKey).toBe(enviar.mock.calls[0]![1]?.idempotencyKey);
  });
  it('en pestaña real nueva espera una llamada y cambia de sala solo con el hilo activo', async () => {
    const socket = new SocketFalso(); const lecturas = GUION_FLUJO_A[1]!.lecturas;
    const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
      if (opciones?.method === 'POST') return Response.json(GUION_FLUJO_A[1]!.respuesta);
      if (String(url).endsWith('/fecha-nacimiento')) return Response.json({ fechaNacimiento: null });
      if (String(url).endsWith('/contexto')) return Response.json({ hiloId: IDS.reserva, pacienteId: IDS.paciente, sedeId: IDS.sede });
      return Response.json(String(url).endsWith('/catalogo') ? lecturas.catalogo : lecturas.fichaHilo);
    });
    const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => socket });
    const { usuario, unmount } = abrir(cliente, '/callcenter', true);
    await waitFor(() => expect(peticion.mock.calls.some(([url]) => String(url).endsWith('/contexto'))).toBe(true));
    expect(screen.queryByRole('region', { name: 'Ficha del hilo' })).toBeNull();
    await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
    await screen.findByRole('region', { name: 'Ficha del hilo' });
    act(() => socket.recibir('connect'));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `hilo:${IDS.hilo}`);
    await usuario.click(screen.getByRole('button', { name: 'Cambiar hilo de prueba' }));
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('sala:salir', `hilo:${IDS.hilo}`));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `hilo:${IDS.paciente}`);
    unmount(); expect(socket.emit).toHaveBeenCalledWith('sala:salir', `hilo:${IDS.paciente}`);
  });
});

function prepararLecturas(contextoInicial?: ContextoDemo, demo = true) {
  const lecturas = structuredClone(GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas);
  let contexto = contextoInicial ?? { hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede };
  const socket = new SocketFalso();
  const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    const ruta = String(url);
    if (opciones?.method === 'POST') {
      const comando = ComandoRequestSchema.parse(JSON.parse(String(opciones.body)));
      if (comando.tipo !== 'RegistrarLlegada') throw new Error('Comando de prueba inesperado');
      lecturas.llegadasSede = structuredClone(GUION_FLUJO_A.find(paso => paso.paso.id === 'EN_CLINICA')!.lecturas.llegadasSede);
      return Response.json(GUION_FLUJO_A.find(paso => paso.paso.id === 'EN_CLINICA')!.respuesta);
    }
    if (ruta.endsWith('/contexto')) return Response.json(contexto);
    if (ruta.endsWith('/kpis')) return Response.json(lecturas.metricas);
    if (ruta.endsWith('/alertas')) return Response.json(lecturas.alertasSeguridad);
    if (ruta.endsWith('/huecos')) return Response.json(lecturas.panelHuecos);
    if (ruta.endsWith('/llegadas')) return Response.json(lecturas.llegadasSede);
    if (ruta.includes('/sesion-web/')) return Response.json({ pacienteId: IDS.paciente, nombreVisible: 'Ana P.', tramitesEnProceso: [] });
    if (ruta.endsWith('/citas')) return Response.json(lecturas.citasPaciente);
    if (ruta.endsWith('/fecha-nacimiento')) return Response.json({ fechaNacimiento: null });
    if (ruta.endsWith('/ficha')) return Response.json({ ...lecturas.fichaHilo, hiloId: contexto.hiloId });
    if (ruta.endsWith('/bandeja')) return Response.json([]);
    throw new Error('Consulta de prueba inesperada');
  });
  const cliente = new ClienteReal({ fetch: peticion, demo, fabricaSocket: () => socket });
  return { cliente, socket, peticion, lecturas, cambiarContexto: (nuevo: ContextoDemo) => { contexto = nuevo; } };
}

describe('Clínica, administración y app en modo real', () => {
  it('registra con el token elegido, muestra la hora de Tepic y elimina la acción registrada', async () => {
    const { cliente, peticion, lecturas } = prepararLecturas();
    lecturas.llegadasSede[0]!.cita.tokenQr = 'demo.qr.cita-elegida';
    const { usuario } = abrir(cliente, '/clinica');
    expect(await screen.findByText(/09:15/)).toBeDefined();
    expect(screen.getByText('CONFIRMADA')).toBeDefined();
    await usuario.click(await screen.findByRole('button', { name: 'Registrar llegada' }));
    expect(await screen.findByText('Llegada registrada')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Registrar llegada' })).toBeNull();
    const post = peticion.mock.calls.filter(([, opciones]) => opciones?.method === 'POST');
    expect(post).toHaveLength(1);
    expect(JSON.parse(String(post[0]![1]?.body))).toEqual({ canal: 'clinica', actor: `recepcion:${IDS.sede}`, tipo: 'RegistrarLlegada', tramiteId: IDS.tramite, payload: { token: 'demo.qr.cita-elegida' } });
  });
  it('muestra la lista vacía como estado, sin error', async () => {
    const { cliente, lecturas } = prepararLecturas(); lecturas.llegadasSede = [];
    abrir(cliente, '/clinica');
    expect(await screen.findByText(/Aún no hay llegadas esperadas/)).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('clínica sin contexto ofrece Actualizar y vuelve a pedir el contexto', async () => {
    const { cliente, cambiarContexto, peticion } = prepararLecturas({ hiloId: null, pacienteId: null, sedeId: null });
    const { usuario } = abrir(cliente, '/clinica');
    const actualizar = await screen.findByRole('button', { name: 'Actualizar' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(peticion.mock.calls.every(([url]) => String(url).endsWith('/contexto'))).toBe(true);
    cambiarContexto({ hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede });
    await usuario.click(actualizar);
    expect(await screen.findByText('CONFIRMADA')).toBeDefined();
    expect(peticion.mock.calls.filter(([url]) => String(url).endsWith('/contexto'))).toHaveLength(2);
  });
  it('sin VITE_DEMO la app no inicia sesión ni consulta citas', () => {
    const { cliente, peticion } = prepararLecturas(undefined, false); abrir(cliente, '/app');
    expect(screen.getByText('La consulta de citas está disponible en modo demo.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull();
    expect(peticion).not.toHaveBeenCalled();
  });
  it('muestra los siete KPI documentados y conserva una clave desconocida y su valor', async () => {
    const { cliente, lecturas } = prepararLecturas();
    lecturas.metricas.kpis = { cambiosCanal: 3, cambiosCanalPorHilo: 1.5, tramitesRecuperados: 2, citasConfirmadas: 5, llegadasRegistradas: 4, datosRepetidos: 0, intentosVerificacionFallidos: 1, indicadorNuevo: 1234.56789, constructor: 7, toString: 8 };
    abrir(cliente, '/admin');
    for (const etiqueta of ['Cambios de canal', 'Cambios de canal por hilo', 'Trámites recuperados', 'Citas confirmadas', 'Llegadas registradas', 'Datos repetidos', 'Intentos de verificación fallidos', 'indicadorNuevo', 'constructor', 'toString']) {
      expect(await screen.findByText(etiqueta)).toBeDefined();
    }
    expect(screen.getByText('1,234.56789')).toBeDefined();
    expect(await screen.findByRole('list', { name: 'Eventos del hilo' })).toHaveProperty('textContent', expect.stringContaining('CanalCambiado'));
  });
  it('admin sin hilo conserva las métricas y ofrece actualizar el contexto', async () => {
    const { cliente } = prepararLecturas({ hiloId: null, pacienteId: null, sedeId: null }); abrir(cliente, '/admin');
    expect(await screen.findByRole('heading', { name: 'Trámites por estado' })).toBeDefined();
    expect(await screen.findByText(/Aún no hay un hilo/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each([
    ['/clinica', `sede:${IDS.sede}`], ['/app', `paciente:${IDS.paciente}`], ['/admin', 'admin'],
  ])('%s se une a sus salas y las deja al desmontarse', async (ruta, sala) => {
    const { cliente, socket } = prepararLecturas(); const { unmount, usuario } = abrir(cliente, ruta);
    if (ruta === '/app') await entrarSesionDemo(usuario);
    await screen.findByText('CONFIRMADA'); act(() => socket.recibir('connect'));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', sala);
    if (ruta === '/admin') expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `hilo:${IDS.hilo}`);
    unmount(); expect(socket.emit).toHaveBeenCalledWith('sala:salir', sala);
    if (ruta === '/admin') expect(socket.emit).toHaveBeenCalledWith('sala:salir', `hilo:${IDS.hilo}`);
  });
  it('un evento válido actualiza admin sin recargar, cambia su sala de hilo y descarta un evento inválido', async () => {
    const { cliente, socket, peticion, lecturas, cambiarContexto } = prepararLecturas(); abrir(cliente, '/admin');
    await screen.findByRole('heading', { name: 'Trámites por estado' });
    await screen.findByRole('list', { name: 'Eventos del hilo' }); act(() => socket.recibir('connect'));
    const antes = peticion.mock.calls.length;
    act(() => socket.recibir('tramite:actualizado', { id: IDS.tramite }));
    expect(peticion).toHaveBeenCalledTimes(antes);
    lecturas.metricas.porEstado = [{ estado: 'EN_CLINICA', cantidad: 1 }];
    lecturas.fichaHilo.lineaTiempo = GUION_FLUJO_A.at(-1)!.lecturas.lineaTiempo;
    cambiarContexto({ hiloId: IDS.reserva, pacienteId: IDS.paciente, sedeId: IDS.sede });
    act(() => socket.recibir('admin:metricas', { llegadasRegistradas: 1 }));
    expect(await screen.findByText('EN_CLINICA')).toBeDefined();
    expect(await screen.findByText('PacienteLlego')).toBeDefined();
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('sala:salir', `hilo:${IDS.hilo}`));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', `hilo:${IDS.reserva}`);
  });
});
