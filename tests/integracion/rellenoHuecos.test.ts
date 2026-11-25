import { expect, it } from 'vitest';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { Client } from 'pg';

it('migra las tablas de huecos, intereses y ofertas', async () => {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) throw new Error('Falta TEST_DATABASE_URL');
  await migrar(url);
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    const { rows } = await db.query<{ hueco: string; interes: string; oferta: string }>(`
      SELECT to_regclass('hueco')::text AS hueco, to_regclass('interes_adelanto')::text AS interes,
        to_regclass('oferta_hueco')::text AS oferta
    `);
    expect(rows[0]).toEqual({ hueco: 'hueco', interes: 'interes_adelanto', oferta: 'oferta_hueco' });
  } finally { await db.end(); }
});

import { crearApi } from '../../apps/api/src/crearApi.ts';
import { componerComandos } from '../../apps/api/src/componerComandos.ts';
import { crearTiempoReal } from '../../apps/api/src/tiempoReal.ts';
import { clienteTiempoReal } from '../../apps/api/src/pruebas.ts';
import { idDemo } from '../../apps/api/src/semilla/datosDemo.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { RUTAS_CONSULTAS, RespuestaMensajeWaSchema, type DatosMensajesWa } from '../../packages/contracts/src/index.ts';
import type { NotificadorWa } from '../../packages/application/src/index.ts';
import type { EventoDominio, ReservaId, TramiteId } from '../../packages/domain/src/index.ts';

