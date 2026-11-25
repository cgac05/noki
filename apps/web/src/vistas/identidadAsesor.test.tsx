import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ComandoRequestSchema, SiguientePreguntaSchema } from '@noki/contracts';
import type { ComandoRequest, SiguientePregunta } from '@noki/contracts';
import { ClienteReal } from '../cliente/real/ClienteReal.ts';
import { ProveedorCliente } from '../cliente/ProveedorCliente.tsx';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';
import pistas from '../pruebas/pistasIdentificacion.json';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { rutas } from '../rutas.tsx';
import '../pruebas/dialogo.ts';

vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg></svg>') } }));
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });
const pregunta = (paso: keyof typeof pistas): SiguientePregunta => SiguientePreguntaSchema.parse({ tipo: 'PREGUNTA', casilla: 'paciente', pista: pistas[paso] });
async function abrir(paso: keyof typeof pistas | 'servicio' = 'DESTINATARIO', soloLectura = false) {
  let actual = paso === 'servicio' ? GUION_FLUJO_A[1]!.respuesta.siguientePregunta : pregunta(paso);
  let bloquear = false; let fallosRed = 0;
  const recibidos: { comando: ComandoRequest; clave: string | null }[] = [];
  const responder = () => ({ ...GUION_FLUJO_A[1]!.respuesta, siguientePregunta: actual });
  const peticion = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    if (opciones?.method === 'POST') {
      const comando = ComandoRequestSchema.parse(JSON.parse(String(opciones.body)));
      recibidos.push({ comando, clave: new Headers(opciones.headers).get('Idempotency-Key') });
      if (comando.tipo === 'IdentificarPaciente') {
        if (fallosRed > 0) { fallosRed--; throw new TypeError('Red de prueba'); }
        if (bloquear && comando.payload.paso !== 'REINICIAR') return Response.json({ error: { codigo: 'REGLA_VIOLADA', mensaje: 'Identificación bloqueada temporalmente.', datos: { regla: 'IDENTIFICACION_BLOQUEADA' } } }, { status: 422 });
        actual = comando.payload.paso === 'REINICIAR' ? pregunta('DESTINATARIO')
          : comando.payload.paso === 'DESTINATARIO' ? pregunta('CONFIRMAR')
          : comando.payload.paso === 'CONFIRMAR' ? pregunta('FECHA_NAC')
          : comando.payload.paso === 'CURP' ? pregunta('DATOS') : GUION_FLUJO_A[1]!.respuesta.siguientePregunta;
      }
      return Response.json(responder());
    }
    if (String(url).endsWith('/contexto')) return Response.json({ hiloId: null, pacienteId: null, sedeId: null });
    if (String(url).endsWith('/catalogo')) return Response.json(GUION_FLUJO_A[1]!.lecturas.catalogo);
    return Response.json({ ...GUION_FLUJO_A[1]!.lecturas.fichaHilo, soloLectura });
  });
  const cliente = new ClienteReal({ fetch: peticion, demo: true, fabricaSocket: () => new SocketFalso() });
  let cache!: QueryClient;
  function Observar() { cache = useQueryClient(); return null; }
  const router = createMemoryRouter(rutas, { initialEntries: ['/callcenter'] });
  const vista = render(<ProveedorCliente cliente={cliente}><Observar /><RouterProvider router={router} /></ProveedorCliente>);
  const usuario = userEvent.setup({ delay: null });
  expect(screen.queryByText('Identificar paciente (opcional)')).toBeNull();
  await usuario.click(screen.getByRole('button', { name: 'Llamada entrante' }));
  await screen.findByRole('region', { name: 'Ficha del hilo' });
  return { ...vista, usuario, recibidos, cache, router, bloquear: () => { bloquear = true; }, fallarRed: () => { fallosRed = 2; } };
}

