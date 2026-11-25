import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { RespuestaMensajeWaSchema, type MensajeBot } from '../../../packages/contracts/src/index.ts';
import type { PacienteId, SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

const waId = '5210000000075';
const fechaCorrecta = '1987-06-17';

async function hastaFechaNacimiento(salidaLog?: Writable) {
  const entorno = crearApiPruebas(salidaLog ? { salidaLog } : {});
  const { app, casos, catalogo, contactos, ids, lecturas, pacientes, reloj } = entorno;
  const pacienteId = ids.nuevo() as PacienteId;
  const servicioId = ids.nuevo() as ServicioId;
  const sedeId = ids.nuevo() as SedeId;
  const contexto = () => ({
    actor: 'asesor:demo', canal: 'callcenter', nivel: 1, vinculado: false,
    factores: new Set<never>(), correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
  } as const);
  const enviar = async (entrada: object) => {
    const respuesta = await app.inject({
      method: 'POST', url: '/api/canales/wa/mensajes',
      headers: { 'idempotency-key': ids.nuevo() }, payload: { waId, ...entrada },
    });
    expect(respuesta.statusCode).toBe(200);
    return RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
  };
  const pulsar = (mensajes: MensajeBot[], titulo: string) => {
    const opciones = mensajes.flatMap(m => m.tipo === 'botones' ? m.botones
      : m.tipo === 'lista' ? m.secciones.flatMap(s => s.filas) : []);
    const opcion = opciones.find(opcion => opcion.titulo === titulo);
    if (!opcion) throw new Error('Falta la opción ' + titulo);
    return enviar({ payloadBoton: opcion.payload });
  };
  try {
    await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: fechaCorrecta, sexo: 'F' });
    const { tramite } = await casos.iniciar('AGENDAR', waId.slice(-10), contexto());
    const contacto = await contactos.buscar('callcenter', waId.slice(-10));
    if (!contacto) throw new Error('Falta el contacto.');
    const ahora = reloj.ahora().toISOString();
    await contactos.vincular(contacto.id, { pacienteId, relacion: 'TITULAR', metodo: 'TELEFONO_FECHA_NAC', nivel: 1, ultimoUso: ahora });
    catalogo.registrar(servicioId, {
      tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
      duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
      anticipacionMinimaHoras: 0, recordatorios: [],
    }, new Map([[sedeId, 5500]]));
    lecturas.registrarOferta({ servicioId, sedeId, servicio: 'Química', sede: 'Tepic', precioCentavos: 5500 }, 'America/Mazatlan');
    await casos.seleccionarServicio(tramite.id, servicioId, contexto());
    await casos.seleccionarSede(tramite.id, sedeId, contexto());
    const token = await entorno.tokens.emitir({
      tramiteId: tramite.id, hiloId: tramite.hiloId, uso: 'CONTINUIDAD', jti: ids.nuevo(),
      metodo: 'TOKEN_CC', canalOrigen: 'callcenter', nivel: 1,
      emitidoEn: ahora, expiraEn: '2026-11-25T12:00:00Z',
    });
    const horarios = await enviar({ texto: 'CONTINUAR ' + token });
    const destinatario = await pulsar(horarios, 'mié 25 nov · 09:00');
    const candidatos = await pulsar(destinatario, 'Para mí');
    const pregunta = await pulsar(candidatos, 'Soy Ana P.');
    expect(pregunta).toMatchObject([{ tipo: 'flow', campos: [{ id: 'fechaNac', captura: 'sensitive' }] }]);
    return { ...entorno, tramite, pregunta, enviar, pulsar };
  } catch (error) {
    await app.close();
    throw error;
  }
}

it('Fecha equivocada registra tres intentos y pide esperar sin repetir datos', async () => {
  const { app, enviar, pulsar, tramites, tramite } = await hastaFechaNacimiento();
  const fechas = ['1987-06-18', '1987-06-19', '1987-06-20'];
  try {
    for (const [indice, fechaNac] of fechas.entries()) {
      const mensajes = await enviar({ flowResponse: { fechaNac } });
      expect(mensajes[0]).toEqual({ tipo: 'texto', texto: indice === 2
        ? 'Espera antes de volver a intentarlo.' : 'No pudimos verificar la información.' });
      for (const valor of [...fechas, fechaCorrecta, waId]) expect(JSON.stringify(mensajes)).not.toContain(valor);
      expect(tramites.eventos().filter(e => e.tipo === 'IntentoVerificacionFallido' && e.tramiteId === tramite.id))
        .toMatchObject(fechas.slice(0, indice + 1).map((_, i) => ({
          tipo: 'IntentoVerificacionFallido', payload: { metodo: 'TELEFONO_FECHA_NAC', intentos: i + 1 },
        })));
      if (indice < 2) await pulsar(mensajes, 'Soy Ana P.');
      else expect(mensajes).toHaveLength(1);
    }
  } finally { await app.close(); }
});

it('Flow incompleto repite FECHA_NAC sin guardar ni incrementar el intento', async () => {
  const { app, pregunta, enviar, tramites } = await hastaFechaNacimiento();
  try {
    const antes = tramites.eventos().filter(evento => evento.tipo === 'IntentoVerificacionFallido');
    const mensajes = await enviar({ flowResponse: { fechaNac: '1987-02-30' } });
    expect(mensajes).toEqual([{ tipo: 'texto', texto: 'Revisa los campos requeridos.' }, ...pregunta]);
    expect(tramites.eventos().filter(evento => evento.tipo === 'IntentoVerificacionFallido')).toEqual(antes);
    await enviar({ flowResponse: { fechaNac: '1987-06-18' } });
    expect(tramites.eventos().filter(evento => evento.tipo === 'IntentoVerificacionFallido'))
      .toMatchObject([{ payload: { intentos: 1 } }]);
  } finally { await app.close(); }
});

it('Logs de Fastify sin el waId ni la fecha enviada en flowResponse', async () => {
  const registros: string[] = [];
  const salida = new Writable({
    write(trozo: Buffer, _codificacion, terminar) {
      registros.push(trozo.toString('utf8'));
      terminar();
    },
  });
  const { app, enviar } = await hastaFechaNacimiento(salida);
  try {
    registros.length = 0;
    await enviar({ flowResponse: { fechaNac: fechaCorrecta } });
    const log = registros.join('');
    expect(log).toContain('/api/canales/wa/mensajes');
    expect(log).toContain('request completed');
    expect(log).not.toContain(waId);
    expect(log).not.toContain(fechaCorrecta);
  } finally { await app.close(); }
});
