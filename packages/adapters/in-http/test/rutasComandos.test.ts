import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { CuerpoErrorSchema, RespuestaComandoSchema } from '@noki/contracts';
import { ReglaViolada, StepUpRequerido, type HiloId, type TramiteId } from '@noki/domain';
import { rutasComandos, type DependenciasComandos } from '../src/rutasComandos.ts';

const tramiteId = '01937954-6c40-7000-8000-000000000001' as TramiteId;
const hiloId = '01937954-6c40-7000-8000-000000000002' as HiloId;
const otroHilo = '01937954-6c40-7000-8000-000000000003' as HiloId;
const clave = '01937954-6c40-7000-8000-000000000004';
const tramite = { id: tramiteId, hiloId, estado: 'BORRADOR', tipo: 'AGENDAR', version: 1 } as const;
const comando = { tipo: 'IdentificarPaciente', tramiteId, canal: 'web', actor: 'paciente',
  payload: { paso: 'DESTINATARIO', para: 'MI' } } as const;

async function escenario(demo = false) {
  const app = Fastify({ logger: false });
  const identificarPaciente = vi.fn(async () => ({
    tramite, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [],
  }));
  const cotizado = { tramite: { ...tramite, estado: 'COTIZADO' }, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] };
  const casos = {
    identificarPaciente,
    iniciar: vi.fn(async () => cotizado),
    seleccionarServicio: vi.fn(async () => cotizado),
    seleccionarSede: vi.fn(async () => cotizado),
    confirmar: vi.fn(async () => cotizado),
    asignarPaciente: vi.fn(async () => { throw new ReglaViolada('ASIGNACION_SOLO_PERSONAL'); }),
    cancelar: vi.fn(async () => { throw new StepUpRequerido(1, ['OTP']); }),
  };
  const deps = {
    casos,
    demo,
    ids: { nuevo: () => clave },
    tokens: { verificar: async (token: string) => token === 'mismo' || token === 'ajeno' ? {
      hiloId: token === 'mismo' ? hiloId : otroHilo, tramiteId, nivel: 1,
      canalOrigen: 'web', metodo: 'TOKEN_WEB',
    } : null },
    lecturas: { tramite: async () => tramite, contactoPorHilo: async () => '5210000000001', eventosPorClave: async () => [] },
  } as unknown as DependenciasComandos;
  await app.register(rutasComandos, deps);
  return { app, casos, identificarPaciente, enviar: (payload: object, bearer?: string) => app.inject({
    method: 'POST', url: '/api/comandos', payload,
    headers: { 'idempotency-key': clave, ...(bearer ? { authorization: 'Bearer ' + bearer } : {}) },
  }) };
}

