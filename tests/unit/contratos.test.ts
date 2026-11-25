import { describe, expect, expectTypeOf, it } from 'vitest';
import { crearApiPruebas } from '../../apps/api/src/pruebas.ts';
import {
  AdelantarRelojSchema, RespuestaRelojSchema, RUTA_RELOJ_DEMO,
  ComandoRequestSchema, SiguientePreguntaSchema, MensajeBotSchema, CampoFlowSchema,
  SolicitudMensajeWaSchema, RespuestaMensajeWaSchema, SalaSchema, CuerpoErrorSchema,
  RespuestaComandoSchema, TramiteVistaSchema, ESQUEMAS_EVENTOS_SOCKET, EVENTOS_CLIENTE_SOCKET, ESQUEMAS_EVENTOS_CLIENTE_SOCKET, type ComandoRequest, type NombreEventoSocket, type DatosEventoSocket,
} from '../../packages/contracts/src/index.ts';

const id = '019b0000-0000-7000-8000-000000000001';
const boton = { id: 'continuar', titulo: 'Continuar', payload: 'token-firmado' };

describe('comandos de clínica en el adaptador HTTP', () => {
  it('rechaza cerrar una atención sin llegada y conserva el trámite', async () => {
    const { app, ids, tramites } = crearApiPruebas();
    const enviar = (payload: object) => app.inject({
      method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': ids.nuevo() }, payload,
    });
    try {
      const inicio = await enviar({
        canal: 'callcenter', actor: 'asesor:demo', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' },
      });
      expect(inicio.statusCode).toBe(200);
      const { tramite } = RespuestaComandoSchema.parse(inicio.json());
      const leer = () => app.inject({ method: 'GET', url: '/api/tramites/' + tramite.id });
      const antes = await leer();
      expect(antes.statusCode).toBe(200);
      const eventosAntes = tramites.eventos().length;
      const clinica = { canal: 'clinica', actor: 'recepcion:demo', tramiteId: tramite.id };
      const cierre = await enviar({ ...clinica, tipo: 'CerrarAtencion', payload: {} });
      expect(cierre.statusCode).toBe(409);
      expect(CuerpoErrorSchema.parse(cierre.json()).error.codigo).toBe('TRANSICION_INVALIDA');
      const despues = await leer();
      expect(despues.statusCode).toBe(200);
      expect(despues.json()).toEqual(antes.json());
      expect(tramites.eventos()).toHaveLength(eventosAntes);
    } finally { await app.close(); }
  });
});

describe('contrato del reloj de demo', () => {
  it('publica la ruta POST y valida minutos enteros dentro del límite', () => {
    expect(RUTA_RELOJ_DEMO).toEqual({ metodo: 'POST', ruta: '/api/demo/reloj', soloDemo: true });
    expect(AdelantarRelojSchema.parse({ adelantarMinutos: 60 })).toEqual({ adelantarMinutos: 60 });
    expect(AdelantarRelojSchema.safeParse({ adelantarMinutos: 10_080 }).success).toBe(true);
    for (const adelantarMinutos of [0, 10_081, 1.5]) {
      expect(AdelantarRelojSchema.safeParse({ adelantarMinutos }).success).toBe(false);
    }
  });

  it('valida la hora devuelta en ISO UTC', () => {
    const ahora = '2026-11-26T16:15:00.000Z';
    expect(RespuestaRelojSchema.parse({ ahora })).toEqual({ ahora });
    expect(RespuestaRelojSchema.safeParse({ ahora: 'mañana' }).success).toBe(false);
  });
});

