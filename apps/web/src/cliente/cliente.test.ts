import {
  ESQUEMAS_EVENTOS_SOCKET, RespuestaComandoSchema, RespuestaMensajeWaSchema,
} from '@noki/contracts';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { crearCliente } from './crearCliente.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { CATALOGO_DEMO, DATOS_WEB } from './mock/datosWeb.ts';
import { ESQUEMAS_CONSULTAS, FichaHiloSchema } from './provisional.ts';
import { ClienteReal } from './real/ClienteReal.ts';

const iniciar = { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' } } as const;

describe('Configuración y datos provisionales', () => {
  it('Valor inválido: explica los modos válidos', () => {
    expect(() => crearCliente({ modo: 'prueba' })).toThrow('VITE_API debe ser mock o real');
  });

  it('usa mock por defecto y permite seleccionar real', () => {
    expect(crearCliente().modo).toBe('mock');
    expect(crearCliente({ modo: 'real' }).modo).toBe('real');
  });

  it('Módulo provisional único: los esquemas de lectura se declaran juntos', () => {
    const raiz = resolve(import.meta.dirname, '..');
    for (const archivo of readdirSync(raiz, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(archivo) || archivo.endsWith('.test.ts') || archivo.endsWith('.test.tsx')) continue;
      if (archivo.replaceAll('\\', '/') === 'cliente/provisional.ts') continue;
      const codigo = readFileSync(resolve(raiz, archivo), 'utf8');
      expect(codigo).not.toMatch(/export\s+(?:type|interface|const)\s+(?:CatalogoVista|CitaVista|FichaHilo|LlegadaVista|MensajeBandeja|MetricasVista)(?:Schema)?\b/);
    }
  });

  it('Sin datos sensibles provisionales: rechaza campos sensibles y teléfono completo', () => {
    const ficha = GUION_FLUJO_A[1]!.lecturas.ficha;
    for (const campo of ['fechaNac', 'email', 'correo', 'rfc', 'pin', 'curp', 'telefono']) {
      expect(FichaHiloSchema.safeParse({ ...ficha, [campo]: 'dato prohibido' }).success).toBe(false);
    }
    expect(FichaHiloSchema.safeParse({ ...ficha, telefonoEnmascarado: '5210000000001' }).success).toBe(false);
    expect(readFileSync(resolve(import.meta.dirname, 'provisional.ts'), 'utf8')).toContain('contratos-consultas');
  });
});

describe('Cliente simulado', () => {
  it('mantiene el precio del paquete en 25000 centavos en catálogo, cotización y ficha', () => {
    expect(CATALOGO_DEMO.precioCentavos).toBe(25000);
    expect(DATOS_WEB[1]!.vista.cotizacion?.precioCentavos).toBe(25000);
    for (const paso of GUION_FLUJO_A) {
      if (paso.lecturas.ficha.catalogo) expect(paso.lecturas.ficha.catalogo.precioCentavos).toBe(25000);
      expect(paso.lecturas.web.catalogo.precioCentavos).toBe(25000);
    }
  });

  it('Datos simulados válidos: todas las respuestas, lecturas y eventos cumplen sus esquemas', () => {
    for (const paso of GUION_FLUJO_A) {
      expect(RespuestaComandoSchema.safeParse(paso.respuesta).success).toBe(true);
      expect(RespuestaMensajeWaSchema.safeParse({ mensajes: paso.lecturas.conversacion.mensajes }).success).toBe(true);
      for (const [nombre, datos] of Object.entries(paso.lecturas)) {
        const esquema = ESQUEMAS_CONSULTAS[nombre as keyof typeof ESQUEMAS_CONSULTAS];
        expect(esquema.safeParse(datos).success, `${paso.paso.id}: ${nombre}`).toBe(true);
      }
      for (const evento of paso.eventosSocket) {
        expect(ESQUEMAS_EVENTOS_SOCKET[evento.nombre].safeParse(evento.datos).success).toBe(true);
      }
    }
    for (const paso of DATOS_WEB) {
      expect(ESQUEMAS_CONSULTAS.web.safeParse(paso.vista).success).toBe(true);
      expect(RespuestaComandoSchema.safeParse(paso.respuesta).success).toBe(true);
    }
  });

  it('Continuidad simulada: cambia a WhatsApp y retoma en horario', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    for (let i = 0; i < 3; i++) {
      const ficha = await cliente.consultar('ficha', {});
      const accion = ficha.acciones[0]!;
      if (accion.tipo === 'comando') await cliente.enviarComando(accion.comando);
      else await cliente.enviarMensajeWa(accion.mensaje);
    }
    const conversacion = await cliente.consultar('conversacion', {});
    expect(conversacion.siguientePregunta).toMatchObject({ tipo: 'PREGUNTA', casilla: 'horario' });
    expect(conversacion.mensajes[0]).toMatchObject({ tipo: 'texto', texto: expect.stringContaining('horario') });
    expect(cliente.demo.paso().id).toBe('CONTINUAR_WA');
    expect((await cliente.consultar('ficha', {})).telefonoEnmascarado).toBe('•••• 0001');
  });

  it('Eventos de tiempo real: confirma, valida los eventos y permite cancelar la suscripción', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const actualizado = vi.fn();
    const lineaTiempo = vi.fn();
    const dejar = cliente.suscribir('tramite:actualizado', actualizado);
    cliente.suscribir('hilo:linea-tiempo', lineaTiempo);
    for (const paso of GUION_FLUJO_A.slice(1, 8)) {
      if (paso.espera!.tipo === 'comando') await cliente.enviarComando(paso.espera!.comando);
      else await cliente.enviarMensajeWa(paso.espera!.mensaje);
    }
    expect(actualizado).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'CONFIRMADA' }));
    expect(lineaTiempo).toHaveBeenLastCalledWith(expect.objectContaining({ eventos: expect.arrayContaining([expect.objectContaining({ tipo: 'CitaConfirmada' })]) }));
    dejar();
    const veces = actualizado.mock.calls.length;
    await cliente.enviarComando({ canal: 'clinica', actor: 'recepcion:tepic', tipo: 'RegistrarLlegada', tramiteId: IDS.tramite, payload: { token: IDS.tokenQr } });
    expect(actualizado).toHaveBeenCalledTimes(veces);
    expect(cliente.demo.paso().id).toBe('EN_CLINICA');
  });

  it('Reinicio del guion: restablece también la cotización web y avisa a las vistas', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const cambio = vi.fn();
    const dejar = cliente.demo.alCambiar(cambio);
    await cliente.enviarComando(iniciar);
    await cliente.enviarComando(DATOS_WEB[0]!.vista.acciones[0]!.comando);
    expect((await cliente.consultar('web', {})).cotizacion).not.toBeNull();
    cliente.demo.reiniciar();
    expect(cliente.demo.paso().id).toBe('INICIO');
    expect((await cliente.consultar('web', {})).cotizacion).toBeNull();
    expect(cambio).toHaveBeenCalledTimes(3);
    dejar();
    cliente.demo.reiniciar();
    expect(cambio).toHaveBeenCalledTimes(3);
  });

  it('Fuera del guion: devuelve ayuda válida sin avanzar', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const respuesta = await cliente.enviarMensajeWa({ waId: '5210000000001', texto: 'otro estudio' });
    expect(RespuestaMensajeWaSchema.safeParse(respuesta).success).toBe(true);
    expect(respuesta.mensajes[0]).toMatchObject({ tipo: 'texto', texto: expect.stringContaining('Call Center') });
    expect(cliente.demo.paso().id).toBe('INICIO');
  });

  it('un reinicio cancela el avance de una acción simulada que aún estaba esperando', async () => {
    const cliente = new ClienteMock({ latenciaMs: 10 });
    const pendiente = cliente.enviarComando(iniciar);
    cliente.demo.reiniciar();
    await expect(pendiente).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
    expect(cliente.demo.paso().id).toBe('INICIO');
  });
});

