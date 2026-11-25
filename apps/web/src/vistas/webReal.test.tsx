import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { ComandoRequestSchema } from '@noki/contracts';
import type { ComandoRequest } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';

afterEach(() => { cleanup(); sessionStorage.clear(); });

it('cotiza con el catálogo real y genera una sola continuación aunque se pulse dos veces', async () => {
  const id = '019aff20-0000-7000-8000-000000000001';
  const hiloId = '019aff20-0000-7000-8000-000000000002';
  const oferta = {
    servicioId: '019aff20-0000-7000-8000-000000000003', servicio: 'Ultrasonido abdominal',
    sedeId: '019aff20-0000-7000-8000-000000000004', sede: 'Bahía de Banderas', precioCentavos: 25850,
  };
  const tramite = { id, hiloId, tipo: 'AGENDAR', estado: 'BORRADOR', version: 1 };
  const cotizado = { ...tramite, estado: 'COTIZADO', version: 3, servicioId: oferta.servicioId, sedeId: oferta.sedeId };
  const comandos: ComandoRequest[] = [];
  const peticion: typeof fetch = async (url, opciones) => {
    const ruta = new URL(String(url)).pathname;
    if (ruta === '/api/catalogo') return Response.json([oferta]);
    if (ruta === '/api/comandos' && opciones?.method === 'POST') {
      const comando = ComandoRequestSchema.parse(JSON.parse(String(opciones.body)));
      comandos.push(comando);
      return Response.json({
        tramite: comando.tipo === 'IniciarTramite' ? tramite : cotizado,
        siguientePregunta: { tipo: 'COMPLETO' }, eventos: [],
      });
    }
    if (ruta === `/api/hilos/${hiloId}/ficha`) return Response.json({
      hiloId, tramites: [cotizado], lineaTiempo: [], soloLectura: false,
      nombrePila: null, telefonoEnmascarado: null, oferta,
      codigoContinuacion: comandos.some(({ tipo }) => tipo === 'SolicitarContinuacion') ? 'CONTINUAR codigo.demo' : null,
    });
    throw new Error(`Ruta inesperada: ${ruta}`);
  };
  const cliente = new ClienteReal({ fetch: peticion, fabricaSocket: () => new SocketFalso() });
  const router = createMemoryRouter(rutas, { initialEntries: ['/web'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  const usuario = userEvent.setup({ delay: null });
  const cotizar = await screen.findByRole('button', { name: 'Cotizar Ultrasonido abdominal en Bahía de Banderas · $258.50' });
  expect(screen.queryByText(/esta consulta aún no está disponible/i)).toBeNull();
  await usuario.dblClick(cotizar);
  const continuar = await screen.findByRole('button', { name: 'Continuar en WhatsApp' });
  expect(screen.getByText('$258.50')).toBeTruthy();
  await usuario.dblClick(continuar);
  const enlace = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
  expect(enlace.getAttribute('href')).toBe('/wa?continuar=codigo.demo');
  expect(screen.getByText('CONTINUAR codigo.demo')).toBeTruthy();
  expect(await screen.findByRole('img', { name: 'Código QR de continuación' })).toBeTruthy();
  expect(comandos).toEqual([
    { tipo: 'IniciarTramite', canal: 'web', actor: 'paciente', payload: { tipoTramite: 'AGENDAR' } },
    { tipo: 'SeleccionarServicio', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { servicioId: oferta.servicioId } },
    { tipo: 'SeleccionarSede', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { sedeId: oferta.sedeId } },
    { tipo: 'SolicitarContinuacion', canal: 'web', actor: 'paciente', tramiteId: id, hiloId, payload: { destino: 'whatsapp' } },
  ]);
});