describe('contratos de todos los canales', () => {
  it('rechaza el tipo retirado de comprobación de identidad en clínica', () => {
    const resultado = ComandoRequestSchema.safeParse({
      canal: 'clinica', actor: 'recepcion:demo', tipo: 'Comprobar' + 'Identidad',
      tramiteId: id, payload: { metodo: 'INE_CLINICA' },
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.path).toEqual(['tipo']);
  });

  it('exige el trámite y un payload vacío para cerrar la atención', () => {
    const comando = { canal: 'clinica', actor: 'recepcion:demo', tipo: 'CerrarAtencion', payload: {} };
    expect(ComandoRequestSchema.parse({ ...comando, tramiteId: id })).toEqual({ ...comando, tramiteId: id });
    expect(ComandoRequestSchema.safeParse(comando).success).toBe(false);
    expect(ComandoRequestSchema.safeParse({ ...comando, tramiteId: id, payload: { posicion: 1 } }).success).toBe(false);
  });

  it('rechaza el canal inexistente e indica el campo', () => {
    const salida = ComandoRequestSchema.safeParse({ canal: 'fax', actor: 'paciente', tipo: 'SeleccionarServicio', payload: { servicioId: id } });
    expect(salida.success).toBe(false);
    if (!salida.success) expect(salida.error.issues.some(i => i.path.includes('canal'))).toBe(true);
  });

  it('deriva tipos del esquema y liga cada payload al comando', () => {
    expectTypeOf<ComandoRequest>().toEqualTypeOf<ReturnType<typeof ComandoRequestSchema.parse>>();
    const base = { canal: 'web', actor: 'paciente' };
    expect(ComandoRequestSchema.safeParse({ ...base, tipo: 'SeleccionarSede', payload: { servicioId: id } }).success).toBe(false);
    const salida = ComandoRequestSchema.parse({ ...base, tipo: 'SeleccionarServicio', payload: { servicioId: id } });
    expect(salida.tipo).toBe('SeleccionarServicio');
    if (salida.tipo === 'SeleccionarServicio') expect(salida.payload.servicioId).toBe(id);
  });

  it('acepta contacto de 10 a 15 dígitos y rechaza un contacto mal formado', () => {
    const comando = { canal: 'callcenter', actor: 'asesor:demo', tipo: 'IniciarTramite' };
    const payload = { tipoTramite: 'AGENDAR' };
    expect(ComandoRequestSchema.parse({ ...comando, payload })).toMatchObject({ payload });
    expect(ComandoRequestSchema.parse({ ...comando, payload: { ...payload, contacto: '5210000000001' } })).toMatchObject({ payload: { contacto: '5210000000001' } });
    expect(ComandoRequestSchema.safeParse({ ...comando, payload: { ...payload, contacto: '55-1234' } }).success).toBe(false);
  });

  it('exige el trámite y el destino WhatsApp para solicitar continuación', () => {
    const comando = { canal: 'callcenter', actor: 'asesor:demo', tipo: 'SolicitarContinuacion', payload: { destino: 'whatsapp' } };
    expect(ComandoRequestSchema.safeParse(comando).success).toBe(false);
    expect(ComandoRequestSchema.parse({ ...comando, tramiteId: id })).toEqual({ ...comando, tramiteId: id });
    expect(ComandoRequestSchema.safeParse({ ...comando, tramiteId: id, payload: { destino: 'web' } }).success).toBe(false);
  });

  it('acepta una vista con reserva y una cita confirmada sin vencimiento', () => {
    const tramite = { id, hiloId: id, tipo: 'AGENDAR', estado: 'HORARIO_RESERVADO', version: 1 };
    const horario = { reservaId: id, inicio: '2026-11-25T16:00:00Z' };
    const apartado = { ...horario, expiraEn: '2026-11-24T16:15:00Z' };
    expect(TramiteVistaSchema.parse(tramite)).toEqual(tramite);
    expect(TramiteVistaSchema.parse({ ...tramite, horario: apartado }).horario).toEqual(apartado);
    const confirmada = { ...tramite, estado: 'CONFIRMADA' };
    expect(TramiteVistaSchema.parse({ ...confirmada, horario }).horario).toEqual(horario);
    expect(TramiteVistaSchema.safeParse({ ...confirmada, horario: apartado }).success).toBe(false);
  });

  it('acepta captura sensible y la variante explícita de completo', () => {
    expect(SiguientePreguntaSchema.safeParse({ tipo: 'PREGUNTA', casilla: 'paciente', pista: { entrada: 'FLOW', campos: [{ id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive' }] } }).success).toBe(true);
    expect(SiguientePreguntaSchema.parse({ tipo: 'COMPLETO' })).toEqual({ tipo: 'COMPLETO' });
  });

  it('limita botones y filas totales de varias secciones y rechaza un PIN inicial', () => {
    expect(MensajeBotSchema.safeParse({ tipo: 'botones', texto: 'Elige', botones: Array.from({ length: 4 }, () => boton) }).success).toBe(false);
    expect(MensajeBotSchema.safeParse({ tipo: 'lista', texto: 'Elige', secciones: [{ filas: Array.from({ length: 6 }, () => boton) }, { filas: Array.from({ length: 5 }, () => boton) }] }).success).toBe(false);
    expect(MensajeBotSchema.safeParse({ tipo: 'botones', texto: 'Elige', botones: [boton] }).success).toBe(true);
    expect(CampoFlowSchema.safeParse({ id: 'pin', etiqueta: 'PIN', captura: 'passcode', valorInicial: '1234' }).success).toBe(false);
  });

  it('rechaza WA vacío y acepta mensajes de texto y botones', () => {
    expect(SolicitudMensajeWaSchema.safeParse({ waId: '5210000000001' }).success).toBe(false);
    expect(SolicitudMensajeWaSchema.safeParse({ waId: '5210000000001', texto: 'Hola' }).success).toBe(true);
    expect(RespuestaMensajeWaSchema.safeParse({ mensajes: [{ tipo: 'texto', texto: 'Hola' }, { tipo: 'botones', texto: 'Continuar', botones: [boton] }] }).success).toBe(true);
  });

  it('comparte eventos y salas y rechaza prefijos y eventos desconocidos', () => {
    expect(SalaSchema.safeParse('inventada:' + id).success).toBe(false);
    for (const sala of ['tramite:' + id, 'hilo:' + id, 'paciente:' + id, 'sede:' + id, 'admin', 'wa:5210000000002']) expect(SalaSchema.safeParse(sala).success).toBe(true);
    // @ts-expect-error: el nombre no pertenece al contrato de eventos Socket.IO
    const evento: NombreEventoSocket = 'inventado:secreto';
    expect(evento).not.toBe('tramite:actualizado');
    expect(Object.keys(ESQUEMAS_EVENTOS_SOCKET)).toHaveLength(6);
    expect(ESQUEMAS_EVENTOS_SOCKET['hilo:linea-tiempo'].safeParse({ hiloId: id, eventos: [] }).success).toBe(true);
    expect(ESQUEMAS_EVENTOS_SOCKET['admin:metricas'].safeParse({ confirmadas: 'secreto' }).success).toBe(false);
    expect(ESQUEMAS_EVENTOS_SOCKET['sede:fila'].safeParse({ tramiteId: id, posicion: -1 }).success).toBe(false);
    expect(ESQUEMAS_EVENTOS_SOCKET['bandeja:mensaje'].safeParse({ mensajeId: id, canal: 'fax' }).success).toBe(false);
  });

  it('valida salas de WhatsApp con 10 a 15 dígitos', () => {
    expect(SalaSchema.parse('wa:5210000000002')).toBe('wa:5210000000002');
    expect(SalaSchema.safeParse('wa:55-1234').success).toBe(false);
    expect(SalaSchema.safeParse('wa:123').success).toBe(false);
  });

  it('valida de uno a cinco mensajes salientes de WhatsApp', () => {
    const esquema = ESQUEMAS_EVENTOS_SOCKET['wa:mensajes'];
    const mensaje = { tipo: 'botones', texto: 'Continuar', botones: [boton] } as const;
    const dato = { waId: '5210000000002', mensajes: [mensaje] };
    const salida = esquema.parse({ ...dato, pacienteId: id });
    expect(salida).toEqual(dato);
    expectTypeOf(salida).toEqualTypeOf<DatosEventoSocket['wa:mensajes']>();
    expect(esquema.safeParse({ ...dato, mensajes: Array(5).fill(mensaje) }).success).toBe(true);
    expect(esquema.safeParse({ ...dato, mensajes: [] }).success).toBe(false);
    expect(esquema.safeParse({ ...dato, mensajes: Array(6).fill(mensaje) }).success).toBe(false);
    expect(esquema.safeParse({ ...dato, waId: '12345' }).success).toBe(false);
  });

  it('valida la sala al unirse y salir por Socket.IO', () => {
    expect(EVENTOS_CLIENTE_SOCKET).toEqual({ SALA_UNIRSE: 'sala:unirse', SALA_SALIR: 'sala:salir' });
    expect(ESQUEMAS_EVENTOS_CLIENTE_SOCKET['sala:unirse'].safeParse('tramite:123').success).toBe(false);
    expect(ESQUEMAS_EVENTOS_CLIENTE_SOCKET['sala:unirse'].parse('tramite:' + id)).toBe('tramite:' + id);
    expect(ESQUEMAS_EVENTOS_CLIENTE_SOCKET['sala:salir'].parse('admin')).toBe('admin');
  });

  it('exige tipo en vistas de trámite y descarta datos personales y detalles internos', () => {
    const base = { id, hiloId: id, estado: 'BORRADOR', version: 0 };
    expect(RespuestaComandoSchema.safeParse({ tramite: base, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] }).success).toBe(false);
    const salida = RespuestaComandoSchema.parse({ tramite: { ...base, tipo: 'AGENDAR', email: 'ficticio@example.invalid' }, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] });
    expect(salida.tramite).not.toHaveProperty('email');
    const error = CuerpoErrorSchema.parse({ stack: 'interno', error: { codigo: 'NO_ENCONTRADO', mensaje: 'No encontrado', stack: 'interno' } });
    expect(error).not.toHaveProperty('stack');
    expect(error.error).not.toHaveProperty('stack');
  });
});

it('valida la identificación por pasos', () => {
  const base = { canal: 'whatsapp', actor: 'paciente', tipo: 'IdentificarPaciente',
    tramiteId: '01937954-6c40-7000-8000-000000000001' };
  for (const payload of [{ paso: 'CURP', curp: null }, { paso: 'CONFIRMAR', candidato: null }]) {
    expect(ComandoRequestSchema.safeParse({ ...base, payload }).success).toBe(true);
  }
  for (const payload of [
    { paso: 'FECHA_NAC', fechaNac: '1990-02-30' },
    { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Demo', entidadNacimiento: 'XX' },
    { paso: 'CONFIRMAR', candidato: '' },
    { paso: 'REINICIAR', fechaNac: '1990-02-28' },
  ]) {
    expect(ComandoRequestSchema.safeParse({ ...base, payload }).success).toBe(false);
  }
});

it('acepta exactamente 18 caracteres alfanuméricos en mayúsculas en el paso CURP', () => {
  const acepta = (curp: string) => ComandoRequestSchema.safeParse({
    canal: 'callcenter', actor: 'asesor:demo', tipo: 'IdentificarPaciente',
    tramiteId: '01937954-6c40-7000-8000-000000000001', payload: { paso: 'CURP', curp },
  }).success;
  expect(acepta('ABCD123456EFGHIJ78')).toBe(true);
  expect(acepta('ABCD123456EFGHIJ7')).toBe(false);
  expect(acepta('ABCD123456EFGHIJ-8')).toBe(false);
  expect(acepta('aBCD123456EFGHIJ78')).toBe(false);
});

it('valida una pregunta con paso de identificación', () => {
  const base = { tipo: 'PREGUNTA', casilla: 'paciente' };
  expect(SiguientePreguntaSchema.safeParse({ ...base, pista: { entrada: 'FLOW', paso: 'CURP' } }).success).toBe(true);
  expect(SiguientePreguntaSchema.safeParse({ ...base, pista: { entrada: 'FLOW', paso: 'OTRO' } }).success).toBe(false);
});
