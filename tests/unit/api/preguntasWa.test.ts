import { expect, it, vi } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { ConversacionesWaMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { nombreEntidad } from '../../../packages/adapters/in-http/src/textosWa.ts';
import { ENTIDADES_NACIMIENTO, RespuestaMensajeWaSchema, type MensajeBot } from '../../../packages/contracts/src/index.ts';
import { ReglaViolada } from '../../../packages/domain/src/index.ts';
import type { SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

const waId = '5210000000081';
const filas = (mensajes: MensajeBot[]) => mensajes.flatMap(m => m.tipo === 'lista'
  ? m.secciones.flatMap(s => s.filas) : []);

async function conAgenda(horaUtc: number, probar: (entorno: ReturnType<typeof crearApiPruebas> & {
  enviar: (entrada: object) => Promise<MensajeBot[]>;
  pulsar: (mensajes: MensajeBot[], titulo: string) => Promise<MensajeBot[]>;
  consultarDias: () => Promise<MensajeBot[]>;
}) => Promise<void>) {
  const entorno = crearApiPruebas();
  const { app, ids, reloj, catalogo, lecturas } = entorno;
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  reloj.fijar(new Date(Date.UTC(2026, 10, 24, horaUtc)));
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  const enviar = async (entrada: object) => {
    const respuesta = await app.inject({
      method: 'POST', url: '/api/canales/wa/mensajes',
      headers: { 'idempotency-key': ids.nuevo() }, payload: { waId, ...entrada },
    });
    expect(respuesta.statusCode).toBe(200);
    return RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
  };
  const pulsar = (mensajes: MensajeBot[], titulo: string) => {
    const opcion = [...filas(mensajes), ...mensajes.flatMap(m => m.tipo === 'botones' ? m.botones : [])]
      .find(fila => fila.titulo === titulo);
    if (!opcion) throw new Error('Falta la opción ' + titulo);
    return enviar({ payloadBoton: opcion.payload });
  };
  const consultarDias = async () => pulsar(await pulsar(await enviar({ texto: 'Hola' }), 'Química'), 'Tepic');
  try { await probar({ ...entorno, consultarDias, enviar, pulsar }); }
  finally { await app.close(); }
}

it('muestra siete días distintos desde hoy a las diez en Tepic', () => conAgenda(17, async ({ consultarDias }) => {
  const dias = await consultarDias();
  expect(dias[0]).toMatchObject({ tipo: 'lista', texto: '¿Qué día prefieres?' });
  const titulos = filas(dias).map(fila => fila.titulo);
  expect(titulos).toHaveLength(7);
  expect(new Set(titulos).size).toBe(7);
  expect(titulos.slice(0, 2)).toEqual(['mar 24 nov', 'mié 25 nov']);
  expect(titulos.every(titulo => !titulo.includes(':'))).toBe(true);
}));

it('empieza mañana al terminar los horarios del día', () => conAgenda(24, async ({ consultarDias }) => {
  expect(filas(await consultarDias())[0]?.titulo).toBe('mié 25 nov');
}));

it('muestra las horas del tercer día y las opciones de navegación', () => conAgenda(17, async ({ consultarDias, pulsar }) => {
  const horas = await pulsar(await consultarDias(), 'jue 26 nov');
  expect(horas[0]).toMatchObject({ tipo: 'lista', texto: '¿A qué hora?' });
  expect(filas(horas).map(fila => fila.titulo)).toEqual([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 'Ver más horarios', 'Elegir otro día',
  ]);
}));

it('pagina las horas y permite regresar a la lista de días', () => conAgenda(17, async ({ consultarDias, pulsar }) => {
  const horas = await pulsar(await consultarDias(), 'jue 26 nov');
  const siguientes = await pulsar(horas, 'Ver más horarios');
  expect(filas(siguientes).map(fila => fila.titulo)).toEqual([
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', 'Elegir otro día',
  ]);
  expect((await pulsar(siguientes, 'Elegir otro día'))[0]).toMatchObject({ texto: '¿Qué día prefieres?' });
}));

it('formatea el día y la hora en la zona de Tepic', () => conAgenda(17, async ({ agendaExterna, consultarDias, pulsar }) => {
  const disponibilidad = agendaExterna.disponibilidad.bind(agendaExterna);
  vi.spyOn(agendaExterna, 'disponibilidad').mockImplementation(consulta =>
    consulta.fecha === '2026-11-26' ? Promise.resolve(['2026-11-26T16:15:00.000Z']) : disponibilidad(consulta));
  const horas = await pulsar(await consultarDias(), 'jue 26 nov');
  expect(filas(horas).map(fila => fila.titulo)).toEqual(['09:15', 'Elegir otro día']);
}));

async function iniciarDatos(entorno: Parameters<Parameters<typeof conAgenda>[1]>[0]) {
  const { consultarDias, enviar, pulsar } = entorno;
  const horas = await pulsar(await consultarDias(), 'mié 25 nov');
  const destinatario = await pulsar(horas, '09:00');
  await pulsar(destinatario, 'Para mí');
  const curp = await enviar({ flowResponse: { fechaNac: '1990-01-01' } });
  return pulsar(curp, 'No la tengo');
}

it('sin CURP pregunta el nombre en un Flow de un solo campo', () => conAgenda(17, async entorno => {
  expect(await iniciarDatos(entorno)).toMatchObject([
    { tipo: 'flow', campos: [{ id: 'nombre', etiqueta: 'Nombre', captura: 'sensitive' }] },
  ]);
}));

async function llegarASexo(entorno: Parameters<Parameters<typeof conAgenda>[1]>[0]) {
  const { enviar, pulsar } = entorno;
  await iniciarDatos(entorno);
  await enviar({ flowResponse: { nombre: 'Paciente sintético' } });
  const materno = await enviar({ flowResponse: { apellidoPaterno: 'Demo' } });
  return pulsar(materno, 'No tengo');
}

it('registra y asigna con un solo comando DATOS y limpia el estado parcial', () => conAgenda(17, async entorno => {
  const { casos, pulsar, tramites } = entorno;
  const identificar = vi.spyOn(casos, 'identificarPaciente');
  const guardar = vi.spyOn(ConversacionesWaMemoria.prototype, 'guardar');
  const sexo = await llegarASexo(entorno);
  let entidad = await pulsar(sexo, 'Mujer');
  while (!filas(entidad).some(fila => fila.titulo === 'Nayarit')) entidad = await pulsar(entidad, 'Más estados');
  const reserva = await pulsar(entidad, 'Nayarit');
  expect(identificar.mock.calls.filter(([, payload]) => payload.paso === 'DATOS')).toEqual([
    [expect.any(String), { paso: 'DATOS', nombre: 'Paciente sintético', apellidoPaterno: 'Demo',
      sexo: 'F', entidadNacimiento: 'NT' }, waId, expect.any(Object)],
  ]);
  expect(tramites.eventos().map(evento => evento.tipo)).toEqual(expect.arrayContaining(['PacienteRegistrado', 'PacienteAsignado']));
  expect(JSON.stringify(reserva)).not.toContain('Paciente sintético');
  expect(reserva[0]).toMatchObject({ botones: [{ titulo: 'Confirmar cita' }] });
  expect(guardar.mock.lastCall?.[1]).not.toHaveProperty('datos');
  guardar.mockRestore();
}));

it('ofrece sexo y entidad como opciones y pagina los estados', () => conAgenda(17, async entorno => {
  const sexo = await llegarASexo(entorno);
  expect(sexo).toMatchObject([{ tipo: 'botones', botones: [
    { titulo: 'Mujer' }, { titulo: 'Hombre' }, { titulo: 'No binario' },
  ] }]);
  const nombres: string[] = [];
  let entidad = await entorno.pulsar(sexo, 'Mujer');
  for (;;) {
    const opciones = filas(entidad).map(fila => fila.titulo);
    expect(opciones.length).toBeLessThanOrEqual(10);
    expect(opciones.every(titulo => !/^[A-Z]{2}$/u.test(titulo))).toBe(true);
    nombres.push(...opciones.filter(titulo => titulo !== 'Más estados'));
    if (!opciones.includes('Más estados')) break;
    entidad = await entorno.pulsar(entidad, 'Más estados');
  }
  expect(new Set(nombres).size).toBe(33);
  expect(Object.keys(nombreEntidad).sort()).toEqual([...ENTIDADES_NACIMIENTO].sort());
  expect([...nombres].sort()).toEqual(Object.values(nombreEntidad).sort());
  expect(nombres.at(-1)).toBe('Nací en el extranjero');
}));

it('repite el campo inválido sin consumir intento y conserva la respuesta anterior', () => conAgenda(17, async entorno => {
  const { casos, enviar, tramites } = entorno;
  const pregunta = await iniciarDatos(entorno);
  const identificar = vi.spyOn(casos, 'identificarPaciente');
  expect(await enviar({ flowResponse: {} })).toEqual([{ tipo: 'texto', texto: 'Revisa los campos requeridos.' }, ...pregunta]);
  const paterno = await enviar({ flowResponse: { nombre: 'Prueba' } });
  expect(paterno).toMatchObject([{ tipo: 'flow', campos: [{ id: 'apellidoPaterno' }] }]);
  expect(await enviar({ flowResponse: { apellidoPaterno: ' ' } }))
    .toEqual([{ tipo: 'texto', texto: 'Revisa los campos requeridos.' }, ...paterno]);
  expect(identificar).not.toHaveBeenCalled();
  expect(tramites.eventos().some(evento => evento.tipo === 'IntentoVerificacionFallido')).toBe(false);
}));

it('explica la caída de la agenda al confirmar y vuelve a ofrecer la confirmación', () => conAgenda(17, async entorno => {
  const { pulsar, agendaExterna } = entorno;
  let entidad = await pulsar(await llegarASexo(entorno), 'Mujer');
  while (!filas(entidad).some(fila => fila.titulo === 'Nayarit')) entidad = await pulsar(entidad, 'Más estados');
  const reserva = await pulsar(entidad, 'Nayarit');
  vi.spyOn(agendaExterna, 'registrarCita').mockRejectedValueOnce(new ReglaViolada('AGENDA_NO_DISPONIBLE'));
  const respuesta = await pulsar(reserva, 'Confirmar cita');
  expect(respuesta).toMatchObject([
    { tipo: 'texto', texto: 'La agenda no respondió. Intenta de nuevo en un momento.' },
    { tipo: 'botones', botones: [{ titulo: 'Confirmar cita' }] },
  ]);
  expect((await pulsar(respuesta, 'Confirmar cita'))[0]).toMatchObject({ texto: expect.stringMatching(/^Cita confirmada/u) });
}));
