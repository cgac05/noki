import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { SolicitudMensajeWaSchema } from '@noki/contracts';
import { ClienteReal } from './real/ClienteReal.ts';
import { ProveedorCliente, useConsulta } from './ProveedorCliente.tsx';
import { HistorialWa } from './historialWa.ts';
import { CONTACTO_DEMO } from './ClienteApi.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { entrarSesionDemo } from '../pruebas/entrarSesionDemo.ts';
import { rutas } from '../rutas.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg></svg>') } }));
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
function LecturaActiva() {
  const metricas = useConsulta('metricas', {});
  return <p>Respuestas contabilizadas: {metricas.data?.kpis['respuestas'] ?? 'cargando'}</p>;
}
function preparar(ruta = '/app', observar = false, falla = false) {
  let confirmada = false; let respuestas = 0;
  const cita = GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.citasPaciente;
  const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    if (opciones?.method === 'POST') {
      if (falla) throw new TypeError('Red de prueba');
      const mensaje = SolicitudMensajeWaSchema.parse(JSON.parse(String(opciones.body)));
      respuestas++;
      if (mensaje.payloadBoton === 'confirmar-cita') {
        confirmada = true;
        return Response.json({ mensajes: [{ tipo: 'texto', texto: 'Cita confirmada en la API de prueba.' }] });
      }
      return Response.json({ mensajes: [{ tipo: 'botones', texto: 'Confirmación de prueba', botones: [{ id: 'confirmar', titulo: 'Confirmar cita', payload: 'confirmar-cita' }] }] });
    }
    if (String(url).endsWith(`/sesion-web/${CONTACTO_DEMO}`)) return Response.json({
      pacienteId: confirmada ? IDS.paciente : null, nombreVisible: confirmada ? 'Ana P.' : null, tramitesEnProceso: [],
    });
    if (String(url).endsWith('/kpis')) return Response.json({ porEstado: [], kpis: { respuestas } });
    if (String(url).endsWith(`/pacientes/${IDS.paciente}/citas`)) return Response.json(cita);
    throw new Error('Consulta inesperada');
  });
  const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => new SocketFalso() });
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<ProveedorCliente cliente={cliente}>{observar && <LecturaActiva />}<RouterProvider router={router} /></ProveedorCliente>);
  return { peticion, usuario: userEvent.setup({ delay: null }), confirmarEnServidor: () => { confirmada = true; } };
}

it('vuelve a consultar la sesión al identificarse tras un registro sin paciente', async () => {
  const { usuario, confirmarEnServidor, peticion } = preparar();
  await entrarSesionDemo(usuario);
  await screen.findByText('No encontramos citas para este número');
  await usuario.click(screen.getByRole('link', { name: 'WhatsApp' }));
  confirmarEnServidor();
  await usuario.click(screen.getByRole('link', { name: 'App' }));
  await entrarSesionDemo(usuario);
  expect(await screen.findByText('CONFIRMADA')).toBeDefined();
  expect(peticion.mock.calls.filter(([url]) => String(url).endsWith(`/sesion-web/${CONTACTO_DEMO}`))).toHaveLength(2);
});
it('tras confirmar en WhatsApp muestra la cita en App en la misma pestaña sin Actualizar', async () => {
  const { usuario } = preparar();
  await screen.findByRole('heading', { name: 'Identifícate' });
  await usuario.click(screen.getByRole('link', { name: 'WhatsApp' }));
  await usuario.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Hola');
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
  await usuario.click(await screen.findByRole('button', { name: 'Confirmar cita' }));
  await screen.findByText('Cita confirmada en la API de prueba.');
  await usuario.click(screen.getByRole('link', { name: 'App' }));
  await entrarSesionDemo(usuario);
  expect(await screen.findByText('CONFIRMADA')).toBeDefined();
});
it.each([false, true])('refresca las lecturas activas solo tras respuesta exitosa de WhatsApp (fallo=%s)', async falla => {
  const { usuario, peticion } = preparar('/wa', true, falla);
  await screen.findByText('Respuestas contabilizadas: 0');
  await usuario.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Hola');
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
  if (falla) {
    await screen.findByRole('button', { name: 'Reintentar' });
    expect(peticion.mock.calls.filter(([url]) => String(url).endsWith('/kpis'))).toHaveLength(1);
  } else {
    await waitFor(() => expect(screen.getByText('Respuestas contabilizadas: 1')).toBeDefined());
    expect(peticion.mock.calls.filter(([url]) => String(url).endsWith('/kpis'))).toHaveLength(2);
  }
});
it('alResponder se llama después de guardar cada éxito, sin argumentos ni contenido protegido', async () => {
  const enviarMensajeWa = vi.fn().mockResolvedValue({ mensajes: [{ tipo: 'texto', texto: 'Recibido' }] });
  const alResponder = vi.fn(() => { expect(historial.leer(CONTACTO_DEMO).enviando).toBe(false); });
  const historial = new HistorialWa({ enviarMensajeWa }, { alResponder });
  enviarMensajeWa.mockRejectedValueOnce(new Error('Fallo simulado'));
  expect(await historial.enviar({ waId: CONTACTO_DEMO, texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' })).toBe(false);
  expect(alResponder).not.toHaveBeenCalled();
  const id = historial.leer(CONTACTO_DEMO).entradas[0]!.id;
  expect(await historial.reintentar(CONTACTO_DEMO, id)).toBe(true);
  expect(await historial.continuar(CONTACTO_DEMO, 'codigo-ficticio')).toBe(true);
  expect(await historial.enviarFlow(CONTACTO_DEMO, { fechaNac: 'valor-protegido-demo' }, 'Fecha ••••')).toBe(true);
  expect(alResponder.mock.calls).toEqual([[], [], []]);
  expect(JSON.stringify(alResponder.mock.calls)).not.toContain('valor-protegido-demo');
});
