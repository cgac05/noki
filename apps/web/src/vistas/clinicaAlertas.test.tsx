import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComandoRequestSchema } from '@noki/contracts';
import type { LlegadaVista } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import '../pruebas/dialogo.ts';
import { rutas } from '../rutas.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg></svg>') } }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });

function preparar(ruta = '/clinica', configurar?: (lecturas: typeof GUION_FLUJO_A[number]['lecturas']) => void, errorAlertasInicial = false) {
  const paso = GUION_FLUJO_A.find(p => p.paso.id === 'EN_CLINICA')!;
  const lecturas = structuredClone(paso.lecturas);
  const primera: LlegadaVista = { ...lecturas.llegadasSede[0]!, posicion: 1 };
  const segunda: LlegadaVista = structuredClone(primera);
  segunda.cita.tramite.id = IDS.reserva;
  segunda.cita.servicio = 'Consulta ficticia'; segunda.posicion = 2;
  lecturas.llegadasSede = [primera, segunda];
  configurar?.(lecturas);
  const socket = new SocketFalso();
  let errorAlertas = errorAlertasInicial;
  const post = vi.fn<(comando: ReturnType<typeof ComandoRequestSchema.parse>) => Promise<Response>>(async () => Response.json(paso.respuesta));
  const peticion = vi.fn<typeof fetch>(async (url, opciones) => {
    if (opciones?.method === 'POST') return post(ComandoRequestSchema.parse(JSON.parse(String(opciones.body))));
    const direccion = String(url);
    if (direccion.endsWith('/contexto')) return Response.json({ hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede });
    if (direccion.endsWith('/llegadas')) return Response.json(lecturas.llegadasSede);
    if (direccion.endsWith('/kpis')) return Response.json(lecturas.metricas);
    if (direccion.endsWith('/huecos')) return Response.json(lecturas.panelHuecos);
    if (direccion.endsWith('/ficha')) return Response.json(lecturas.fichaHilo);
    if (direccion.endsWith('/alertas')) return errorAlertas
      ? Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Consulta no disponible' } }, { status: 404 })
      : Response.json(lecturas.alertasSeguridad);
    throw new Error('Consulta inesperada');
  });
  const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => socket });
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  return { lecturas, primera, segunda, socket, post, peticion, usuario: userEvent.setup(), fallarAlertas: (fallar: boolean) => { errorAlertas = fallar; } };
}

describe('Fila y acciones de recepción con ClienteReal', () => {
  it('registra la llegada con la sede de la cita aunque sea distinta del contexto', async () => {
    const sedeBahia = '019aff20-0000-7000-8000-000000000070';
    const { usuario, post, primera } = preparar('/clinica', lecturas => {
      const cita = lecturas.llegadasSede[0]!.cita;
      cita.sede = 'Bahía de Banderas';
      cita.tramite.sedeId = sedeBahia;
      lecturas.llegadasSede = [{ cita, registrada: false }];
    });
    await usuario.click(await screen.findByRole('button', { name: 'Registrar llegada' }));
    await waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith({
      canal: 'clinica', actor: `recepcion:${sedeBahia}`, tipo: 'RegistrarLlegada',
      tramiteId: primera.cita.tramite.id, payload: { token: primera.cita.tokenQr },
    }));
  });
  it('muestra dos turnos y respeta el orden recibido aunque las posiciones estén invertidas o ausentes', async () => {
    const { lecturas, primera, segunda, socket } = preparar();
    expect(await screen.findByText('Turno 1')).toBeDefined(); expect(screen.getByText('Turno 2')).toBeDefined();
    lecturas.llegadasSede = [{ ...segunda, posicion: 7 }, { ...primera, posicion: 3 }, { ...segunda, posicion: undefined, cita: { ...segunda.cita, servicio: 'Sin turno', tramite: { ...segunda.cita.tramite, id: IDS.recurso } } }];
    act(() => socket.recibir('sede:fila', { tramiteId: IDS.tramite, posicion: 3 }));
    await screen.findByText('Turno 7');
    expect(screen.getAllByText(/^Turno /).map(elemento => elemento.textContent)).toEqual(['Turno 7', 'Turno 3']);
    expect(screen.getAllByRole('heading', { level: 2 }).map(elemento => elemento.textContent)).toEqual([segunda.cita.servicio, primera.cita.servicio, 'Sin turno']);
  });
  it('ofrece solo cerrar la atención sin verificación adicional', async () => {
    const { usuario, post } = preparar('/clinica', lecturas => {
      delete lecturas.llegadasSede[0]!.cita.tramite.sedeId;
    });
    await screen.findByText('Turno 1');
    expect(screen.getAllByRole('button').map(boton => boton.textContent)).toEqual(['Cerrar atención', 'Cerrar atención']);
    expect(screen.queryByText('Identidad comprobada')).toBeNull();
    await usuario.click(screen.getAllByRole('button', { name: 'Cerrar atención' })[0]!);
    await waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith({ canal: 'clinica', actor: `recepcion:${IDS.sede}`, tipo: 'CerrarAtencion', tramiteId: IDS.tramite, payload: {} }));
  });
  it('reintenta un error al cerrar con la misma clave sin bloquear otra tarjeta', async () => {
    const { usuario, post, peticion } = preparar();
    post.mockResolvedValueOnce(Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Operación no disponible' } }, { status: 404 }));
    await usuario.click((await screen.findAllByRole('button', { name: 'Cerrar atención' }))[0]!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Operación no disponible'));
    const cerrarOtra = screen.getAllByRole('button', { name: 'Cerrar atención' })[1] as HTMLButtonElement;
    expect(cerrarOtra.disabled).toBe(false);
    await usuario.click(cerrarOtra);
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(3));
    const envios = peticion.mock.calls.filter(([, opciones]) => opciones?.method === 'POST');
    expect(envios).toHaveLength(3);
    expect(envios[2]![1]?.headers).toEqual(envios[0]![1]?.headers);
    expect(envios[2]![1]?.body).toBe(envios[0]![1]?.body);
  });
  it('cierra una sola vez con doble clic y espera la nueva lectura para avanzar la fila', async () => {
    const { post, lecturas, segunda } = preparar();
    const boton = (await screen.findAllByRole('button', { name: 'Cerrar atención' }))[0]!;
    let resolver!: (respuesta: Response) => void;
    post.mockImplementationOnce(() => new Promise(respuesta => { resolver = respuesta; }));
    act(() => { fireEvent.click(boton); fireEvent.click(boton); });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Turno 2')).toBeDefined();
    expect(post).toHaveBeenCalledWith({ canal: 'clinica', actor: `recepcion:${IDS.sede}`, tipo: 'CerrarAtencion', tramiteId: IDS.tramite, payload: {} });
    lecturas.llegadasSede = [{ ...segunda, posicion: 1 }];
    await act(async () => resolver(Response.json({ ...GUION_FLUJO_A.find(p => p.paso.id === 'EN_CLINICA')!.respuesta, tramite: { ...segunda.cita.tramite, estado: 'ATENDIDA' } })));
    await waitFor(() => expect(screen.queryByText('Turno 2')).toBeNull());
    expect(screen.getByText('Turno 1')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Paquete US mamario + Papanicolaou' })).toBeNull();
  });
});