it.each(['NINGUNO', 'referencia-opaca-demo'])('envía destinatario y candidato %s; captura la fecha protegida y avanza', async candidato => {
  const { usuario, recibidos } = await abrir();
  expect(screen.getByText('Identificar paciente (opcional)')).toBeDefined();
  await usuario.click(screen.getByRole('button', { name: 'Para mí' }));
  await usuario.click(await screen.findByRole('button', { name: candidato === 'NINGUNO' ? 'No soy ninguno' : 'Soy Ana P.' }));
  await usuario.click(await screen.findByRole('button', { name: 'Capturar datos' }));
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento', { exact: true }), { target: { value: '2000-01-02' } });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(recibidos.slice(1).map(dato => dato.comando.payload)).toEqual([{ paso: 'DESTINATARIO', para: 'MI' }, { paso: 'CONFIRMAR', candidato: candidato === 'NINGUNO' ? null : candidato }, { paso: 'FECHA_NAC', fechaNac: '2000-01-02' }]);
  expect(screen.queryByText('Identificar paciente (opcional)')).toBeNull();
  expect(document.body.textContent).not.toContain('2000-01-02');
});
it('permite omitir identificación y cotizar sin bloquear las demás operaciones', async () => {
  const { usuario, recibidos } = await abrir();
  await usuario.click(screen.getByRole('button', { name: 'Cotizar paquete en Tepic' }));
  await waitFor(() => expect(recibidos.map(dato => dato.comando.tipo)).toContain('SeleccionarSede'));
  expect(recibidos.some(dato => dato.comando.tipo === 'IdentificarPaciente')).toBe(false);
});
it('H-01: tras fallar Para mí envía Para otra persona con otro payload y clave', async () => {
  const { usuario, recibidos, fallarRed } = await abrir();
  fallarRed();
  await usuario.click(screen.getByRole('button', { name: 'Para mí' }));
  await screen.findByRole('button', { name: 'Reintentar' });
  expect(recibidos).toHaveLength(3); // Llamada y dos intentos automáticos del cliente real.
  expect(recibidos[2]).toEqual(recibidos[1]);
  await usuario.click(screen.getByRole('button', { name: 'Para otra persona' }));
  await waitFor(() => expect(recibidos).toHaveLength(4));
  expect(recibidos[3]!.comando.payload).toEqual({ paso: 'DESTINATARIO', para: 'OTRA_PERSONA' });
  expect(recibidos[3]!.clave).not.toBe(recibidos[1]!.clave);
});
it.each([['servicio', false], ['DESTINATARIO', true]] as const)('oculta la sección sin pregunta o en solo lectura (%s, %s)', async (paso, lectura) => {
  await abrir(paso, lectura); expect(screen.queryByText('Identificar paciente (opcional)')).toBeNull();
});
it('ofrece sin CURP junto al formulario y rechaza el formato antes de enviar', async () => {
  const { usuario, recibidos } = await abrir('CURP');
  await usuario.click(screen.getByRole('button', { name: 'Capturar datos' }));
  fireEvent.change(screen.getByLabelText('CURP', { exact: true }), { target: { value: 'invalida' } });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  expect(screen.getByText('Revisa el formato de este campo')).toBeDefined();
  expect(recibidos).toHaveLength(1);
  await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
  await usuario.click(screen.getByRole('button', { name: 'No la tengo' }));
  await waitFor(() => expect(recibidos).toHaveLength(2));
  expect(recibidos[1]!.comando.payload).toEqual({ paso: 'CURP', curp: null });
});
it('muestra código y mensaje del núcleo, conserva reiniciar y descarta al cancelar', async () => {
  const { usuario, recibidos, bloquear } = await abrir('FECHA_NAC'); bloquear();
  await usuario.click(screen.getByRole('button', { name: 'Capturar datos' }));
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento', { exact: true }), { target: { value: '2000-01-02' } });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  expect(await screen.findByText('Identificación bloqueada temporalmente.')).toBeDefined();
  expect(screen.getByText('REGLA_VIOLADA')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Reiniciar identificación' })).toBeDefined();
  expect(document.body.textContent).not.toContain('2000-01-02');
  await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
  await usuario.click(screen.getByRole('button', { name: 'Capturar datos' }));
  expect((screen.getByLabelText('Fecha de nacimiento', { exact: true }) as HTMLInputElement).value).toBe('');
  await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
  await usuario.click(screen.getByRole('button', { name: 'Reiniciar identificación' }));
  await screen.findByRole('button', { name: 'Para mí' });
  expect(recibidos.at(-1)!.comando.payload).toEqual({ paso: 'REINICIAR' });
});
it('reintenta sin recapturar y no filtra CURP, fecha ni datos básicos a cachés, consola, URL o almacenamiento', async () => {
  const espias = (['log', 'warn', 'error', 'info', 'debug'] as const).map(nombre => vi.spyOn(console, nombre).mockImplementation(() => {}));
  const almacenar = vi.spyOn(Storage.prototype, 'setItem');
  const url = vi.spyOn(history, 'replaceState');
  const { usuario, recibidos, cache, fallarRed } = await abrir('CURP');
  const curp = 'PEMA000102MNTXXX00';
  await usuario.click(screen.getByRole('button', { name: 'Capturar datos' }));
  fireEvent.change(screen.getByLabelText('CURP', { exact: true }), { target: { value: curp.toLowerCase() } });
  fallarRed(); await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await usuario.click(await screen.findByRole('button', { name: 'Reintentar envío' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(recibidos[2]).toEqual(recibidos[1]); expect(recibidos[3]).toEqual(recibidos[1]);
  await usuario.click(screen.getByRole('button', { name: 'Capturar datos' }));
  const datos = { nombre: 'Persona Ficticia', apellidoPaterno: 'Prueba', apellidoMaterno: 'Ejemplo', fechaNac: '2000-01-02', sexo: 'F', entidadNacimiento: 'NT' };
  for (const campo of pistas.DATOS.campos) fireEvent.change(screen.getByLabelText(campo.etiqueta, { exact: true }), { target: { value: datos[campo.id as keyof typeof datos] } });
  await usuario.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  for (const valor of [curp, curp.toLowerCase(), datos.nombre, datos.apellidoPaterno, datos.apellidoMaterno, datos.fechaNac]) {
    expect(document.body.textContent).not.toContain(valor);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(valor);
    expect(JSON.stringify(almacenar.mock.calls)).not.toContain(valor);
    expect(JSON.stringify(url.mock.calls)).not.toContain(valor); expect(location.href).not.toContain(valor);
    expect(JSON.stringify(cache.getMutationCache().getAll())).not.toContain(valor);
    expect(JSON.stringify(cache.getQueryCache().getAll().map(consulta => consulta.state))).not.toContain(valor);
    for (const espia of espias) expect(JSON.stringify(espia.mock.calls)).not.toContain(valor);
  }
});
