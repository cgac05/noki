import { expect, it, vi } from 'vitest';
import { comprobarLecturasApi, comprobarSoloLectura } from './bateriaLecturasApi.ts';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { CuerpoErrorSchema, RespuestaComandoSchema } from '../../../packages/contracts/src/index.ts';
import type { HiloId, PacienteId, SedeId, ServicioId, TramiteId } from '../../../packages/domain/src/index.ts';

it('una llamada nueva permite cotizar el mismo hilo tras continuar en WhatsApp', async () => {
  const { app, catalogo, ids, lecturas, reloj, tokens, tramites } = crearApiPruebas();
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  const contacto = '0000000001';
  const iniciar = { tipoTramite: 'AGENDAR', contacto };
  const enviar = async (tipo: string, payload: object, tramiteId?: string) => {
    const respuesta = await app.inject({
      method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': ids.nuevo() },
      payload: { canal: 'callcenter', actor: 'asesor:demo', tramiteId, tipo, payload },
    });
    expect(respuesta.statusCode).toBe(200);
    return RespuestaComandoSchema.parse(respuesta.json()).tramite;
  };
  try {
    const anterior = await enviar('IniciarTramite', iniciar);
    const hiloId = anterior.hiloId as HiloId;
    await enviar('SeleccionarServicio', { servicioId }, anterior.id);
    await enviar('SeleccionarSede', { sedeId }, anterior.id);
    await enviar('SolicitarContinuacion', { destino: 'whatsapp' }, anterior.id);
    const evento = tramites.eventos().find(evento => evento.tipo === 'ConsentimientoContactoWA');
    if (evento?.tipo !== 'ConsentimientoContactoWA') throw new Error('Falta el consentimiento.');
    const token = await tokens.emitir({
      jti: evento.payload.consentimientoId, uso: 'CONTINUIDAD', tramiteId: anterior.id as TramiteId,
      hiloId, nivel: 0, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
      emitidoEn: reloj.ahora().toISOString(), expiraEn: new Date(reloj.ahora().getTime() + 60_000).toISOString(),
    });
    const respuesta = await app.inject({
      method: 'POST', url: '/api/canales/wa/mensajes', headers: { 'idempotency-key': ids.nuevo() },
      payload: { waId: '521' + contacto, texto: 'CONTINUAR ' + token },
    });
    expect(respuesta.statusCode).toBe(200);
    await comprobarSoloLectura(lecturas, hiloId, true);
    const nuevo = await enviar('IniciarTramite', iniciar);
    expect(nuevo.hiloId).toBe(hiloId);
    await comprobarSoloLectura(lecturas, hiloId, false);
    await enviar('SeleccionarServicio', { servicioId }, nuevo.id);
    expect((await enviar('SeleccionarSede', { sedeId }, nuevo.id)).estado).toBe('COTIZADO');
  } finally { await app.close(); }
});

it.each(['vigente', 'vencida', 'compensacion'])('idempotencia y registro de fallos (reserva %s)', async caso => {
  const vencida = caso === 'vencida';
  const compensacion = caso === 'compensacion';
  const registrarError = vi.fn();
  const { app, agenda, agendaExterna, catalogo, ids, reloj, tramites, lecturas, pacientes, casos } = crearApiPruebas({ registrarError });
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5,
    limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  const pacienteId = ids.nuevo() as PacienteId;
  await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: '1990-01-01', sexo: 'F' });
  await comprobarLecturasApi(lecturas);
  const registrar = vi.spyOn(agendaExterna, 'registrarCita');
  const enviar = (tipo: string, payload: object, tramiteId?: string, clave = ids.nuevo()) => app.inject({
    method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': clave },
    payload: { canal: 'callcenter', actor: 'asesor:demo', tramiteId, tipo, payload },
  });
  try {
    const inicio = RespuestaComandoSchema.parse((await enviar('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: '0000000001' })).json());
    const { id } = inicio.tramite;
    RespuestaComandoSchema.parse((await enviar('SeleccionarServicio', { servicioId }, id)).json());
    RespuestaComandoSchema.parse((await enviar('SeleccionarSede', { sedeId }, id)).json());
    RespuestaComandoSchema.parse((await enviar('SeleccionarSede', { sedeId }, id)).json());
    RespuestaComandoSchema.parse((await enviar('AsignarPaciente', { pacienteId }, id)).json());
    const apartada = RespuestaComandoSchema.parse((await enviar('ReservarHorario',
      { recursoId: ids.nuevo(), inicio: '2026-11-26T16:00:00Z' }, id)).json());
    const reservaId = apartada.tramite.horario?.reservaId;
    if (!reservaId) throw new Error('Falta la reserva.');
    if (vencida) reloj.adelantar(10 * 60_000);
    if (compensacion) {
      vi.spyOn(agenda, 'confirmar').mockRejectedValueOnce(new Error('fallo interno sintético'));
      vi.spyOn(agendaExterna, 'cancelarCita').mockRejectedValueOnce(new Error('compensación sintética'));
      const fallo = await enviar('ConfirmarCita', { reservaId }, id);
      expect(fallo.statusCode).toBe(500);
      expect(CuerpoErrorSchema.parse(fallo.json()).error.codigo).toBe('INTERNO');
      expect(registrarError).toHaveBeenCalledExactlyOnceWith({
        correlation_id: expect.any(String), codigo: 'COMPENSACION_AGENDA_FALLIDA',
      });
      expect(fallo.body).not.toContain('sintético');
      return;
    }
    const clave = ids.nuevo();
    const primera = await enviar('ConfirmarCita', { reservaId }, id, clave);
    const repetida = await enviar('ConfirmarCita', { reservaId }, id, clave);
    expect(repetida.statusCode).toBe(primera.statusCode);
    expect(repetida.json()).toEqual(primera.json());
    if (vencida) {
      expect(primera.statusCode).toBe(422);
      expect(CuerpoErrorSchema.parse(primera.json()).error.datos?.['regla']).toBe('HORARIO_NO_DISPONIBLE');
      expect(tramites.eventos().filter(evento => evento.tipo === 'ReservaExpirada')).toHaveLength(1);
    } else {
      expect(primera.statusCode).toBe(200);
      expect(RespuestaComandoSchema.parse(primera.json()).tramite.estado).toBe('CONFIRMADA');
      const cierre = await app.inject({
        method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': ids.nuevo() },
        payload: { tipo: 'CerrarAtencion', canal: 'clinica', actor: 'recepcion:demo', tramiteId: id, payload: {} },
      });
      expect(cierre.statusCode).toBe(409);
      expect(CuerpoErrorSchema.parse(cierre.json()).error.codigo).toBe('TRANSICION_INVALIDA');
      expect((await tramites.obtener(id as TramiteId))?.estado).toBe('CONFIRMADA');
      expect(tramites.eventos().filter(evento => evento.tipo === 'CitaConfirmada')).toHaveLength(1);
      await casos.retomar({ valorContacto: '0000000001', token: 'alterado' }, {
        actor: 'asesor:demo', canal: 'callcenter', nivel: 0, vinculado: false, factores: new Set(),
        idempotencyKey: ids.nuevo(), correlationId: ids.nuevo(),
      });
      const confirmada = await tramites.obtener(id as TramiteId);
      if (!confirmada?.horario) throw new Error('Falta la cita guardada.');
      await comprobarLecturasApi(lecturas, {
        tramiteId: confirmada.id, hiloId: confirmada.hiloId, pacienteId, sedeId, inicio: confirmada.horario.inicio,
      });
    }
    expect(registrar).toHaveBeenCalledTimes(vencida ? 0 : 1);
  } finally { await app.close(); }
});
