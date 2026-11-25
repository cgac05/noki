import { expect } from 'vitest';
import { diaCorto } from '../../../packages/adapters/in-http/src/textosWa.ts';
import type { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { RespuestaComandoSchema, RespuestaMensajeWaSchema, RUTAS_CONSULTAS, type MensajeBot } from '../../../packages/contracts/src/index.ts';

interface DatosWa {
  waId: string;
  pacienteId: string;
  sedeId: string;
  servicioId: string;
  inicio: string;
  codigoContinuacion(hiloId: string, tramiteId: string): Promise<string | null>;
  eventos(tramiteId: string): Promise<readonly { tipo: string; idempotencyKey: string; correlationId: string }[]>;
}

function opcion(mensajes: MensajeBot[], titulo: RegExp) {
  const opciones = mensajes.flatMap(mensaje => mensaje.tipo === 'botones' ? mensaje.botones
    : mensaje.tipo === 'lista' ? mensaje.secciones.flatMap(seccion => seccion.filas) : []);
  const elegida = opciones.find(({ titulo: texto }) => titulo.test(texto));
  if (!elegida) throw new Error('Falta la opción esperada de WhatsApp: ' + String(titulo));
  return elegida.payload;
}

export async function comprobarIdempotenciaWa(
  { app, ids }: Pick<ReturnType<typeof crearApiPruebas>, 'app' | 'ids'>,
  datos: DatosWa,
) {
  const enviar = (url: string, payload: object, clave = ids.nuevo()) =>
    app.inject({ method: 'POST', url, payload, headers: { 'idempotency-key': clave } });
  const comando = async (tipo: string, payload: object, tramiteId?: string) => {
    const r = await enviar('/api/comandos', { canal: 'callcenter', actor: 'asesor:demo', tipo, payload, tramiteId });
    expect(r.statusCode).toBe(200);
    return RespuestaComandoSchema.parse(r.json()).tramite;
  };
  const wa = async (mensaje: object) => {
    const r = await enviar('/api/canales/wa/mensajes', { waId: datos.waId, ...mensaje });
    expect(r.statusCode).toBe(200);
    return RespuestaMensajeWaSchema.parse(r.json()).mensajes;
  };

  const tramite = await comando('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: datos.waId.slice(-10) });
  await comando('AsignarPaciente', { pacienteId: datos.pacienteId }, tramite.id);
  await comando('SeleccionarServicio', { servicioId: datos.servicioId }, tramite.id);
  await comando('SeleccionarSede', { sedeId: datos.sedeId }, tramite.id);
  await comando('SolicitarContinuacion', { destino: 'whatsapp' }, tramite.id);
  const token = await datos.codigoContinuacion(tramite.hiloId, tramite.id);
  if (!token) throw new Error('Falta el código de continuación.');
  const dias = await wa({ texto: 'CONTINUAR ' + token });
  const manana = dias.flatMap(m => m.tipo === 'lista' ? m.secciones.flatMap(s => s.filas) : [])
    .find(fila => fila.titulo === diaCorto(datos.inicio, 'America/Mazatlan'));
  if (!manana) throw new Error('Falta el día de mañana.');
  const horarios = await wa({ payloadBoton: manana.payload });
  const requisitos = await wa({ payloadBoton: opcion(horarios, /^09:00$/u) });
  const payload = { waId: datos.waId, payloadBoton: opcion(requisitos, /^Acepto la preparación$/u) };
  const clave = ids.nuevo();
  const ruta = '/api/canales/wa/mensajes';
  const respuesta = await enviar(ruta, payload, clave);
  expect(respuesta.statusCode, 'Aceptar la preparación con paciente ya asignado').toBe(200);
  const mensajes = RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
  expect(opcion(mensajes, /^Confirmar cita$/u)).toBeTruthy();

  const lectura = await app.inject({ url: '/api/tramites/' + tramite.id });
  expect(lectura.statusCode).toBe(200);
  expect(RUTAS_CONSULTAS.tramite.respuesta.parse(lectura.json())).toMatchObject({
    estado: 'HORARIO_RESERVADO', horario: { inicio: datos.inicio },
  });
  const eventos = await datos.eventos(tramite.id);
  const operaciones = eventos.filter(({ tipo }) => tipo === 'PreparacionAceptada' || tipo === 'HorarioReservado');
  expect(operaciones).toHaveLength(2);
  expect(operaciones).toContainEqual(expect.objectContaining({ tipo: 'PreparacionAceptada', idempotencyKey: clave }));
  const reserva = operaciones.find(({ tipo }) => tipo === 'HorarioReservado');
  expect(reserva?.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  expect(reserva?.idempotencyKey).not.toBe(clave);
  expect(new Set(operaciones.map(evento => evento.correlationId)).size).toBe(1);

  const repetida = await enviar(ruta, payload, clave);
  expect(repetida.statusCode).toBe(200);
  expect(repetida.json()).toEqual(respuesta.json());
  expect(await datos.eventos(tramite.id)).toEqual(eventos);
}
