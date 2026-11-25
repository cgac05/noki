import {
  ESQUEMAS_EVENTOS_SOCKET, FichaHiloSchema, RUTAS_CONSULTAS, rutaConsulta, RespuestaComandoSchema, RespuestaMensajeWaSchema,
} from '@noki/contracts';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { crearCliente } from './crearCliente.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { CATALOGO_DEMO, COMANDOS_WEB_ESPERADOS, DATOS_WEB } from './mock/datosWeb.ts';
import { ESQUEMAS_DEMO } from './demo.ts';
import { ClienteReal } from './real/ClienteReal.ts';
import type { DatosEventoSocket } from '@noki/contracts';

const consultasGuion = (Object.keys(RUTAS_CONSULTAS) as Array<keyof typeof RUTAS_CONSULTAS>)
  .filter(nombre => nombre !== 'sesionWebDemo' && nombre !== 'fechaNacimientoLlamada');

const iniciar = { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: '5210000000001' } } as const;

describe('Configuración y contrato de lecturas', () => {
  it('Valor inválido: explica los modos válidos', () => {
    expect(() => crearCliente({ modo: 'prueba' })).toThrow('VITE_API debe ser mock o real');
  });

  it('usa mock por defecto y permite seleccionar real', () => {
    expect(crearCliente().modo).toBe('mock');
    expect(crearCliente({ modo: 'real' }).modo).toBe('real');
  });

  it('Sin duplicados del contrato: la web no declara modelos compartidos', () => {
    const raiz = resolve(import.meta.dirname, '..');
    for (const archivo of readdirSync(raiz, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(archivo) || archivo.endsWith('.test.ts') || archivo.endsWith('.test.tsx')) continue;
      const codigo = readFileSync(resolve(raiz, archivo), 'utf8');
      expect(codigo).not.toMatch(/export\s+(?:type|interface|const)\s+(?:CatalogoVista|OfertaCatalogo|CitaVista|FichaHilo|LlegadaVista|MensajeBandeja|MetricasVista)(?:Schema)?\b/);
    }
  });

  it('Sin datos sensibles: descarta campos extra y rechaza el teléfono completo', () => {
    const ficha = GUION_FLUJO_A[1]!.lecturas.fichaHilo;
    for (const campo of ['fechaNac', 'email', 'correo', 'rfc', 'pin', 'curp', 'telefono']) {
      expect(FichaHiloSchema.parse({ ...ficha, [campo]: 'dato prohibido' })).not.toHaveProperty(campo);
    }
    expect(FichaHiloSchema.safeParse({ ...ficha, telefonoEnmascarado: '5210000000001' }).success).toBe(false);
    expect(readFileSync(resolve(import.meta.dirname, 'demo.ts'), 'utf8')).not.toMatch(/fechaNac|email|rfc|pin|curp/);
  });
});

