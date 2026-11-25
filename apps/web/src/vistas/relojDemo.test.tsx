import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A, IDS } from '../cliente/mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { Admin } from './Admin.tsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const ahora = '2026-11-25T18:00:00.000Z';

function preparar() {
  const lecturas = structuredClone(GUION_FLUJO_A.find(p => p.paso.id === 'HORARIO_RESERVADO')!.lecturas);
  const socket = new SocketFalso();
  const post = vi.fn<() => Promise<Response>>(async () => Response.json({ ahora }));
  const peticion = vi.fn<typeof fetch>(async (url, opciones) => {
    if (opciones?.method === 'POST') return post();
    const ruta = String(url);
    if (ruta.endsWith('/contexto')) return Response.json({ hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede });
    if (ruta.endsWith('/kpis')) return Response.json(lecturas.metricas);
    if (ruta.endsWith('/alertas')) return Response.json(lecturas.alertasSeguridad);
    if (ruta.endsWith('/ficha')) return Response.json(lecturas.fichaHilo);
    throw new Error('Consulta inesperada');
  });
  render(<ProveedorCliente cliente={new ClienteReal({ demo: true, fetch: peticion, fabricaSocket: () => socket })}><Admin /></ProveedorCliente>);
  return { lecturas, socket, post, peticion, usuario: userEvent.setup() };
}

describe('Reloj de demo en el tablero', () => {
  it('adelanta una hora, presenta la hora local y UTC y refresca las lecturas', async () => {
    const { usuario, peticion } = preparar();
    await screen.findByText('Sin alertas de seguridad');
    const antes = peticion.mock.calls.length;
    await usuario.click(screen.getByRole('button', { name: '+1 h' }));
    const reloj = screen.getByRole('region', { name: 'Reloj de demo' });
    expect(await within(reloj).findByText(ahora)).toBeDefined();
    expect(reloj.textContent).toContain(new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ahora)));
    expect(reloj.textContent).toContain('afecta a toda la demo');
    expect(reloj.textContent).toContain('pnpm demo:reset');
    expect(peticion.mock.calls.find(([, opciones]) => opciones?.method === 'POST')?.[1]?.body).toBe('{"adelantarMinutos":60}');
    await waitFor(() => expect(peticion.mock.calls.length).toBeGreaterThan(antes + 1));
  });

  it('bloquea sincrónicamente el doble clic y deshabilita todos los controles hasta terminar', async () => {
    const { post } = preparar();
    let resolver!: (respuesta: Response) => void;
    post.mockImplementationOnce(() => new Promise(respuesta => { resolver = respuesta; }));
    const boton = screen.getByRole('button', { name: '+1 día' });
    act(() => { fireEvent.click(boton); fireEvent.click(boton); });
    expect(post).toHaveBeenCalledTimes(1);
    const reloj = screen.getByRole('region', { name: 'Reloj de demo' });
    for (const control of [...within(reloj).getAllByRole('button'), within(reloj).getByRole('spinbutton')]) expect(control).toHaveProperty('disabled', true);
    await act(async () => resolver(Response.json({ ahora })));
    await waitFor(() => expect(boton).toHaveProperty('disabled', false));
  });

  it.each(['20000', '0', '1.5', ''])('explica el rango y rechaza el campo %s sin petición', async valor => {
    const { post } = preparar();
    const campo = screen.getByRole('spinbutton', { name: 'Minutos exactos' });
    expect(campo).toHaveProperty('min', '1'); expect(campo).toHaveProperty('max', '10080');
    fireEvent.change(campo, { target: { value: valor } });
    fireEvent.submit(campo.closest('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/1 a 10 080/));
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(post).not.toHaveBeenCalled();
  });

  it('reintenta los mismos minutos aunque el campo cambie y mantiene visible el tablero', async () => {
    const { usuario, post, peticion } = preparar();
    post.mockResolvedValueOnce(Response.json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Reloj no disponible' } }, { status: 404 }));
    await screen.findByText('Sin alertas de seguridad');
    const campo = screen.getByRole('spinbutton', { name: 'Minutos exactos' });
    fireEvent.change(campo, { target: { value: '23' } });
    await usuario.click(screen.getByRole('button', { name: 'Adelantar reloj' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Reloj no disponible'));
    expect(screen.getByRole('heading', { name: 'Trámites por estado' })).toBeDefined();
    expect(post).toHaveBeenCalledTimes(1);
    fireEvent.change(campo, { target: { value: '77' } });
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText(ahora);
    const cuerpos = peticion.mock.calls.filter(([, opciones]) => opciones?.method === 'POST').map(([, opciones]) => opciones?.body);
    expect(cuerpos).toEqual(['{"adelantarMinutos":23}', '{"adelantarMinutos":23}']);
  });

  it('refresca el conteo por un evento posterior de admin sin recargar', async () => {
    const { usuario, lecturas, socket } = preparar();
    await screen.findByText('HORARIO_RESERVADO');
    act(() => socket.recibir('connect'));
    expect(socket.emit).toHaveBeenCalledWith('sala:unirse', 'admin');
    await usuario.click(screen.getByRole('button', { name: '+15 min' }));
    await screen.findByText(ahora);
    lecturas.metricas.porEstado = [{ estado: 'LISTO_PARA_RESERVAR', cantidad: 1 }];
    act(() => socket.recibir('admin:metricas', { citasConfirmadas: 0 }));
    expect(await screen.findByText('LISTO_PARA_RESERVAR')).toBeDefined();
    expect(screen.queryByText('HORARIO_RESERVADO')).toBeNull();
  });

  it('no ofrece la sección con el cliente simulado', async () => {
    render(<ProveedorCliente cliente={new ClienteMock({ latenciaMs: 0 })}><Admin /></ProveedorCliente>);
    await screen.findByText('Sin alertas de seguridad');
    expect(screen.queryByRole('region', { name: 'Reloj de demo' })).toBeNull();
    expect(screen.queryByRole('button', { name: '+15 min' })).toBeNull();
  });
});
