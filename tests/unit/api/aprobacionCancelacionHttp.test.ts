import { expect, it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { CuerpoErrorSchema, RespuestaMensajeWaSchema } from '../../../packages/contracts/src/index.ts';
import type { HiloId, PacienteId, RecursoId, SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

it('pide aprobación desde la app y otro número no invalida el botón legítimo', async () => {
  const { app, casos, catalogo, contactos, ids, lecturas, notificadorWa, pacientes, reloj, tramites } = crearApiPruebas();
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  const pacienteId = ids.nuevo() as PacienteId;
  const waId = '5210000000001';
  const otroWaId = '5210000000002';
  const ts = reloj.ahora().toISOString();
  const contexto = () => ({ canal: 'callcenter' as const, actor: 'asesor:demo' as const, nivel: 0 as const,
    vinculado: false, factores: new Set<never>(), idempotencyKey: ids.nuevo(), correlationId: ids.nuevo() });
  try {
    catalogo.registrar(servicioId, { tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false,
      requisitos: [], duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
      anticipacionMinimaHoras: 0, recordatorios: [] }, new Map([[sedeId, 5500]]));
    lecturas.registrarOferta({ servicioId, sedeId, servicio: 'Ultrasonido abdominal', sede: 'Tepic', precioCentavos: 5500 }, 'America/Mazatlan');
    await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: '1990-01-01', sexo: 'F' });
    const { tramite: { id } } = await casos.iniciar('AGENDAR', '0000000001', contexto());
    const contacto = await contactos.crear({ id: ids.nuevo(), hiloId: ids.nuevo() as HiloId, canal: 'whatsapp', valor: waId });
    await contactos.crear({ id: ids.nuevo(), hiloId: ids.nuevo() as HiloId, canal: 'whatsapp', valor: otroWaId });
    await contactos.vincular(contacto.id, { pacienteId, relacion: 'TITULAR', metodo: 'TOKEN_CC', nivel: 1, ultimoUso: ts });
    await casos.seleccionarServicio(id, servicioId, contexto());
    await casos.seleccionarSede(id, sedeId, contexto());
    await casos.asignarPaciente(id, pacienteId, contexto());
    await casos.reservar(id, '2026-11-26T16:00:00.000Z', contexto(), ids.nuevo() as RecursoId);
    await casos.confirmar(id, contexto());
    const clave = ids.nuevo();
    const cancelar = () => app.inject({ method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': clave },
      payload: { canal: 'app', actor: 'paciente', tipo: 'CancelarCita', tramiteId: id, payload: {} } });
    const respuesta = await cancelar();
    expect(respuesta.statusCode).toBe(403);
    expect(CuerpoErrorSchema.parse(respuesta.json()).error).toMatchObject({
      codigo: 'STEP_UP_REQUERIDO', datos: { factores: ['BOTON_APROBACION'] },
    });
    expect((await cancelar()).json()).toEqual(respuesta.json());
    expect(notificadorWa.envios.map(envio => envio.waId)).toEqual([waId]);
    const payloadBoton = notificadorWa.envios[0]?.mensajes[0]?.botones?.[0]?.payload;
    if (!payloadBoton) throw new Error('Falta el botón de aprobación');
    const pulsar = async (numero: string) => {
      const resultado = await app.inject({ method: 'POST', url: '/api/canales/wa/mensajes',
        headers: { 'idempotency-key': ids.nuevo() }, payload: { waId: numero, payloadBoton } });
      return RespuestaMensajeWaSchema.parse(resultado.json()).mensajes;
    };
    expect(await pulsar(otroWaId)).toEqual([{ tipo: 'texto', texto: 'Esa opción ya no está disponible.' }]);
    expect((await tramites.obtener(id))?.estado).toBe('CONFIRMADA');
    expect(await pulsar(waId)).toEqual([{ tipo: 'texto', texto: 'Tu cita quedó cancelada.' }]);
    expect((await tramites.obtener(id))?.estado).toBe('CANCELADA');
    expect(await pulsar(waId)).toEqual([{ tipo: 'texto', texto: 'Esa opción ya no está disponible.' }]);
  } finally {
    await app.close();
  }
});
