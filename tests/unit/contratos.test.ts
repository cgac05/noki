import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ComandoRequestSchema, SiguientePreguntaSchema, MensajeBotSchema, CampoFlowSchema,
  SolicitudMensajeWaSchema, RespuestaMensajeWaSchema, SalaSchema, CuerpoErrorSchema,
  RespuestaComandoSchema, ESQUEMAS_EVENTOS_SOCKET, type ComandoRequest, type NombreEventoSocket,
} from '../../packages/contracts/src/index.ts';

const id = '019b0000-0000-7000-8000-000000000001';
const boton = { id: 'continuar', titulo: 'Continuar', payload: 'token-firmado' };

describe('contratos de todos los canales', () => {
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
    for (const sala of ['tramite:' + id, 'hilo:' + id, 'paciente:' + id, 'sede:' + id, 'admin']) expect(SalaSchema.safeParse(sala).success).toBe(true);
    // @ts-expect-error: el nombre no pertenece al contrato de eventos Socket.IO
    const evento: NombreEventoSocket = 'inventado:secreto';
    expect(evento).not.toBe('tramite:actualizado');
    expect(Object.keys(ESQUEMAS_EVENTOS_SOCKET)).toHaveLength(5);
    expect(ESQUEMAS_EVENTOS_SOCKET['hilo:linea-tiempo'].safeParse({ hiloId: id, eventos: [] }).success).toBe(true);
    expect(ESQUEMAS_EVENTOS_SOCKET['admin:metricas'].safeParse({ confirmadas: 'secreto' }).success).toBe(false);
    expect(ESQUEMAS_EVENTOS_SOCKET['sede:fila'].safeParse({ tramiteId: id, posicion: -1 }).success).toBe(false);
    expect(ESQUEMAS_EVENTOS_SOCKET['bandeja:mensaje'].safeParse({ mensajeId: id, canal: 'fax' }).success).toBe(false);
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