describe('Cliente real', () => {
  it('Encabezado de idempotencia: envía cuerpo validado y URL configurable', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(GUION_FLUJO_A[1]!.respuesta));
    const cliente = new ClienteReal({ url: 'http://api.test/', fetch: peticion });
    await cliente.enviarComando(iniciar);
    expect(peticion).toHaveBeenCalledTimes(1);
    const [url, opciones] = peticion.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/comandos');
    expect(opciones?.method).toBe('POST');
    const headers = new Headers(opciones?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(String(opciones?.body))).toEqual(iniciar);
  });

  it('Reintento conserva la clave y se limita a un reintento automático de red', async () => {
    const peticion = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json(GUION_FLUJO_A[1]!.respuesta));
    const cliente = new ClienteReal({ fetch: peticion });
    await cliente.enviarComando(iniciar);
    const clave = new Headers(peticion.mock.calls[0]![1]?.headers).get('Idempotency-Key')!;
    expect(new Headers(peticion.mock.calls[1]![1]?.headers).get('Idempotency-Key')).toBe(clave);
    peticion.mockReset().mockRejectedValue(new TypeError('offline'));
    await expect(cliente.enviarComando(iniciar, { idempotencyKey: clave })).rejects.toMatchObject({ tipo: 'RED' });
    expect(peticion).toHaveBeenCalledTimes(2);
    expect(new Headers(peticion.mock.calls[0]![1]?.headers).get('Idempotency-Key')).toBe(clave);
  });

  it('Conflicto de versión: conserva código y mensaje sin stack ni datos internos', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: { codigo: 'CONFLICTO_VERSION', mensaje: 'Ya fue confirmada por teléfono', datos: { stack: 'privado' } }, stack: 'privado' }, { status: 409 }));
    const cliente = new ClienteReal({ fetch: peticion });
    await expect(cliente.enviarComando(iniciar)).rejects.toMatchObject({ tipo: 'API', codigo: 'CONFLICTO_VERSION', mensaje: 'Ya fue confirmada por teléfono' });
    await cliente.enviarComando(iniciar).catch((error: unknown) => {
      expect(error).not.toHaveProperty('datos');
      expect(String(error)).not.toContain('privado');
    });
  });

  it('Respuesta real mal formada: rechaza un trámite sin tipo', async () => {
    const respuesta = structuredClone(GUION_FLUJO_A[1]!.respuesta) as Record<string, unknown>;
    respuesta.tramite = { id: IDS.tramite };
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(respuesta));
    await expect(new ClienteReal({ fetch: peticion }).enviarComando(iniciar)).rejects.toMatchObject({ tipo: 'CONTRATO' });
  });

  it('Comandos validados antes de enviarse: no invoca la red con un canal inválido', async () => {
    const peticion = vi.fn<typeof fetch>();
    const cliente = new ClienteReal({ fetch: peticion });
    // @ts-expect-error -- Se simula una entrada externa que viola el contrato de canales.
    await expect(cliente.enviarComando({ ...iniciar, canal: 'desconocido' })).rejects.toMatchObject({ tipo: 'CONTRATO' });
    expect(peticion).not.toHaveBeenCalled();
  });

  it('valida mensajes de WhatsApp y sus respuestas y envía la clave', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ mensajes: [{ tipo: 'texto', texto: 'Hola' }] }));
    const cliente = new ClienteReal({ fetch: peticion });
    await cliente.enviarMensajeWa({ waId: '5210000000001', texto: 'Hola' });
    expect(peticion.mock.calls[0]![0]).toBe('http://localhost:4000/api/canales/wa/mensajes');
    expect(new Headers(peticion.mock.calls[0]![1]?.headers).get('Idempotency-Key')).toBeTruthy();
    await expect(cliente.enviarMensajeWa({ waId: 'mal', texto: 'Hola' })).rejects.toMatchObject({ tipo: 'CONTRATO' });
    expect(peticion).toHaveBeenCalledTimes(1);
  });

  it('consultas reales: solo intenta las rutas previstas y valida sus datos', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(GUION_FLUJO_A[7]!.lecturas.lineaTiempo));
    const cliente = new ClienteReal({ fetch: peticion });
    expect(await cliente.consultar('lineaTiempo', { hiloId: IDS.hilo })).toEqual(GUION_FLUJO_A[7]!.lecturas.lineaTiempo);
    expect(peticion.mock.calls[0]![0]).toBe(`http://localhost:4000/api/hilos/${IDS.hilo}/linea-tiempo`);
    await expect(cliente.consultar('citas', {})).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
    expect(peticion).toHaveBeenCalledTimes(1);
    expect(cliente.suscribir('admin:metricas', vi.fn())()).toBeUndefined();
  });

  it('JSON inválido y errores fuera de contrato producen errores públicos de contrato', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('no es JSON')).mockResolvedValueOnce(Response.json({ stack: 'privado' }, { status: 500 }));
    const cliente = new ClienteReal({ fetch: peticion });
    await expect(cliente.enviarComando(iniciar)).rejects.toMatchObject({ tipo: 'CONTRATO' });
    await expect(cliente.enviarComando(iniciar)).rejects.toMatchObject({ tipo: 'CONTRATO' });
  });
});
