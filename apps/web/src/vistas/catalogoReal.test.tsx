import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ComandoRequestSchema, OfertaCatalogoSchema } from '@noki/contracts';
import type { ComandoRequest } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';

afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });
const servicios = ['Química sanguínea', 'Ultrasonido abdominal', 'Consulta nutricional', 'Paquete US mamario + Papanicolaou'];
const sedes = ['Clínica Tepic', 'Clínica Bahía de Banderas', 'Clínica Guadalajara'];
const id = (numero: number) => `019aff20-0000-7000-8000-${String(numero).padStart(12, '0')}`;
const catalogo = servicios.flatMap((servicio, indice) => sedes.map((sede, posicion) => OfertaCatalogoSchema.parse({
  servicioId: id(indice + 1), servicio, sedeId: id(posicion + 10), sede, precioCentavos: 10000 + indice * 5000 + posicion * 100,
})));

it('distingue las doce ofertas sin reordenarlas y cotiza los identificadores del paquete en Tepic', async () => {
  const recibidos: ComandoRequest[] = [];
  const inicial = GUION_FLUJO_A[1]!;
  const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    if (opciones?.method === 'POST') {
      recibidos.push(ComandoRequestSchema.parse(JSON.parse(String(opciones.body))));
      return Response.json(inicial.respuesta);
    }
    if (String(url).endsWith('/contexto')) return Response.json({ hiloId: null, pacienteId: null, sedeId: null });
    return Response.json(String(url).endsWith('/catalogo') ? catalogo : inicial.lecturas.fichaHilo);
  });
  const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => new SocketFalso() });
  const router = createMemoryRouter(rutas, { initialEntries: ['/callcenter'] });
  render(<ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente>);
  const usuario = userEvent.setup({ delay: null });
  await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
  const botones = await screen.findAllByRole('button', { name: /^Cotizar / });
  const textos = botones.map(boton => boton.textContent);
  expect(botones).toHaveLength(12);
  expect(new Set(textos).size).toBe(12);
  expect(textos).toEqual(catalogo.map(oferta => `Cotizar ${oferta.servicio} en ${oferta.sede} · $${(oferta.precioCentavos / 100).toFixed(2)}`));
  await usuario.click(screen.getByRole('button', { name: 'Cotizar Paquete US mamario + Papanicolaou en Clínica Tepic · $250.00' }));
  await waitFor(() => expect(recibidos).toHaveLength(3));
  expect(recibidos.slice(1).map(comando => ({ tipo: comando.tipo, payload: comando.payload }))).toEqual([
    { tipo: 'SeleccionarServicio', payload: { servicioId: catalogo[9]!.servicioId } },
    { tipo: 'SeleccionarSede', payload: { sedeId: catalogo[9]!.sedeId } },
  ]);
});
