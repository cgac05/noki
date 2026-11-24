import { expect, it, vi } from 'vitest';
import { comprobarLecturasApi } from './bateriaLecturasApi.ts';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { CuerpoErrorSchema, RespuestaComandoSchema } from '../../../packages/contracts/src/index.ts';
import type { PacienteId, SedeId, ServicioId, TramiteId } from '../../../packages/domain/src/index.ts';

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