describe('Identificación del paciente por HTTP', () => {
  it.each([undefined, 'ajeno', 'alterado'])('rechaza la credencial ausente, ajena o inválida: %s', async token => {
    const { app, enviar, identificarPaciente } = await escenario();
    try {
      const respuesta = await enviar(comando, token);
      expect(respuesta.statusCode).toBe(403);
      expect(CuerpoErrorSchema.parse(respuesta.json()).error.codigo).toBe('STEP_UP_REQUERIDO');
      expect(identificarPaciente).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it('delega al caso existente con el contacto del hilo para un token vigente del mismo hilo', async () => {
    const { app, enviar, identificarPaciente } = await escenario();
    try {
      const respuesta = await enviar(comando, 'mismo');
      expect(respuesta.statusCode).toBe(200);
      expect(RespuestaComandoSchema.parse(respuesta.json()).tramite.id).toBe(tramiteId);
      expect(identificarPaciente).toHaveBeenCalledWith(tramiteId, comando.payload, '5210000000001',
        expect.objectContaining({ nivel: 1, idempotencyKey: clave }));
    } finally { await app.close(); }
  });

  it('permite al asesor demo sin token y rechaza sistema', async () => {
    const { app, enviar, identificarPaciente } = await escenario(true);
    try {
      expect((await enviar({ ...comando, actor: 'asesor:demo', canal: 'callcenter' })).statusCode).toBe(200);
      const sistema = await enviar({ ...comando, actor: 'sistema' });
      expect(sistema.statusCode).toBe(400);
      expect(CuerpoErrorSchema.parse(sistema.json()).error.codigo).toBe('VALIDACION');
      expect(identificarPaciente).toHaveBeenCalledTimes(1);
    } finally { await app.close(); }
  });
});

describe('traducción y errores de comandos', () => {
  const base = { canal: 'callcenter', actor: 'asesor:demo' } as const;
  const sedeId = '01937954-6c40-7000-8000-000000000005';

  it('Cotizar desde el call center conserva el contacto y delega servicio y sede', async () => {
    const { app, casos, enviar } = await escenario(true);
    try {
      const inicio = await enviar({ ...base, tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: '0000000001' } });
      expect(RespuestaComandoSchema.parse(inicio.json()).tramite.estado).toBe('COTIZADO');
      expect(casos.iniciar).toHaveBeenCalledWith('AGENDAR', '0000000001', expect.objectContaining(base), undefined);
      const servicio = await enviar({ ...base, tipo: 'SeleccionarServicio', tramiteId, payload: { servicioId: sedeId } });
      expect(RespuestaComandoSchema.parse(servicio.json()).tramite.estado).toBe('COTIZADO');
      expect(casos.seleccionarServicio).toHaveBeenCalledWith(tramiteId, sedeId, expect.objectContaining(base));
      const sede = await enviar({ ...base, tipo: 'SeleccionarSede', tramiteId, payload: { sedeId } });
      expect(RespuestaComandoSchema.parse(sede.json()).tramite.estado).toBe('COTIZADO');
      expect(casos.seleccionarSede).toHaveBeenCalledWith(tramiteId, sedeId, expect.objectContaining(base));
    } finally { await app.close(); }
  });

  it('Comando sin trámite, reserva que no coincide y valor inválido sin eco', async () => {
    const { app, casos, enviar } = await escenario(true);
    try {
      const sinTramite = await enviar({ ...base, tipo: 'SeleccionarSede', payload: { sedeId } });
      expect(sinTramite.statusCode).toBe(400);
      expect(CuerpoErrorSchema.parse(sinTramite.json()).error.codigo).toBe('VALIDACION');
      const reserva = await enviar({ ...base, tipo: 'ConfirmarCita', tramiteId, payload: { reservaId: sedeId } });
      expect(reserva.statusCode).toBe(422);
      expect(CuerpoErrorSchema.parse(reserva.json()).error.datos?.['regla']).toBe('RESERVA_NO_COINCIDE');
      expect(casos.confirmar).not.toHaveBeenCalled();
      const invalido = await enviar({ ...base, tipo: 'SeleccionarSede', tramiteId, payload: { sedeId: 'valor-privado-sintetico' } });
      expect(invalido.statusCode).toBe(400);
      expect(CuerpoErrorSchema.parse(invalido.json()).error.codigo).toBe('VALIDACION');
      expect(invalido.body).not.toContain('valor-privado-sintetico');
    } finally { await app.close(); }
  });

  it('Sede sin el servicio, asignación exclusiva, paso adicional y fallo inesperado', async () => {
    const { app, casos, enviar } = await escenario(true);
    try {
      casos.seleccionarSede.mockRejectedValueOnce(new ReglaViolada('SERVICIO_NO_DISPONIBLE_EN_SEDE'));
      const sede = await enviar({ ...base, tipo: 'SeleccionarSede', tramiteId, payload: { sedeId } });
      expect(sede.statusCode).toBe(422);
      expect(CuerpoErrorSchema.parse(sede.json()).error.datos?.['regla']).toBe('SERVICIO_NO_DISPONIBLE_EN_SEDE');
      const asignar = await enviar({ ...base, actor: 'paciente', tipo: 'AsignarPaciente', tramiteId, payload: { pacienteId: sedeId } });
      expect(asignar.statusCode).toBe(422);
      expect(CuerpoErrorSchema.parse(asignar.json()).error.datos?.['regla']).toBe('ASIGNACION_SOLO_PERSONAL');
      const cancelar = await enviar({ ...base, actor: 'paciente', tipo: 'CancelarCita', tramiteId, payload: {} });
      expect(cancelar.statusCode).toBe(403);
      expect(CuerpoErrorSchema.parse(cancelar.json()).error.codigo).toBe('STEP_UP_REQUERIDO');
      casos.seleccionarSede.mockRejectedValueOnce(new Error('detalle interno sintético'));
      const fallo = await enviar({ ...base, tipo: 'SeleccionarSede', tramiteId, payload: { sedeId } });
      expect(fallo.statusCode).toBe(500);
      expect(CuerpoErrorSchema.parse(fallo.json()).error.codigo).toBe('INTERNO');
      expect(fallo.body).not.toContain('detalle interno');
    } finally { await app.close(); }
  });

  it('Asesor fuera de modo demo requiere verificación', async () => {
    const { app, casos, enviar } = await escenario();
    try {
      const respuesta = await enviar({ ...base, tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' } });
      expect(respuesta.statusCode).toBe(403);
      expect(CuerpoErrorSchema.parse(respuesta.json()).error.codigo).toBe('STEP_UP_REQUERIDO');
      expect(casos.iniciar).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