describe('Alertas de seguridad con ClienteReal', () => {
  it('muestra canal, hora local, intentos y bloqueo en el orden recibido sin IDs ni datos extra', async () => {
    let tsAlerta = '';
    preparar('/admin', lecturas => { lecturas.alertasSeguridad = [
      { id: IDS.mensaje, tipo: 'INTENTO_VERIFICACION_FALLIDO', canal: 'whatsapp', ts: '2026-11-24T23:00:00.000Z', intentos: 3, bloqueado: true, hiloId: IDS.hilo },
      { id: IDS.recurso, tipo: 'INTENTO_VERIFICACION_FALLIDO', canal: 'web', ts: '2026-11-25T00:00:00.000Z', intentos: 1, bloqueado: false, hiloId: null },
    ];
    Object.assign(lecturas.alertasSeguridad[0]!, { telefono: 'dato ajeno al contrato', fechaNac: 'dato privado' });
    tsAlerta = lecturas.alertasSeguridad[0]!.ts;
    });
    const lista = await screen.findByRole('list', { name: 'Alertas de seguridad' });
    const filas = within(lista).getAllByRole('listitem');
    expect(filas[0]!.textContent).toContain('WhatsApp'); expect(filas[0]!.textContent).toContain('3 intentos'); expect(filas[0]!.textContent).toContain('Bloqueado');
    expect(filas[1]!.textContent).toContain('Web'); expect(filas[1]!.textContent).not.toContain('Bloqueado');
    const fechaLocal = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(tsAlerta));
    expect(filas[0]!.querySelector('time')?.textContent).toBe(fechaLocal);
    expect(lista.textContent).not.toMatch(/019aff|dato privado|dato ajeno/);
  });
  it('muestra vacío junto con el resto del tablero', async () => {
    preparar('/admin');
    expect(await screen.findByText('Sin alertas de seguridad')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Trámites por estado' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Indicadores disponibles' })).toBeDefined();
    expect(await screen.findByRole('list', { name: 'Eventos del hilo' })).toBeDefined();
  });
  it('un 404 ofrece reintento sin ocultar métricas ni línea de tiempo', async () => {
    const { fallarAlertas, usuario } = preparar('/admin', undefined, true);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Consulta no disponible'));
    expect(screen.getByRole('heading', { name: 'Trámites por estado' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Indicadores disponibles' })).toBeDefined();
    expect(await screen.findByRole('list', { name: 'Eventos del hilo' })).toBeDefined();
    fallarAlertas(false); await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Sin alertas de seguridad')).toBeDefined();
  });
  it('refresca las alertas con un evento de admin sin recargar', async () => {
    const { lecturas, socket, peticion } = preparar('/admin');
    await screen.findByText('Sin alertas de seguridad');
    const antes = peticion.mock.calls.filter(([url]) => String(url).endsWith('/alertas')).length;
    lecturas.alertasSeguridad = [{ id: IDS.mensaje, tipo: 'INTENTO_VERIFICACION_FALLIDO', canal: 'callcenter', ts: '2026-11-24T23:00:00.000Z', intentos: 2, bloqueado: false, hiloId: null }];
    act(() => socket.recibir('admin:metricas', { intentosVerificacionFallidos: 2 }));
    expect(await screen.findByText('2 intentos')).toBeDefined();
    expect(peticion.mock.calls.filter(([url]) => String(url).endsWith('/alertas')).length).toBeGreaterThan(antes);
    expect(screen.queryByText('Sin alertas de seguridad')).toBeNull();
  });
});