it.each(['secuencial', 'oleada'])('recorre el flujo de huecos en Postgres en modo %s', async modo => {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
  if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test');
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  const esquema = 'flujo_c_' + process.pid;
  await db.query('CREATE SCHEMA ' + esquema);
  url.searchParams.set('options', '-c search_path=' + esquema + ',public');
  const sd = crearSdMock();
  const sdMockUrl = await sd.listen({ host: '127.0.0.1', port: 0 });
  let enviar: NotificadorWa['enviar'] = async () => {};
  const origen = 'https://demo.example';
  const deps = componerComandos({
    databaseUrl: url.toString(), sdMockUrl, tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes', demo: true,
  }, () => {}, { enviar: (waId, mensajes) => enviar(waId, mensajes) });
  const app = crearApi({ databaseUrl: url.toString(), redisUrl: 'redis://127.0.0.1:1',
    logger: false, origen, comandos: deps, consultas: deps.consultas, whatsapp: deps.whatsapp });
  const io = crearTiempoReal(app.server, origen, deps.lecturas, deps.reloj, true, deps.huecos.reenviar);
  enviar = io.enviar;
  const sockets: ReturnType<typeof clienteTiempoReal>[] = [];
  try {
    await migrar(url.toString(), undefined, esquema);
    const horaLocal = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mazatlan', hour: '2-digit', hourCycle: 'h23' }).format(deps.reloj.ahora()));
    if (horaLocal < 7 || horaLocal >= 22) deps.reloj.adelantar(((8 - horaLocal + 24) % 24) * 3_600_000);
    await sembrar(url.toString(), deps.reloj.ahora());
    if (modo === 'oleada') {
      const { rows: [ana] } = await db.query<{ inicio: Date }>('SELECT inicio FROM ' + esquema + '.reserva WHERE id = $1', [idDemo(220)]);
      if (!ana) throw new Error('Falta la cita de Ana');
      deps.reloj.adelantar(ana.inicio.getTime() - 16 * 3_600_000 - deps.reloj.ahora().getTime());
      await db.query(`UPDATE ${esquema}.interes_adelanto SET ventana = tstzrange($1, upper(ventana), '[)')`, [deps.reloj.ahora()]);
      const definir = await db.query<{ datos: object; sede_id: string; servicio_id: string; inicio: Date; recurso_id: string }>(`
        SELECT t.datos, t.sede_id, t.servicio_id, r.inicio, r.recurso_id
        FROM ${esquema}.tramite t JOIN ${esquema}.reserva r ON r.tramite_id=t.id WHERE t.id=$1`, [idDemo(212)]);
      const base = definir.rows[0];
      if (!base) throw new Error('Falta cita de referencia');
      const candidato = idDemo(23);
      const contacto = idDemo(33);
      const hilo = idDemo(203);
      const tramite = idDemo(213);
      const reserva = idDemo(223);
      const inicio = new Date(base.inicio.getTime() + 7 * 86_400_000).toISOString();
      await db.query(`INSERT INTO ${esquema}.paciente (id,nombre,ap_paterno,ap_materno,fecha_nac,sexo)
        VALUES ($1,'Diego','Paciente','Demo','1990-01-01','M')`, [candidato]);
      await db.query(`INSERT INTO ${esquema}.contacto_canal (id,canal,valor_externo) VALUES ($1,'whatsapp','5210000000004')`, [contacto]);
      await db.query(`INSERT INTO ${esquema}.hilo_atencion (id,paciente_id,contacto_id,ultimo_canal)
        VALUES ($1,$2,$3,'whatsapp')`, [hilo, candidato, contacto]);
      await db.query(`UPDATE ${esquema}.contacto_canal SET hilo_id=$1 WHERE id=$2`, [hilo, contacto]);
      await db.query(`INSERT INTO ${esquema}.vinculo (contacto_id,paciente_id,relacion,metodo,nivel,ultimo_uso)
        VALUES ($1,$2,'TITULAR','FLOW_DECLARADO',1,$3)`, [contacto, candidato, deps.reloj.ahora()]);
      await db.query(`INSERT INTO ${esquema}.tramite (id,hilo_id,estado,tipo,paciente_id,sede_id,servicio_id,
        folio_externo,version,ultimo_canal,canal_origen,datos)
        VALUES ($1,$2,'CONFIRMADA','AGENDAR',$3,$4,$5,'90000003',1,'whatsapp','whatsapp',
          $6::jsonb || jsonb_build_object('id',$1::uuid::text,'hiloId',$2::uuid::text,'datos',
          ($6::jsonb->'datos') || jsonb_build_object('pacienteId',$3::uuid::text,'folio','90000003',
          'horario',jsonb_build_object('inicio',$7::text,'reservaId',$8::text,'expiraEn',$9::text))))`,
      [tramite, hilo, candidato, base.sede_id, base.servicio_id, base.datos, inicio, reserva, deps.reloj.ahora().toISOString()]);
      await db.query(`INSERT INTO ${esquema}.reserva (id,sede_id,recurso_id,inicio,tramite_id,estado,folio)
        VALUES ($1,$2,$3,$4,$5,'CONFIRMADA','90000003')`, [reserva, base.sede_id, base.recurso_id, inicio, tramite]);
      await db.query(`INSERT INTO ${esquema}.interes_adelanto
        (id,tramite_id,paciente_id,servicio_id,sedes_aceptadas,ventana,estado,registrado_en)
        VALUES ($1,$2,$3,$4,ARRAY[$5::uuid],tstzrange($6,$7,'[)'),'ACTIVO',$6)`,
      [idDemo(233), tramite, candidato, base.servicio_id, base.sede_id, deps.reloj.ahora(), inicio]);
    }
    const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    const abrir = async () => {
      const socket = clienteTiempoReal(baseUrl, { transports: ['websocket'], autoConnect: false });
      sockets.push(socket);
      await new Promise<void>((resolver, rechazar) => {
        socket.once('connect', resolver);
        socket.once('connect_error', rechazar);
        socket.connect();
      });
      return socket;
    };
    const unir = async (socket: ReturnType<typeof clienteTiempoReal>, sala: string) => {
      expect(await socket.timeout(2_000).emitWithAck('sala:unirse', sala)).toBe(true);
    };
    const wa = await abrir();
    const admin = await abrir();
    await unir(wa, 'wa:5210000000001');
    await unir(admin, 'admin');
    const recibirWa = () => new Promise<DatosMensajesWa>(resolver => wa.once('wa:mensajes', resolver));
    const recibirKpis = () => new Promise<Record<string, number>>(resolver => admin.once('admin:metricas', resolver));
    const eventoDb = async (tipo: string): Promise<EventoDominio> => {
      const { rows } = await db.query<EventoDominio>(`
        SELECT tipo, tramite_id AS "tramiteId", hilo_id AS "hiloId", canal, actor, nivel_auth AS "nivelAuth", version,
          correlation_id AS "correlationId", idempotency_key AS "idempotencyKey", ts::text, payload
        FROM ${esquema}.evento WHERE tipo = $1 ORDER BY id DESC LIMIT 1
      `, [tipo]);
      const evento = rows[0];
      if (!evento) throw new Error('Falta ' + tipo);
      return evento;
    };
    const pulsar = async (waId: string, payloadBoton: string) => {
      const resp = await app.inject({ method: 'POST', url: '/api/canales/wa/mensajes',
        headers: { 'idempotency-key': deps.ids.nuevo() }, payload: { waId, payloadBoton } });
      expect(resp.statusCode).toBe(200);
      return RespuestaMensajeWaSchema.parse(resp.json()).mensajes;
    };
    const boton = (evento: DatosMensajesWa) => {
      const mensaje = evento.mensajes[0];
      if (mensaje?.tipo !== 'botones' || !mensaje.botones[0]) throw new Error('Falta el botón');
      return mensaje.botones[0].payload;
    };
    const contextoDemo = RUTAS_CONSULTAS.contextoDemo.respuesta.parse((await app.inject('/api/demo/contexto')).json());
    expect(contextoDemo.pacienteId).toBe(idDemo(20));
    const aprobacion = recibirWa();
    const clave = deps.ids.nuevo();
    const cancelar = async () => app.inject({ method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': clave },
      payload: { tipo: 'CancelarCita', actor: 'paciente', canal: 'app', tramiteId: idDemo(210), payload: {} } });
    expect((await cancelar()).statusCode).toBe(403);
    expect((await cancelar()).statusCode).toBe(403);
    expect(await pulsar('5210000000001', boton(await aprobacion))).toEqual([{ tipo: 'texto', texto: 'Tu cita quedó cancelada.' }]);
    const cancelada = await eventoDb('CitaCancelada');
    await deps.huecos.detectar(cancelada);
    await deps.huecos.detectar(cancelada);
    const kpisOferta = recibirKpis();
    await io.manejar(await eventoDb('OfertaEnviada'));
    expect(await kpisOferta).toMatchObject({ huecosLiberados: 1, huecosRecuperados: 0 });

    if (modo === 'oleada') {
      const candidatos = await Promise.all(['5210000000002', '5210000000003', '5210000000004'].map(async numero => {
        const socket = await abrir();
        const mensaje = new Promise<DatosMensajesWa>(resolver => socket.once('wa:mensajes', resolver));
        await unir(socket, 'wa:' + numero);
        return { numero, token: boton(await mensaje) };
      }));
      const respuestas = await Promise.all(candidatos.map(({ numero, token }) => pulsar(numero, token)));
      const textos = respuestas.flat().flatMap(m => m.tipo === 'texto' ? [m.texto] : []);
      expect(textos.filter(t => t.startsWith('Listo, tu cita quedó el '))).toHaveLength(1);
      expect(textos.filter(t => t === 'Ese espacio ya fue tomado. Te avisaremos si se libera otro.')).toHaveLength(2);
      const panel = await deps.lecturas.panelHuecos();
      expect(panel).toHaveLength(1);
      expect(panel[0]?.ofertas.map(o => o.estado).sort()).toEqual(['ACEPTADA', 'PERDIDA', 'PERDIDA']);
      return;
    }
    const ofertaBeto = recibirWa();
    await unir(wa, 'wa:5210000000002');
    expect(await pulsar('5210000000002', boton(await ofertaBeto))).toEqual([{ tipo: 'texto', texto: expect.stringMatching(/^Listo, tu cita quedó el /) }]);
    const beto = await deps.tramites.obtener(idDemo(211) as TramiteId);
    expect(beto?.estado).toBe('CONFIRMADA');
    expect(beto?.horario?.reservaId).not.toBe(idDemo(221));
    const kpisAsignado = recibirKpis();
    await io.manejar(await eventoDb('HuecoAsignado'));
    expect(await kpisAsignado).toMatchObject({ huecosLiberados: 1, huecosRecuperados: 1, horasRecursoRecuperadas: 0.5, diasAdelantadosPromedio: 7 });
    const consulta = await app.inject({ method: 'GET', url: '/api/admin/huecos' });
    expect(RUTAS_CONSULTAS.panelHuecos.respuesta.parse(consulta.json())).toEqual([
      expect.objectContaining({ estado: 'ASIGNADO', ofertas: [expect.objectContaining({ estado: 'ACEPTADA' })] }),
    ]);

    await unir(wa, 'wa:5210000000003');
    const ofertaCarla = recibirWa();
    await deps.huecos.detectar(await eventoDb('CitaAdelantada'));
    expect((await ofertaCarla).waId).toBe('5210000000003');
    const anterior = await deps.lecturas.panelHuecos();
    expect(anterior.map(h => h.estado)).toEqual(['OFRECIDO', 'ASIGNADO']);

    await db.query(`
      WITH reservas AS (
        INSERT INTO ${esquema}.reserva (id, sede_id, recurso_id, inicio, tramite_id, estado)
        SELECT ('019a0000-0000-7000-8000-' || lpad(j::text, 12, '0'))::uuid, r.sede_id, r.recurso_id,
          r.inicio + j * interval '1 hour', r.tramite_id, 'CANCELADA'
        FROM ${esquema}.reserva r CROSS JOIN generate_series(1, 60) j WHERE r.id = $1 RETURNING id
      )
      INSERT INTO ${esquema}.hueco (id, origen_reserva_id, servicio_id, estado, estrategia, creado_en, version)
      SELECT id, id, $2, 'DESIERTO', 'SECUENCIAL', now() + right(id::text, 2)::int * interval '1 day', 1 FROM reservas
    `, [idDemo(220) as ReservaId, idDemo(11)]);
    const panel = RUTAS_CONSULTAS.panelHuecos.respuesta.parse((await app.inject({ method: 'GET', url: '/api/admin/huecos' })).json());
    expect(panel).toHaveLength(50);
    expect(panel[0]?.id).toBe('019a0000-0000-7000-8000-000000000060');
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await io.cerrar();
    await app.close();
    await deps.cerrar();
    await sd.close();
    await db.query('DROP SCHEMA ' + esquema + ' CASCADE');
    await db.end();
  }
}, 15_000);
