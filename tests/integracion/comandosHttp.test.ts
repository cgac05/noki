import { afterAll, beforeAll, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { RelayOutbox, RelojDemo, TemporizadoresTramite } from '../../packages/application/src/index.ts';
import { ConsumidorStreams, WorkerTemporizadores } from '../../packages/adapters/in-events/src/index.ts';
import { ProgramadorBullMQ, PublicadorRedisStreams } from '../../packages/adapters/out-redis/src/index.ts';
import { crearTiempoReal } from '../../apps/api/src/tiempoReal.ts';
import { clienteTiempoReal } from '../../apps/api/src/pruebas.ts';
import { Pool } from 'pg';
import { comprobarLecturasApi, comprobarSoloLectura } from '../unit/api/bateriaLecturasApi.ts';
import { migrar, OutboxPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import { crearApi } from '../../apps/api/src/crearApi.ts';
import { componerComandos } from '../../apps/api/src/componerComandos.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import type { HiloId, PacienteId, SedeId, ServicioId, TramiteId } from '../../packages/domain/src/index.ts';
import { idDemo, PACIENTES_DEMO } from '../../apps/api/src/semilla/datosDemo.ts';
import { CuerpoErrorSchema, RespuestaComandoSchema, RespuestaMensajeWaSchema, RUTAS_CONSULTAS, type MensajeBot } from '../../packages/contracts/src/index.ts';

const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const admin = new Pool({ connectionString: url.toString() });
const esquema = 'comandos_http';
url.searchParams.set('options', '-c search_path=' + esquema + ',public');
const pool = new Pool({ connectionString: url.toString() });

afterAll(async () => {
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS comandos_http CASCADE');
  await admin.end();
});

beforeAll(async () => {
  await admin.query('CREATE SCHEMA comandos_http');
  await migrar(url.toString(), undefined, esquema);
  await sembrar(url.toString());
});

it('Cotizar desde el call center y reintentar por HTTP con eventos persistidos', async () => {
  const opciones = {
    databaseUrl: url.toString(), sdMockUrl: 'http://127.0.0.1:1',
    tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes', demo: true,
  };
  const deps = componerComandos(opciones, () => {});
  const app = crearApi({ ...opciones, redisUrl: 'redis://127.0.0.1:1', logger: false,
    origen: 'https://demo.example', comandos: deps });
  const enviar = (payload: object, clave = deps.ids.nuevo(), extras: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: '/api/comandos', payload,
      headers: { 'idempotency-key': clave, ...extras } });
  try {
    await comprobarLecturasApi(deps.lecturas);
    const clave = deps.ids.nuevo();
    const inicio = { tipo: 'IniciarTramite', canal: 'callcenter', actor: 'asesor:demo',
      payload: { tipoTramite: 'AGENDAR', contacto: '0000000001' } };
    const peticion = await enviar(inicio, clave);
    expect(peticion.statusCode).toBe(200);
    const { tramite } = RespuestaComandoSchema.parse(peticion.json());
    expect((await enviar(inicio, clave)).json()).toEqual(peticion.json());
    const basico = { canal: 'callcenter', actor: 'asesor:demo', tramiteId: tramite.id };
    const { rows: [oferta] } = await pool.query<{ servicio_id: string; sede_id: string }>(
      'SELECT servicio_id, sede_id FROM oferta_sede ORDER BY servicio_id, sede_id LIMIT 1',
    );
    if (!oferta) throw new Error('Falta una oferta de demo.');
    const servicio = await enviar({ ...basico, tipo: 'SeleccionarServicio', payload: { servicioId: oferta.servicio_id } });
    expect(RespuestaComandoSchema.parse(servicio.json()).eventos.map(({ tipo }) => tipo)).toEqual(['ServicioSeleccionado']);
    const sede = await enviar({ ...basico, tipo: 'SeleccionarSede', payload: { sedeId: oferta.sede_id } });
    const cotizacion = RespuestaComandoSchema.parse(sede.json());
    await enviar({ ...basico, tipo: 'SeleccionarSede', payload: { sedeId: oferta.sede_id } });
    expect(cotizacion.tramite.estado).toBe('COTIZADO');
    expect(cotizacion.eventos.map(({ tipo }) => tipo)).toEqual(['SedeSeleccionada', 'CotizacionGenerada']);

    const identificar = { ...basico, actor: 'paciente', tipo: 'IdentificarPaciente',
      payload: { paso: 'DESTINATARIO', para: 'MI' } };
    const sinToken = await enviar(identificar);
    expect(sinToken.statusCode).toBe(403);
    expect(CuerpoErrorSchema.parse(sinToken.json()).error.codigo).toBe('STEP_UP_REQUERIDO');
    const leida = await deps.lecturas.tramite(tramite.id as Parameters<typeof deps.lecturas.tramite>[0]);
    if (!leida) throw new Error('Falta el trámite.');
    const ahora = new Date();
    const contexto = await deps.tokens.emitir({
      jti: deps.ids.nuevo(), uso: 'CONTEXTO', tramiteId: leida.id, hiloId: leida.hiloId, nivel: 1,
      canalOrigen: 'callcenter', metodo: 'TOKEN_CC', emitidoEn: ahora.toISOString(),
      expiraEn: new Date(ahora.getTime() + 60_000).toISOString(),
    });
    const claveIdentificacion = deps.ids.nuevo();
    const aceptada = await enviar(identificar, claveIdentificacion, { authorization: 'Bearer ' + contexto });
    expect(aceptada.statusCode).toBe(200);
    expect(RespuestaComandoSchema.parse(aceptada.json()).siguientePregunta)
      .toMatchObject({ casilla: 'paciente', pista: { paso: 'CONFIRMAR' } });
    expect((await enviar(identificar, claveIdentificacion)).statusCode).toBe(403);
    const cors = await app.inject({ method: 'OPTIONS', url: '/api/comandos', headers: {
      origin: 'https://otro.example', 'access-control-request-method': 'POST',
    } });
    expect(cors.headers['access-control-allow-origin']).not.toBe('https://otro.example');
  } finally {
    await app.close();
    await deps.cerrar();
  }
});

function opciones(mensajes: MensajeBot[]) {
  return mensajes.flatMap(mensaje => {
    if (mensaje.tipo === 'botones') return mensaje.botones;
    if (mensaje.tipo === 'lista') return mensaje.secciones.flatMap(seccion => seccion.filas);
    return [];
  });
}

it('Flujo A por HTTP. Un token de un solo uso no funciona la segunda vez', async () => {
  const sd = crearSdMock(false);
  const sdMockUrl = await sd.listen({ host: '127.0.0.1', port: 0 });
  const deps = componerComandos({
    databaseUrl: url.toString(), sdMockUrl, tokenSecret: 'secreto-sintetico-de-integracion-32-bytes', demo: true,
  }, () => {});
  const app = crearApi({ databaseUrl: url.toString(), redisUrl: 'redis://127.0.0.1:1',
    logger: false, comandos: deps, consultas: deps.consultas, whatsapp: deps.whatsapp });
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) throw new Error('Falta Redis para tiempo real.');
  const prefijo = 'prueba-tiempo-real:' + deps.ids.nuevo() + ':';
  const tiempoReal = crearTiempoReal(app.server, 'https://demo.example', deps.lecturas, deps.reloj);
  const lector = new ConsumidorStreams(redisUrl, 'tiempo-real-prueba', deps.procesados, tiempoReal.manejar, prefijo);
  const publicador = new PublicadorRedisStreams(redisUrl, prefijo);
  const outbox = new OutboxPostgres(url.toString());
  const relay = new RelayOutbox(outbox, publicador, deps.reloj);
  const endpoint = await app.listen({ host: '127.0.0.1', port: 0 });
  const socket = clienteTiempoReal(endpoint, { transports: ['websocket'], autoConnect: false });
  const ana = PACIENTES_DEMO[0];
  if (!ana) throw new Error('Falta Ana en la semilla.');
  const enviar = async (ruta: string, payload: object) => {
    const respuesta = await fetch(endpoint + ruta, {
      method: 'POST', headers: { 'idempotency-key': deps.ids.nuevo(), 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await respuesta.text();
    return { statusCode: respuesta.status, body, json: () => JSON.parse(body) as unknown };
  };
  const cc = async (tipo: string, payload: object, tramiteId?: string) => {
    const respuesta = await enviar('/api/comandos', { tipo, payload, tramiteId, canal: 'callcenter', actor: 'asesor:demo' });
    expect(respuesta.statusCode, respuesta.body).toBe(200);
    return RespuestaComandoSchema.parse(respuesta.json());
  };
  const wa = async (payload: object) => {
    const respuesta = await enviar('/api/canales/wa/mensajes', { waId: ana.wa, ...payload });
    expect(respuesta.statusCode, respuesta.body).toBe(200);
    const { mensajes } = RespuestaMensajeWaSchema.parse(respuesta.json());
    const textos = mensajes.flatMap(mensaje => mensaje.tipo === 'flow'
      ? [mensaje.titulo, ...mensaje.campos.map(campo => campo.etiqueta)] : [mensaje.texto]);
    for (const textoVisible of [...textos, ...opciones(mensajes).map(opcion => opcion.titulo)]) {
      expect(textoVisible).not.toMatch(/\b(?:callcenter|whatsapp|clinica|ORDEN_MEDICA|ACEPTAR_PREPARACION|DATOS_PACIENTE|CONSENTIMIENTO)\b|\d{4}-\d{2}-\d{2}T/u);
      expect(textoVisible).not.toMatch(/^(?:servicio|sede|paciente|requisitos|elegibilidad|horario|web|app)$/u);
    }
    return mensajes;
  };
  const elegir = async (mensajes: MensajeBot[], titulo?: RegExp) => {
    const fila = opciones(mensajes).find(opcion => !titulo || titulo.test(opcion.titulo));
    if (!fila) throw new Error('Falta la opción esperada: ' + String(titulo));
    return wa({ payloadBoton: fila.payload });
  };
  const leer = async (ruta: string) => {
    const respuesta = await fetch(endpoint + ruta);
    const body = await respuesta.text();
    expect(respuesta.status, body).toBe(200);
    return JSON.parse(body) as unknown;
  };

  try {
    const catalogo = RUTAS_CONSULTAS.catalogo.respuesta.parse(await leer('/api/catalogo'));
    const oferta = catalogo.find(fila => fila.servicio === 'Química sanguínea' && fila.sede === 'Clínica Tepic');
    if (!oferta) throw new Error('Falta la oferta de Tepic.');
    const { tramite } = await cc('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: ana.wa.slice(-10) });
    await cc('SeleccionarServicio', { servicioId: oferta.servicioId }, tramite.id);
    await cc('SeleccionarSede', { sedeId: oferta.sedeId }, tramite.id);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    const unirse = (sala: string) => new Promise<boolean>(resolver => socket.emit('sala:unirse', sala, resolver));
    expect(await unirse('sede:ajena')).toBe(false);
    expect(await unirse('tramite:' + tramite.id)).toBe(true);
    expect(await unirse('hilo:' + tramite.hiloId)).toBe(true);
    expect(await unirse('sede:' + oferta.sedeId)).toBe(true);
    expect(await unirse('admin')).toBe(true);
    const vistas: unknown[] = [];
    const lineas: unknown[] = [];
    const indicadores: unknown[] = [];
    const filaClinica: unknown[] = [];
    socket.on('tramite:actualizado', valor => vistas.push(valor));
    socket.on('hilo:linea-tiempo', valor => lineas.push(valor));
    socket.on('admin:metricas', valor => indicadores.push(valor));
    socket.on('sede:fila', valor => filaClinica.push(valor));
    const permiso = await cc('SolicitarContinuacion', { destino: 'whatsapp' }, tramite.id);
    expect(permiso.eventos.map(({ tipo }) => tipo)).toContain('ConsentimientoContactoWA');

    const fichaRuta = '/api/hilos/' + tramite.hiloId + '/ficha';
    const ficha = RUTAS_CONSULTAS.fichaHilo.respuesta.parse(await leer(fichaRuta));
    expect(ficha.telefonoEnmascarado).toBe('•••• 0001');
    expect(ficha.nombrePila).toBeNull();
    if (!ficha.codigoContinuacion) throw new Error('Falta el token de continuación.');
    const texto = 'CONTINUAR ' + ficha.codigoContinuacion;
    let mensajes = await wa({ texto });
    expect(JSON.stringify(mensajes)).toContain('Clínica Tepic');
    expect(mensajes[0]).toMatchObject({ texto: expect.stringContaining('Lo iniciaste por teléfono.') });
    expect(opciones(mensajes)[0]?.titulo).toMatch(/^[\p{L}]+ \d+ [\p{L}]+ · 09:00$/u);
    expect(await wa({ texto })).toMatchObject([{ tipo: 'texto' }]);
    mensajes = await elegir(mensajes, / · 09:00$/u);
    while (!opciones(mensajes).some(({ titulo }) => titulo === 'Para mí')) {
      expect(opciones(mensajes).map(({ titulo }) => titulo)).toContain('Acepto la preparación');
      mensajes = await elegir(mensajes, /Acepto la preparación/u);
    }
    mensajes = await elegir(mensajes, /^Para mí$/u);
    expect(mensajes[0]).toMatchObject({ texto: '¿Eres alguna de estas personas?' });
    mensajes = await elegir(mensajes, /^Soy Ana P\.$/u);
    expect(mensajes).toMatchObject([{ tipo: 'flow', campos: [{ id: 'fechaNac', captura: 'sensitive' }] }]);
    const intentosAntes = await pool.query("SELECT count(*)::int AS total FROM evento WHERE tipo = 'IntentoVerificacionFallido'");
    const incompleto = await wa({ flowResponse: { fechaNac: 'fecha-no-valida' } });
    expect(incompleto.some(mensaje => mensaje.tipo === 'flow')).toBe(true);
    expect((await pool.query("SELECT count(*)::int AS total FROM evento WHERE tipo = 'IntentoVerificacionFallido'")).rows)
      .toEqual(intentosAntes.rows);
    const incorrecta = await wa({ flowResponse: { fechaNac: '1990-01-02' } });
    expect(JSON.stringify(incorrecta)).not.toContain('1990-01-02');
    await elegir(incorrecta, /^Soy Ana P\.$/u);
    mensajes = await wa({ flowResponse: { fechaNac: ana.fechaNac } });
    mensajes = await elegir(mensajes, /^Confirmar cita$/u);
    expect(mensajes[0]).toMatchObject({ texto: expect.stringMatching(/Cita confirmada para [\p{L}]+ \d+ de [\p{L}]+, 09:00/u) });
    expect(JSON.stringify(mensajes)).toContain('Tu QR está en la App');
    expect(JSON.stringify(mensajes)).not.toContain(ana.fechaNac);

    const contexto = RUTAS_CONSULTAS.contextoDemo.respuesta.parse(await leer('/api/demo/contexto'));
    expect(contexto).toMatchObject({ hiloId: tramite.hiloId, pacienteId: ana.id, sedeId: oferta.sedeId });
    const rutaCitas = '/api/pacientes/' + ana.id + '/citas';
    const citas = RUTAS_CONSULTAS.citasPaciente.respuesta.parse(await leer(rutaCitas));
    const cita = citas.find(item => item.tramite.id === tramite.id);
    if (!cita) throw new Error('Falta la cita confirmada.');
    const lecturaRepetida = RUTAS_CONSULTAS.citasPaciente.respuesta.parse(await leer(rutaCitas));
    expect(lecturaRepetida.find(item => item.tramite.id === tramite.id)?.tokenQr).toBe(cita.tokenQr);
    expect(cita.tramite.horario).not.toHaveProperty('expiraEn');
    const parteFirmada = cita.tokenQr.split('.')[1];
    if (!parteFirmada) throw new Error('Falta el payload del QR.');
    const datosQr = JSON.parse(Buffer.from(parteFirmada, 'base64url').toString('utf8')) as unknown;
    expect(datosQr).toMatchObject({ jti: cita.tramite.horario?.reservaId, uso: 'LLEGADA' });
    expect(datosQr).not.toHaveProperty('folio');
    expect(JSON.stringify(datosQr)).not.toContain(ana.fechaNac);
    const registrar = { canal: 'clinica', actor: 'recepcion:demo', tipo: 'RegistrarLlegada',
      tramiteId: tramite.id, payload: { token: cita.tokenQr } };
    const llegada = await enviar('/api/comandos', registrar);
    expect(llegada.statusCode, llegada.body).toBe(200);
    expect(RespuestaComandoSchema.parse(llegada.json()).tramite.estado).toBe('EN_CLINICA');
    const repetida = await enviar('/api/comandos', registrar);
    expect(repetida.statusCode).toBe(422);
    expect(CuerpoErrorSchema.parse(repetida.json()).error.datos?.['regla']).toBe('TOKEN_INVALIDO');
    const despues = RUTAS_CONSULTAS.fichaHilo.respuesta.parse(await leer(fichaRuta));
    expect(despues).toMatchObject({ codigoContinuacion: null, soloLectura: true, nombrePila: 'Ana' });
    await comprobarSoloLectura(deps.lecturas, tramite.hiloId as HiloId, true);
    const guardado = await deps.lecturas.tramite(tramite.id as Parameters<typeof deps.lecturas.tramite>[0]);
    if (!guardado?.sedeId || !guardado.pacienteId) throw new Error('Faltan datos de la cita.');
    await comprobarLecturasApi(deps.lecturas, {
      tramiteId: guardado.id, hiloId: guardado.hiloId, pacienteId: guardado.pacienteId,
      sedeId: guardado.sedeId, inicio: cita.inicio,
    });
    expect(new Set(despues.lineaTiempo.map(({ canal }) => canal))).toEqual(new Set(['callcenter', 'whatsapp', 'clinica']));
    await lector.iniciar();
    expect(await relay.publicarPendientes()).toBe(true);
    await lector.consumirPendientes();
    await expect.poll(() => filaClinica.length).toBe(1);
    expect(vistas).toContainEqual(expect.objectContaining({ id: tramite.id, estado: 'EN_CLINICA' }));
    expect(lineas).toContainEqual(expect.objectContaining({ hiloId: tramite.hiloId }));
    expect(indicadores).toContainEqual(expect.objectContaining({ llegadasRegistradas: 1 }));
    lector.detener();
    lector.cerrar();
    const reiniciado = new ConsumidorStreams(redisUrl, 'tiempo-real-prueba', deps.procesados, tiempoReal.manejar, prefijo);
    try {
      const { rows: [guardado] } = await pool.query<{ clave: string; correlacion: string; ts: Date; version: number }>(
        "SELECT idempotency_key AS clave, correlation_id AS correlacion, ts, version FROM evento WHERE tramite_id = $1 AND tipo = 'PacienteLlego'", [tramite.id],
      );
      if (!guardado) throw new Error('Falta la llegada persistida.');
      await publicador.publicar(0, {
        tipo: 'PacienteLlego', tramiteId: tramite.id as TramiteId, hiloId: tramite.hiloId as HiloId,
        canal: 'clinica', actor: 'recepcion:demo', nivelAuth: 0, version: guardado.version,
        ts: guardado.ts.toISOString(), idempotencyKey: guardado.clave, correlationId: guardado.correlacion,
        payload: { sedeId: oferta.sedeId as SedeId },
      });
      await reiniciado.iniciar();
      await reiniciado.consumirPendientes();
      expect(filaClinica).toHaveLength(1);
    } finally { reiniciado.cerrar(); }
    RUTAS_CONSULTAS.tramite.respuesta.parse(await leer('/api/tramites/' + tramite.id));
    RUTAS_CONSULTAS.tramitesAbiertos.respuesta.parse(await leer('/api/pacientes/' + ana.id + '/tramites-abiertos'));
    RUTAS_CONSULTAS.lineaTiempo.respuesta.parse(await leer('/api/hilos/' + tramite.hiloId + '/linea-tiempo'));
    RUTAS_CONSULTAS.llegadasSede.respuesta.parse(await leer('/api/sedes/' + oferta.sedeId + '/llegadas'));
    expect(RUTAS_CONSULTAS.bandeja.respuesta.parse(await leer('/api/demo/bandeja'))).toEqual([]);
    expect(RUTAS_CONSULTAS.metricas.respuesta.parse(await leer('/api/admin/kpis')).kpis)
      .toMatchObject({ citasConfirmadas: 1, llegadasRegistradas: 1, tramitesRecuperados: 1 });
    const nueva = await cc('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: ana.wa.slice(-10) });
    expect(nueva.tramite.hiloId).toBe(tramite.hiloId);
    await comprobarSoloLectura(deps.lecturas, tramite.hiloId as HiloId, false);
    expect(RUTAS_CONSULTAS.fichaHilo.respuesta.parse(await leer(fichaRuta)).soloLectura).toBe(false);
    await cc('SeleccionarServicio', { servicioId: oferta.servicioId }, nueva.tramite.id);
    await cc('SeleccionarSede', { sedeId: oferta.sedeId }, nueva.tramite.id);
  } finally {
    socket.close();
    await tiempoReal.cerrar();
    await app.close();
    await deps.cerrar();
    lector.detener();
    lector.cerrar();
    publicador.cerrar();
    await outbox.cerrar();
    const redis = new Redis(redisUrl);
    try { await redis.del(...Array.from({ length: 8 }, (_, indice) => prefijo + indice), prefijo + 'fallidos'); }
    finally { redis.disconnect(); }
    await sd.close();
  }
});

it('publica, programa y expira el hold desde la ruta del reloj con la API compuesta', async () => {
  const databaseUrl = url.toString();
  const redisUrl = process.env['REDIS_URL']!;
  const nombre = 'prueba-temporizadores-api-' + Date.now();
  const prefijo = nombre + ':';
  const redis = new Redis(redisUrl);
  const sd = crearSdMock(false);
  const sdMockUrl = await sd.listen({ host: '127.0.0.1', port: 0 });
  const deps = componerComandos({
    databaseUrl, sdMockUrl,
    tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes', demo: true,
  }, () => {});
  const programador = new ProgramadorBullMQ(redisUrl, nombre);
  const temporizadores = new TemporizadoresTramite({ ...deps, programador });
  const crearWorker = () => new WorkerTemporizadores(redisUrl, nombre, deps.reloj, trabajo => temporizadores.ejecutar(trabajo), () => {});
  let worker = crearWorker();
  const crearLector = () => new ConsumidorStreams(redisUrl, nombre, deps.procesados, async evento => {
    if (evento.tramiteId) await temporizadores.reconciliar(evento.tramiteId);
  }, prefijo);
  let lector = crearLector();
  const publicador = new PublicadorRedisStreams(redisUrl, prefijo);
  const outbox = new OutboxPostgres(databaseUrl);
  const relay = new RelayOutbox(outbox, publicador, deps.reloj);
  const app = crearApi({
    databaseUrl, redisUrl, logger: false, comandos: deps, consultas: deps.consultas,
    relojDemo: new RelojDemo(deps.reloj, programador),
  });
  const comando = () => ({
    canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false, factores: new Set<never>(),
    idempotencyKey: deps.ids.nuevo(), correlationId: deps.ids.nuevo(),
  } as const);
  try {
    const { tramite: { id } } = await deps.casos.iniciar('AGENDAR', '0000000018', comando());
    await deps.casos.asignarPaciente(id, PACIENTES_DEMO[0].id as PacienteId, comando());
    await deps.casos.seleccionarServicio(id, idDemo(10) as ServicioId, comando());
    await deps.casos.seleccionarSede(id, idDemo(1) as SedeId, comando());
    await deps.casos.cumplirRequisito(id, 'ACEPTAR_PREPARACION', comando());
    const inicio = new Date(deps.reloj.ahora().getTime() + 24 * 3_600_000).toISOString();
    const { tramite, eventos } = await deps.casos.reservar(id, inicio, comando());
    await lector.iniciar();
    await relay.publicarPendientes();
    await lector.consumirPendientes();
    expect((await programador.cola.getJob('HOLD-' + id))?.data.reservaId).toBe(tramite.horario?.reservaId);
    const reservado = eventos.find(evento => evento.tipo === 'HorarioReservado');
    if (!reservado) throw new Error('Falta HorarioReservado.');
    await publicador.publicar(0, reservado);
    await lector.consumirPendientes();
    expect((await programador.cola.getDelayed()).filter(trabajo => trabajo.data.tipo === 'HOLD' && trabajo.data.tramiteId === id)).toHaveLength(1);
    await worker.cerrar();
    lector.cerrar();
    const respuesta = await app.inject({ method: 'POST', url: '/api/demo/reloj', payload: { adelantarMinutos: 11 } });
    expect(respuesta.statusCode).toBe(200);
    expect((await deps.tramites.obtener(id))?.estado).toBe('HORARIO_RESERVADO');
    worker = crearWorker();
    lector = crearLector();
    await lector.iniciar();
    await expect.poll(async () => (await deps.tramites.obtener(id))?.estado, { timeout: 4_500 }).toBe('LISTO_PARA_RESERVAR');
    await expect.poll(async () => (await pool.query('SELECT estado FROM reserva WHERE id = $1',
      [tramite.horario?.reservaId])).rows).toEqual([{ estado: 'EXPIRADA' }]);
    expect((await pool.query("SELECT actor FROM evento WHERE tramite_id = $1 AND tipo = 'ReservaExpirada'", [id])).rows)
      .toEqual([{ actor: 'sistema' }]);
    await publicador.publicar(0, { ...reservado, idempotencyKey: deps.ids.nuevo() });
    await lector.consumirPendientes();
    await expect.poll(() => programador.cola.getJob('HOLD-' + id)).toBeUndefined();
    const siguiente = await deps.casos.reservar(id, inicio, comando());
    const anterior = siguiente.eventos.find(evento => evento.tipo === 'HorarioReservado');
    if (!anterior) throw new Error('Falta el nuevo HorarioReservado.');
    await relay.publicarPendientes();
    await lector.consumirPendientes();
    // Otro escenario de esta suite ya confirmó el primer folio del simulador.
    const primeraCitaSimulada = await sd.inject({
      method: 'POST', url: '/agenda/citas',
      payload: { reservaId: deps.ids.nuevo(), sedeId: idDemo(1), servicioId: idDemo(10), inicio },
    });
    expect(primeraCitaSimulada.statusCode).toBe(200);
    await deps.casos.confirmar(id, comando());
    await relay.publicarPendientes();
    await lector.consumirPendientes();
    await expect.poll(() => programador.cola.getJob('HOLD-' + id)).toBeUndefined();
    expect(await programador.cola.getJob('INASISTENCIA-' + id)).toBeDefined();
    await publicador.publicar(0, { ...anterior, idempotencyKey: deps.ids.nuevo() });
    await lector.consumirPendientes();
    await expect.poll(() => programador.cola.getJob('HOLD-' + id)).toBeUndefined();
    expect(await programador.cola.getJob('INASISTENCIA-' + id)).toBeDefined();
  } finally {
    lector.cerrar();
    await worker.cerrar();
    await programador.cola.obliterate({ force: true });
    await programador.cerrar();
    publicador.cerrar();
    await outbox.cerrar();
    await app.close();
    await deps.cerrar();
    await sd.close();
    await redis.del(...Array.from({ length: 8 }, (_, particion) => prefijo + particion));
    redis.disconnect();
  }
}, 15_000);