describe('Cliente simulado', () => {
  it('Flujo C: aprobación por 403, oferta privada, efecto dominó y lecturas/eventos válidos', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    cliente.demo.elegirGuion('flujoC');
    expect(cliente.demo.guion()).toBe('flujoC');
    expect(cliente.demo.paso()).toMatchObject({ id: 'C_INICIO', numero: 1 });
    const { GUION_FLUJO_C } = await import('./mock/guionFlujoC.ts');
    const recibir = vi.fn<(dato: DatosEventoSocket['wa:mensajes']) => void>(); cliente.suscribir('wa:mensajes', recibir);
    for (const paso of GUION_FLUJO_C) {
      if (paso.espera?.tipo === 'comando') {
        await expect(cliente.enviarComando(paso.espera.comando)).rejects.toMatchObject({ tipo: 'API', codigo: 'STEP_UP_REQUERIDO' });
        expect(recibir).toHaveBeenLastCalledWith(expect.objectContaining({ waId: '5210000000001' }));
      } else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
      expect(cliente.demo.paso().id).toBe(paso.paso.id);
      expect(RespuestaComandoSchema.safeParse(paso.respuesta).success).toBe(true);
      expect(RespuestaMensajeWaSchema.safeParse({ mensajes: paso.mensajes }).success).toBe(true);
      for (const [nombre, datos] of Object.entries(paso.lecturas)) {
        const esquema = nombre === 'web' ? ESQUEMAS_DEMO.web : RUTAS_CONSULTAS[nombre as keyof typeof RUTAS_CONSULTAS].respuesta;
        expect(esquema.safeParse(datos).success, `${paso.paso.id}: ${nombre}`).toBe(true);
      }
      const parametros = { ...cliente.demo.ids, tramiteId: paso.respuesta.tramite.id };
      for (const nombre of consultasGuion) expect(await cliente.consultar(nombre, parametros)).toEqual(paso.lecturas[nombre]);
      for (const evento of paso.eventosSocket) expect(ESQUEMAS_EVENTOS_SOCKET[evento.nombre].safeParse(evento.datos).success).toBe(true);
    }
    const ofertas = recibir.mock.calls.map(([dato]) => dato).filter(dato => dato.waId !== '5210000000001');
    expect(ofertas.map(dato => dato.waId)).toEqual(['5210000000002', '5210000000003']);
    for (const dato of ofertas) {
      const mensaje = dato.mensajes[0];
      if (mensaje?.tipo !== 'botones') throw new Error('La oferta del guion debe contener botones');
      expect(mensaje.texto).toMatch(/^Se liberó un espacio para Ultrasonido abdominal en Tepic el .+\. ¿Quieres adelantar tu cita\?$/);
      expect(mensaje.texto).not.toMatch(/Ana|Beto|Carla|521000|019aff/);
      expect(mensaje.botones.map((b: { titulo: string }) => b.titulo)).toEqual(['Sí, adelantar', 'No, gracias']);
      for (const boton of mensaje.botones) expect(boton.payload).toMatch(/^demo\.ref\.[a-zA-Z0-9]+$/);
    }
    const panel = await cliente.consultar('panelHuecos', {});
    expect(panel.map(h => h.estado)).toEqual(['OFRECIDO', 'ASIGNADO']);
    expect(panel[0]!.inicio).toBe('2026-12-03T16:15:00.000Z');
    expect(panel[1]!.ofertas[0]!.estado).toBe('ACEPTADA');
    expect((await cliente.consultar('metricas', {})).kpis).toMatchObject({ huecosLiberados: 2, huecosRecuperados: 1, horasRecursoRecuperadas: 0.5, diasAdelantadosPromedio: 7 });
    cliente.demo.elegirGuion('flujoA');
    expect(cliente.demo.paso().id).toBe('INICIO');
    expect(cliente.demo.ids.hiloId).toBe(IDS.hilo);
  });
  it('Datos simulados con el contrato compartido: valida todas las consultas en cada paso, sin acciones', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const parametros = { tramiteId: IDS.tramite, hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede };
    for (const paso of GUION_FLUJO_A) {
      if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
      else if (paso.espera?.tipo === 'comandos') { for (const comando of paso.espera.comandos) await cliente.enviarComando(comando); }
      else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
      for (const nombre of consultasGuion) {
        const lectura = await cliente.consultar(nombre, parametros);
        expect(RUTAS_CONSULTAS[nombre].respuesta.parse(lectura)).toEqual(paso.lecturas[nombre]);
        expect(JSON.stringify(lectura)).not.toMatch(/"(?:acciones|accion|comando)":/);
      }
      expect(await cliente.consultar('web', {})).not.toHaveProperty('acciones');
    }
    await expect(cliente.consultar('fichaHilo', { hiloId: 'incorrecto' })).rejects.toMatchObject({ tipo: 'CONTRATO' });
  });
  it('mantiene el precio del paquete en 25000 centavos en catálogo, cotización y ficha', () => {
    expect(CATALOGO_DEMO.precioCentavos).toBe(25000);
    expect(DATOS_WEB[2]!.vista.cotizacion?.precioCentavos).toBe(25000);
    for (const paso of GUION_FLUJO_A) {
      if (paso.lecturas.fichaHilo.oferta) expect(paso.lecturas.fichaHilo.oferta.precioCentavos).toBe(25000);
      expect(paso.lecturas.web.catalogo.precioCentavos).toBe(25000);
    }
  });

  it('Datos simulados válidos: todas las respuestas, lecturas y eventos cumplen sus esquemas', () => {
    expect(GUION_FLUJO_A).toHaveLength(14);
    for (const paso of GUION_FLUJO_A) {
      expect(RespuestaComandoSchema.safeParse(paso.respuesta).success).toBe(true);
      expect(RespuestaMensajeWaSchema.safeParse({ mensajes: paso.mensajes }).success).toBe(true);
      for (const [nombre, datos] of Object.entries(paso.lecturas)) {
        const esquema = nombre === 'web' ? ESQUEMAS_DEMO[nombre] : RUTAS_CONSULTAS[nombre as keyof typeof RUTAS_CONSULTAS].respuesta;
        expect(esquema.safeParse(datos).success, `${paso.paso.id}: ${nombre}`).toBe(true);
      }
      for (const evento of paso.eventosSocket) {
        expect(ESQUEMAS_EVENTOS_SOCKET[evento.nombre].safeParse(evento.datos).success).toBe(true);
      }
    }
    for (const paso of DATOS_WEB) {
      expect(ESQUEMAS_DEMO.web.safeParse(paso.vista).success).toBe(true);
      expect(RespuestaComandoSchema.safeParse(paso.respuesta).success).toBe(true);
    }
  });

  it('Continuidad simulada: cambia a WhatsApp y retoma en horario', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    await cliente.enviarComando(iniciar);
    const [oferta] = await cliente.consultar('catalogo', {});
    await cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarServicio', tramiteId: IDS.tramite, payload: { servicioId: oferta!.servicioId } });
    await cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarSede', tramiteId: IDS.tramite, payload: { sedeId: oferta!.sedeId } });
    expect((await cliente.consultar('fichaHilo', { hiloId: IDS.hilo })).codigoContinuacion).toBeNull();
    await cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SolicitarContinuacion', tramiteId: IDS.tramite, payload: { destino: 'whatsapp' } });
    expect((await cliente.consultar('fichaHilo', { hiloId: IDS.hilo })).codigoContinuacion).toBe('CONTINUAR ' + IDS.tokenContinuacion);
    const conversacion = await cliente.enviarMensajeWa({ waId: '5210000000001', texto: 'CONTINUAR ' + IDS.tokenContinuacion });
    expect(GUION_FLUJO_A.find(paso => paso.paso.id === 'CONTINUAR_WA')!.respuesta.siguientePregunta).toMatchObject({ tipo: 'PREGUNTA', casilla: 'horario' });
    expect(conversacion.mensajes[0]).toMatchObject({ tipo: 'texto', texto: expect.stringContaining('horario') });
    expect(cliente.demo.paso().id).toBe('CONTINUAR_WA');
    expect((await cliente.consultar('fichaHilo', { hiloId: IDS.hilo })).telefonoEnmascarado).toBe('•••• 0001');
  });

  it('Eventos de tiempo real: confirma, valida los eventos y permite cancelar la suscripción', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const actualizado = vi.fn();
    const lineaTiempo = vi.fn();
    const dejar = cliente.suscribir('tramite:actualizado', actualizado);
    cliente.suscribir('hilo:linea-tiempo', lineaTiempo);
    for (const paso of GUION_FLUJO_A.slice(1)) {
      if (paso.espera!.tipo === 'comando') await cliente.enviarComando(paso.espera!.comando);
      else if (paso.espera!.tipo === 'comandos') { for (const comando of paso.espera!.comandos) await cliente.enviarComando(comando); }
      else await cliente.enviarMensajeWa(paso.espera!.mensaje);
      if (paso.paso.id === 'CONFIRMADA') break;
    }
    expect(actualizado).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'CONFIRMADA' }));
    expect(lineaTiempo).toHaveBeenLastCalledWith(expect.objectContaining({ eventos: expect.arrayContaining([expect.objectContaining({ tipo: 'CitaConfirmada' })]) }));
    dejar();
    const veces = actualizado.mock.calls.length;
    await cliente.enviarComando({ canal: 'clinica', actor: `recepcion:${IDS.sede}`, tipo: 'RegistrarLlegada', tramiteId: IDS.tramite, payload: { token: IDS.tokenQr } });
    expect(actualizado).toHaveBeenCalledTimes(veces);
    expect(cliente.demo.paso().id).toBe('EN_CLINICA');
  });

  it('Reinicio del guion: restablece también la cotización web y avisa a las vistas', async () => {
    const cliente = new ClienteMock({ latenciaMs: 0 });
    const cambio = vi.fn();
    const dejar = cliente.demo.alCambiar(cambio);
    await cliente.enviarComando(iniciar);
    for (const comando of COMANDOS_WEB_ESPERADOS) await cliente.enviarComando(comando);
    expect((await cliente.consultar('web', {})).cotizacion).not.toBeNull();
    cliente.demo.reiniciar();
    expect(cliente.demo.paso().id).toBe('INICIO');
    expect((await cliente.consultar('web', {})).cotizacion).toBeNull();
    expect(cambio).toHaveBeenCalledTimes(4);
    dejar();
    cliente.demo.reiniciar();
    expect(cambio).toHaveBeenCalledTimes(4);
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
  it('VITE_DEMO=true habilita la bandeja en el cliente creado por configuración', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
    vi.stubGlobal('fetch', peticion);
    try {
      vi.stubEnv('VITE_DEMO', 'false');
      await expect(crearCliente({ modo: 'real' }).consultar('bandeja', {})).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
      expect(peticion).not.toHaveBeenCalled();
      vi.stubEnv('VITE_DEMO', 'true');
      expect(await crearCliente({ modo: 'real' }).consultar('bandeja', {})).toEqual([]);
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it('Ruta de la tabla: resuelve todas las consultas compartidas como GET', async () => {
    const lecturas = GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas;
    const parametros = { tramiteId: IDS.tramite, hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede };
    for (const nombre of consultasGuion) {
      const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(lecturas[nombre]));
      const cliente = new ClienteReal({ url: 'http://api.test/', fetch: peticion, demo: true });
      expect(await cliente.consultar(nombre, parametros)).toEqual(lecturas[nombre]);
      expect(peticion).toHaveBeenCalledExactlyOnceWith(`http://api.test${rutaConsulta(nombre, parametros)}`, { method: 'GET' });
    }
  });

  it('consulta la sesión web real solo con demo y envía únicamente el teléfono', async () => {
    const telefono = '5210000000001';
    const sesion = { pacienteId: IDS.paciente, nombreVisible: 'Ana P.', tramitesEnProceso: [] };
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(sesion));
    await expect(new ClienteReal({ fetch: peticion }).consultar('sesionWebDemo', { telefono }))
      .rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
    expect(peticion).not.toHaveBeenCalled();
    expect(await new ClienteReal({ fetch: peticion, demo: true }).consultar('sesionWebDemo', { telefono })).toEqual(sesion);
    expect(peticion).toHaveBeenCalledExactlyOnceWith('http://localhost:4000/api/demo/sesion-web/' + telefono, { method: 'GET' });
  });

  it('Bandeja fuera de demo: no consulta la red; con demo valida la respuesta', async () => {
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
    await expect(new ClienteReal({ fetch: peticion }).consultar('bandeja', {})).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
    expect(peticion).not.toHaveBeenCalled();
    expect(await new ClienteReal({ fetch: peticion, demo: true }).consultar('bandeja', {})).toEqual([]);
    expect(peticion).toHaveBeenCalledTimes(1);
  });

  it('Lectura real mal formada: no entrega una cita sin zona horaria', async () => {
    const cita = { ...GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.citasPaciente[0] } as Record<string, unknown>;
    delete cita.zonaHoraria;
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json([cita]));
    await expect(new ClienteReal({ fetch: peticion }).consultar('citasPaciente', { pacienteId: IDS.paciente })).rejects.toMatchObject({ tipo: 'CONTRATO' });
    expect(peticion).toHaveBeenCalledExactlyOnceWith(`http://localhost:4000/api/pacientes/${IDS.paciente}/citas`, { method: 'GET' });
  });

  it('rechaza parámetros inválidos sin acceder a la red y mantiene las consultas de demo aisladas', async () => {
    const peticion = vi.fn<typeof fetch>();
    const cliente = new ClienteReal({ fetch: peticion, demo: true });
    await expect(cliente.consultar('llegadasSede', { sedeId: 'incorrecto' })).rejects.toMatchObject({ tipo: 'CONTRATO' });
    for (const nombre of ['web'] as const) await expect(cliente.consultar(nombre, {})).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
    expect(peticion).not.toHaveBeenCalled();
  });
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
    const peticion = vi.fn<typeof fetch>().mockResolvedValue(Response.json(GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.lineaTiempo));
    const cliente = new ClienteReal({ fetch: peticion });
    expect(await cliente.consultar('lineaTiempo', { hiloId: IDS.hilo })).toEqual(GUION_FLUJO_A.find(paso => paso.paso.id === 'CONFIRMADA')!.lecturas.lineaTiempo);
    expect(peticion.mock.calls[0]![0]).toBe(`http://localhost:4000/api/hilos/${IDS.hilo}/linea-tiempo`);
    await expect(cliente.consultar('web', {})).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE' });
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
