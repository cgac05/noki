import { expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { componerComandos } from '../../apps/api/src/componerComandos.ts';
import { crearApi } from '../../apps/api/src/crearApi.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { RespuestaComandoSchema, RespuestaMensajeWaSchema, type MensajeBot } from '../../packages/contracts/src/index.ts';

it('retoma por HTTP la cotización que WhatsApp guardó en Postgres', async () => {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
  if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
  const esquema = 'llamada_retoma_tramite';
  const admin = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 2000 });
  url.searchParams.set('options', '-c search_path=' + esquema + ',public');
  const databaseUrl = url.toString();
  const pool = new Pool({ connectionString: databaseUrl });
  const deps = componerComandos({
    databaseUrl, sdMockUrl: 'https://agenda.example', demo: true,
    tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes',
  }, () => {});
  const app = crearApi({
    databaseUrl, redisUrl: process.env['REDIS_URL'] ?? '', logger: false,
    comandos: deps, consultas: deps.consultas, whatsapp: deps.whatsapp,
  });
  const agenda = vi.spyOn(globalThis, 'fetch').mockImplementation(async entrada => {
    if (!(entrada instanceof URL) || entrada.origin !== 'https://agenda.example'
        || entrada.pathname !== '/agenda/disponibilidad') throw new Error('Consulta de agenda inesperada.');
    return Response.json({ horarios: [] });
  });
  const waId = '5210000000086';
  const enviar = (ruta: string, payload: object) => app.inject({
    method: 'POST', url: ruta, payload, headers: { 'idempotency-key': deps.ids.nuevo() },
  });
  const wa = async (payload: object) => {
    const respuesta = await enviar('/api/canales/wa/mensajes', { waId, ...payload });
    expect(respuesta.statusCode).toBe(200);
    return RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
  };
  const elegir = (mensajes: MensajeBot[], titulo: string) => {
    const opcion = mensajes.flatMap(mensaje => mensaje.tipo === 'lista'
      ? mensaje.secciones.flatMap(seccion => seccion.filas) : []).find(fila => fila.titulo === titulo);
    if (!opcion) throw new Error('Falta la opción ' + titulo);
    return wa({ payloadBoton: opcion.payload });
  };

  let esquemaCreado = false;
  try {
    await admin.query('CREATE SCHEMA llamada_retoma_tramite');
    esquemaCreado = true;
    await migrar(databaseUrl, undefined, esquema);
    await sembrar(databaseUrl);
    const sedes = await elegir(await wa({ texto: 'Hola' }), 'Química sanguínea');
    await elegir(sedes, 'Clínica Tepic');
    const { rows: [origen] } = await pool.query<{ id: string; hilo_id: string; estado: string }>(
      'SELECT t.id, t.hilo_id, t.estado FROM tramite t JOIN contacto_canal c ON c.hilo_id = t.hilo_id WHERE c.valor_externo = $1',
      [waId],
    );
    if (!origen) throw new Error('Falta el trámite de WhatsApp.');
    expect(origen.estado).toBe('COTIZADO');

    const respuesta = await enviar('/api/comandos', {
      tipo: 'IniciarTramite', canal: 'callcenter', actor: 'asesor:demo',
      payload: { tipoTramite: 'AGENDAR', contacto: waId.slice(-10) },
    });
    expect(respuesta.statusCode).toBe(200);
    const llamada = RespuestaComandoSchema.parse(respuesta.json());
    expect(llamada.tramite).toMatchObject({ id: origen.id, hiloId: origen.hilo_id, estado: 'COTIZADO' });
    expect(llamada.siguientePregunta).toMatchObject({ casilla: 'paciente' });
    expect(llamada.eventos.map(({ tipo }) => tipo)).toEqual(['CanalCambiado']);
    const { rows: eventos } = await pool.query(
      "SELECT payload FROM evento WHERE tramite_id = $1 AND tipo = 'CanalCambiado'", [origen.id],
    );
    expect(eventos).toEqual([{ payload: { de: 'whatsapp', a: 'callcenter', metodo: 'LLAMADA_CC' } }]);
    const { rows: [paciente] } = await pool.query<{ id: string; fecha: string }>(
      "SELECT id, fecha_nac::text AS fecha FROM paciente WHERE nombre = 'Ana'",
    );
    if (!paciente) throw new Error('Falta la paciente de demo.');
    const asignacion = await enviar('/api/comandos', {
      tipo: 'AsignarPaciente', canal: 'callcenter', actor: 'asesor:demo', tramiteId: origen.id,
      payload: { pacienteId: paciente.id },
    });
    expect(asignacion.statusCode).toBe(200);
    const anterior = RespuestaComandoSchema.parse(asignacion.json()).tramite;
    const nueva = await enviar('/api/comandos', {
      tipo: 'IniciarTramite', canal: 'callcenter', actor: 'asesor:demo',
      payload: { tipoTramite: 'AGENDAR', contacto: waId.slice(-10), nuevo: true },
    });
    expect(nueva.statusCode).toBe(200);
    const cita = RespuestaComandoSchema.parse(nueva.json());
    expect(cita.tramite.id).not.toBe(origen.id);
    expect(cita.tramite.hiloId).not.toBe(origen.hilo_id);
    expect(cita.eventos.map(({ tipo }) => tipo)).toEqual(['TramiteIniciado', 'PacienteAsignado']);
    expect(cita.siguientePregunta).toMatchObject({ casilla: 'servicio' });
    const { rows } = await pool.query(
      'SELECT id, paciente_id, version FROM tramite WHERE id IN ($1, $2)', [origen.id, cita.tramite.id],
    );
    expect(rows).toEqual(expect.arrayContaining([
      { id: origen.id, paciente_id: paciente.id, version: anterior.version },
      { id: cita.tramite.id, paciente_id: paciente.id, version: cita.tramite.version },
    ]));
    const fecha = await app.inject('/api/demo/callcenter/hilos/' + cita.tramite.hiloId + '/fecha-nacimiento');
    expect(fecha.statusCode).toBe(200);
    expect(fecha.json()).toEqual({ fechaNacimiento: paciente.fecha });
  } finally {
    agenda.mockRestore();
    await app.close();
    await deps.cerrar();
    await pool.end();
    try {
      if (esquemaCreado) await admin.query('DROP SCHEMA llamada_retoma_tramite CASCADE');
    } finally {
      await admin.end();
    }
  }
});
