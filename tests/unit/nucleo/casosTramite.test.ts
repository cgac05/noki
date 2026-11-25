import { expect, it, vi } from 'vitest';
import { CasosTramite, RelojDemo, ResolvedorContinuidad, TemporizadoresTramite, type DatosDeclarados } from '../../../packages/application/src/index.ts';
import {
  AgendaExternaMemoria, AgendaMemoria, CatalogoMemoria, ContactosMemoria, GeneradorIdSecuencial, HiloRepoMemoria,
  PacientesMemoria, ProgramadorMemoria, RegistroIntentosMemoria, EventosSinTramiteMemoria, RelojFalso, TramiteRepoMemoria, VerificadorTokensMemoria,
} from '../../../packages/adapters/memory/src/index.ts';
import {
  crearRegistroTiposTramite, PoliticaIdentidad,
  type PacienteId, type PerfilServicio, type SedeId, type ServicioId,
} from '../../../packages/domain/src/index.ts';

const pacienteId = 'paciente' as PacienteId;
const servicioId = 'servicio' as ServicioId;
const sedeId = 'sede' as SedeId;
const perfil: PerfilServicio = {
  tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false,
  requisitos: [{ tipo: 'ORDEN_MEDICA' }], duracionMin: 30, ttlReservaMin: 10,
  toleranciaMin: 5, limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
  elegibilidad: { edadMin: 30 },
};
const datos: DatosDeclarados = {
  nombre: 'Paciente', apellidoPaterno: 'Ficticio', fechaNac: '2010-03-07',
};
const cc = {
  actor: 'asesor:demo', canal: 'callcenter', nivel: 1, vinculado: false,
  factores: new Set<never>(), idempotencyKey: 'cc', correlationId: 'demo',
} as const;
const wa = { ...cc, actor: 'paciente', canal: 'whatsapp', nivel: 0, idempotencyKey: 'wa' } as const;

function escenario(registrarError = vi.fn<(datos: { correlation_id: string; codigo: string }) => void>(),
  opciones: { curpFlexible?: boolean } = {}) {
  const tramites = new TramiteRepoMemoria();
  tramites.registrarZonaSede(sedeId, 'America/Mazatlan');
  const pacientes = new PacientesMemoria();
  const hilos = new HiloRepoMemoria();
  const contactos = new ContactosMemoria(pacientes);
  const tokens = new VerificadorTokensMemoria();
  const catalogo = new CatalogoMemoria();
  const agenda = new AgendaMemoria();
  const agendaExterna = new AgendaExternaMemoria();
  const intentos = new RegistroIntentosMemoria();
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const politica = new PoliticaIdentidad();
  const ids = new GeneradorIdSecuencial();
  const registro = crearRegistroTiposTramite();
  catalogo.registrar(servicioId, perfil, new Map([[sedeId, 5500]]));
  pacientes.registrar(pacienteId, { ...datos, sexo: 'F' });
  const eventos = new EventosSinTramiteMemoria();
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes, intentos, eventos);
  const casos = new CasosTramite({
    tramites, hilos, contactos, tokens, pacientes, catalogo, agenda, agendaExterna, reloj, politica, ids,
    registro, resolvedor, intentos, registrarError, ...opciones,
  });
  return { casos, reloj, contactos, tokens, intentos, tramites, eventos, agendaExterna, pacientes, agenda, registro, ids, hilos };
}

it('una llamada nueva recupera el canal del hilo y permite contar la segunda continuación', async () => {
  const { casos, hilos, tokens, tramites } = escenario();
  const numero = '5210000000001';
  const continuar = async (tramite: Awaited<ReturnType<typeof casos.iniciar>>['tramite']) => {
    await casos.asignarPaciente(tramite.id, pacienteId, cc);
    const token = tokens.emitir({
      tramiteId: tramite.id, hiloId: tramite.hiloId, pacienteId, nivel: 1, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
    });
    const resultado = await casos.retomar({ valorContacto: numero, token }, wa);
    expect(resultado).toMatchObject({ tipo: 'RETOMADO', operacion: { eventos: expect.arrayContaining([
      expect.objectContaining({ tipo: 'CanalCambiado', payload: { de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC' } }),
    ]) } });
  };
  const primera = await casos.iniciar('AGENDAR', numero, cc);
  const id = await listo(casos, primera.tramite.id);
  await continuar(primera.tramite);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  expect((await casos.confirmar(id, cc)).tramite.estado).toBe('CONFIRMADA');
  const cambios = () => tramites.eventos().filter(evento => evento.tipo === 'CanalCambiado').length;
  const antes = cambios();
  const segunda = await casos.iniciar('AGENDAR', numero, cc);
  expect(segunda.tramite.id).not.toBe(primera.tramite.id);
  expect(segunda.tramite).toMatchObject({ hiloId: primera.tramite.hiloId, canalOrigen: 'callcenter' });
  expect((await hilos.obtener(segunda.tramite.hiloId))?.ultimoCanal).toBe('callcenter');
  expect(cambios()).toBe(antes);
  const mismoCanal = await casos.iniciar('AGENDAR', numero, cc);
  expect(mismoCanal.tramite.hiloId).toBe(segunda.tramite.hiloId);
  expect(cambios()).toBe(antes);
  await continuar(segunda.tramite);
  expect(cambios()).toBe(antes + 1);
});

async function listo(casos: CasosTramite, existente?: Parameters<CasosTramite['asignarPaciente']>[0],
  numero = '5210000000001') {
  const id = existente ?? (await casos.iniciar('AGENDAR', numero, cc)).tramite.id;
  await casos.asignarPaciente(id, pacienteId, cc);
  await casos.seleccionarServicio(id, servicioId, cc);
  await casos.seleccionarSede(id, sedeId, cc);
  await casos.cumplirRequisito(id, 'ORDEN_MEDICA', cc);
  return id;
}

async function cotizarWa(casos: CasosTramite, numero: string) {
  const { tramite } = await casos.iniciar('AGENDAR', numero, wa);
  await casos.seleccionarServicio(tramite.id, servicioId, wa);
  return casos.seleccionarSede(tramite.id, sedeId, wa);
}

it.each([true, false])('abre otra cita con paciente heredado: %s', async conPaciente => {
  const { casos, contactos, tramites } = escenario();
  const numero = '3119990004';
  const { tramite } = await cotizarWa(casos, numero);
  if (conPaciente) await casos.asignarPaciente(tramite.id, pacienteId, { ...wa, actor: 'sistema' });
  const anterior = await tramites.obtener(tramite.id);
  const nueva = await casos.iniciar('AGENDAR', numero, cc, true);
  expect(nueva.tramite.id).not.toBe(tramite.id);
  expect(nueva.tramite.hiloId).toBe((await contactos.buscar('callcenter', numero))?.hiloId);
  expect(nueva.tramite.pacienteId).toBe(anterior?.pacienteId);
  expect(nueva.eventos.map(({ tipo }) => tipo)).toEqual(conPaciente
    ? ['TramiteIniciado', 'PacienteAsignado'] : ['TramiteIniciado']);
  expect(nueva.siguientePregunta).toMatchObject({ casilla: conPaciente ? 'servicio' : 'paciente' });
  expect(await tramites.obtener(tramite.id)).toMatchObject({
    estado: anterior?.estado, version: anterior?.version,
  });
});

it.each(['0000000081', '5210000000081'])('retoma la cotización de WhatsApp del número de prueba %s', async numero => {
  const { casos, hilos, tramites } = escenario();
  const cotizacion = await cotizarWa(casos, numero);
  const llamada = await casos.iniciar('AGENDAR', '0000000081', cc);
  expect(llamada.tramite).toMatchObject({ id: cotizacion.tramite.id, estado: 'COTIZADO' });
  expect(llamada.eventos).toMatchObject([
    { tipo: 'CanalCambiado', payload: { de: 'whatsapp', a: 'callcenter', metodo: 'LLAMADA_CC' } },
  ]);
  expect(llamada.siguientePregunta).toMatchObject({ casilla: 'paciente' });
  expect((await hilos.obtener(llamada.tramite.hiloId))?.ultimoCanal).toBe('callcenter');
  expect(tramites.eventos().filter(({ tipo }) => tipo === 'TramiteIniciado')).toHaveLength(1);
});

it('prefiere una cotización de WhatsApp a un borrador de llamada más reciente', async () => {
  const { casos, reloj, tramites } = escenario();
  const numero = '0000000082';
  const cotizacion = await cotizarWa(casos, numero);
  reloj.adelantar(1);
  await casos.iniciar('AGENDAR', numero, { ...cc, actor: 'sistema' });
  const llamada = await casos.iniciar('AGENDAR', numero, cc);
  expect(llamada.tramite.id).toBe(cotizacion.tramite.id);
  expect(tramites.eventos().filter(({ tipo }) => tipo === 'TramiteIniciado')).toHaveLength(2);
});

it('crea un trámite en el hilo del contacto de llamada cuando no hay uno en proceso', async () => {
  const { casos, contactos } = escenario();
  const numero = '0000000083';
  const { tramite, eventos } = await casos.iniciar('AGENDAR', numero, cc);
  expect(tramite.hiloId).toBe((await contactos.buscar('callcenter', numero))?.hiloId);
  expect(eventos.map(({ tipo }) => tipo)).toEqual(['TramiteIniciado']);
});

it('retoma un trámite con paciente asignado sin vincular el contacto de llamada', async () => {
  const { casos, contactos } = escenario();
  const numero = '0000000084';
  const { tramite } = await cotizarWa(casos, numero);
  await casos.asignarPaciente(tramite.id, pacienteId, { ...wa, actor: 'sistema' });
  await casos.iniciar('AGENDAR', numero, { ...cc, actor: 'sistema' });
  const contacto = await contactos.buscar('callcenter', numero);
  if (!contacto) throw new Error('Falta el contacto de prueba.');
  const llamada = await casos.iniciar('AGENDAR', numero, cc);
  expect(llamada.tramite).toMatchObject({ id: tramite.id, pacienteId });
  expect(llamada.eventos.map(({ tipo }) => tipo)).toEqual(['CanalCambiado']);
  expect(await contactos.vinculosDe(contacto.id)).toEqual([]);
});

it('registra el consentimiento de un paciente anónimo desde web con nivel 0', async () => {
  const { casos } = escenario();
  const web = { ...wa, canal: 'web' } as const;
  const { tramite } = await casos.iniciar('AGENDAR', 'anonimo-web', web);
  const resultado = await casos.solicitarContinuacion(tramite.id, { ...web, idempotencyKey: 'continuar-web' });
  expect(resultado.eventos).toContainEqual(expect.objectContaining({
    tipo: 'ConsentimientoContactoWA', canal: 'web', actor: 'paciente', nivelAuth: 0,
  }));
});

it('conserva la continuación por asesor y rechaza otras combinaciones de actor y canal', async () => {
  const { casos } = escenario();
  const { tramite } = await casos.iniciar('AGENDAR', '5210000000001', cc);
  for (const comando of [wa, { ...wa, canal: 'callcenter' }, { ...cc, canal: 'web' }] as const) {
    await expect(casos.solicitarContinuacion(tramite.id, comando)).rejects.toMatchObject({
      regla: 'CONTINUACION_SOLO_ASESOR',
    });
  }
  const resultado = await casos.solicitarContinuacion(tramite.id, { ...cc, idempotencyKey: 'continuar-cc' });
  expect(resultado.eventos).toContainEqual(expect.objectContaining({
    tipo: 'ConsentimientoContactoWA', canal: 'callcenter', actor: cc.actor, nivelAuth: 1,
  }));
});

it('mantiene un hold futuro y lo expira al adelantar el reloj más allá del plazo', async () => {
  const puertos = escenario();
  const { casos, reloj, tramites, agenda } = puertos;
  const programador: ProgramadorMemoria = new ProgramadorMemoria(async trabajo => {
    await temporizadores.ejecutar(trabajo);
  });
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const demo = new RelojDemo(reloj, programador);
  const id = await listo(casos);
  const inicio = '2026-11-25T18:00:00Z';
  await casos.reservar(id, inicio, cc);
  await temporizadores.reconciliar(id);
  await demo.adelantar(5);
  expect((await tramites.obtener(id))?.estado).toBe('HORARIO_RESERVADO');
  await demo.adelantar(6);
  expect((await tramites.obtener(id))?.estado).toBe('LISTO_PARA_RESERVAR');
  expect(tramites.eventos().at(-1)).toMatchObject({ tipo: 'ReservaExpirada', actor: 'sistema', canal: cc.canal, nivelAuth: 0 });
  expect(agenda.horariosOcupados(sedeId, '2026-11-24T12:00:00Z')).not.toContain(inicio);
});

it('compensa la cita externa cuando el temporizador gana a la confirmación', async () => {
  const puertos = escenario();
  const { casos, reloj, tramites, agendaExterna } = puertos;
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const id = await listo(casos);
  const { tramite } = await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  await temporizadores.reconciliar(id);
  const hold = programador.vencidos(tramite.horario!.expiraEn).find(({ tipo }) => tipo === 'HOLD')!;
  const registrar = agendaExterna.registrarCita.bind(agendaExterna);
  let folio = '';
  vi.spyOn(agendaExterna, 'registrarCita').mockImplementationOnce(async solicitud => {
    folio = await registrar(solicitud);
    reloj.fijar(new Date(hold.venceEn));
    expect(await temporizadores.ejecutar(hold)).toEqual({ tipo: 'APLICADO' });
    return folio;
  });
  await expect(casos.confirmar(id, cc)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  expect(agendaExterna.activa(folio)).toBe(false);
  expect((await tramites.obtener(id))?.estado).toBe('LISTO_PARA_RESERVAR');
});

it('registra la compensación imposible en la carrera y conserva el error original', async () => {
  const registrarError = vi.fn<(datos: { correlation_id: string; codigo: string }) => void>();
  const puertos = escenario(registrarError);
  const { casos, reloj, tramites, agenda, agendaExterna } = puertos;
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const id = await listo(casos);
  const inicio = '2026-11-25T18:00:00Z';
  const { tramite } = await casos.reservar(id, inicio, cc);
  await temporizadores.reconciliar(id);
  const hold = programador.vencidos(tramite.horario!.expiraEn).find(({ tipo }) => tipo === 'HOLD')!;
  const registrar = agendaExterna.registrarCita.bind(agendaExterna);
  let folio = '';
  const cancelar = vi.spyOn(agendaExterna, 'cancelarCita').mockRejectedValueOnce(new Error('Agenda no disponible'));
  vi.spyOn(agendaExterna, 'registrarCita').mockImplementationOnce(async solicitud => {
    folio = await registrar(solicitud);
    reloj.fijar(new Date(hold.venceEn));
    expect(await temporizadores.ejecutar(hold)).toEqual({ tipo: 'APLICADO' });
    return folio;
  });
  await expect(casos.confirmar(id, cc)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  expect(cancelar).toHaveBeenCalledExactlyOnceWith(folio, cc.correlationId);
  expect(registrarError).toHaveBeenCalledExactlyOnceWith({
    correlation_id: cc.correlationId, codigo: 'COMPENSACION_AGENDA_FALLIDA',
  });
  expect((await tramites.obtener(id))?.estado).toBe('LISTO_PARA_RESERVAR');
  expect(agenda.horariosOcupados(sedeId, reloj.ahora().toISOString())).not.toContain(inicio);
  expect(agendaExterna.activa(folio)).toBe(true);
});

it('al confirmar cambia los trabajos, ignora el hold anterior y marca inasistencia al terminar la tolerancia', async () => {
  const puertos = escenario();
  const { casos, reloj, tramites, agenda } = puertos;
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const id = await listo(casos);
  const inicio = '2026-11-25T18:00:00.000Z';
  await casos.reservar(id, inicio, cc);
  await temporizadores.reconciliar(id);
  const limite = '2026-11-26T12:00:00.000Z';
  const hold = programador.vencidos(limite).find(trabajo => trabajo.tipo === 'HOLD')!;
  await casos.confirmar(id, cc);
  await temporizadores.reconciliar(id);
  await temporizadores.reconciliar(id);
  const trabajos = programador.vencidos(limite);
  expect(trabajos).toMatchObject([{ tipo: 'INASISTENCIA', venceEn: '2026-11-25T18:05:00.000Z' }]);
  const inasistencia = trabajos[0]!;
  expect(await temporizadores.ejecutar(hold)).toEqual({ tipo: 'SIN_EFECTO' });
  expect(await temporizadores.ejecutar(inasistencia)).toEqual({ tipo: 'REPROGRAMAR', venceEn: inasistencia.venceEn });
  reloj.fijar(new Date(inasistencia.venceEn));
  expect(await temporizadores.ejecutar(inasistencia)).toEqual({ tipo: 'APLICADO' });
  expect((await tramites.obtener(id))?.estado).toBe('NO_ASISTIO');
  expect(tramites.eventos().at(-1)).toMatchObject({ tipo: 'Inasistencia', actor: 'sistema', payload: { sedeId } });
  expect(agenda.horariosOcupados(sedeId, inasistencia.venceEn)).toContain(inicio);
  await temporizadores.reconciliar(id);
  expect(programador.vencidos(limite)).toEqual([]);
});

it('reprograma la inactividad con actividad nueva y desconoce el trabajo anterior', async () => {
  const puertos = escenario();
  const { casos, reloj, tramites } = puertos;
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const { tramite: { id } } = await casos.iniciar('AGENDAR', '5210000000001', cc);
  await casos.seleccionarServicio(id, servicioId, cc);
  await casos.seleccionarSede(id, sedeId, cc);
  await temporizadores.reconciliar(id);
  const original = programador.vencidos('2026-11-25T12:00:00Z')[0]!;
  reloj.adelantar(23 * 3_600_000);
  await casos.seleccionarSede(id, sedeId, cc);
  await temporizadores.reconciliar(id);
  reloj.adelantar(2 * 3_600_000);
  expect(await temporizadores.ejecutar(original)).toEqual({ tipo: 'SIN_EFECTO' });
  expect(programador.vencidos(reloj.ahora().toISOString())).toEqual([]);
  expect(programador.vencidos('2026-11-26T11:00:00Z')).toMatchObject([{ venceEn: '2026-11-26T11:00:00.000Z' }]);
  expect((await tramites.obtener(id))?.estado).toBe('COTIZADO');
});

it('descarta inasistencia pendiente cuando la recepción ya registró la llegada', async () => {
  const puertos = escenario();
  const { casos, reloj, tokens, tramites } = puertos;
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ ...puertos, programador });
  const id = await listo(casos);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  const { tramite } = await casos.confirmar(id, cc);
  await temporizadores.reconciliar(id);
  const trabajo = programador.vencidos('2026-11-26T12:00:00Z')[0]!;
  const qr = tokens.emitir({
    tramiteId: id, hiloId: tramite.hiloId, nivel: 1, canalOrigen: 'app', metodo: 'TOKEN_WEB',
  }, 'LLEGADA');
  await casos.registrarLlegada(qr, { ...cc, canal: 'clinica', actor: 'recepcion:demo' });
  reloj.fijar(new Date(trabajo.venceEn));
  expect(await temporizadores.ejecutar(trabajo)).toEqual({ tipo: 'SIN_EFECTO' });
  await temporizadores.reconciliar(id);
  expect(programador.vencidos(reloj.ahora().toISOString())).toEqual([]);
  expect((await tramites.obtener(id))?.estado).toBe('EN_CLINICA');
});

it('Continuidad Call Center → WhatsApp conserva las casillas y permite apartar el horario', async () => {
  const { casos, tokens } = escenario();
  const id = await listo(casos);
  const antes = await casos.reconocerElegibilidad(id, cc);
  const token = tokens.emitir({
    tramiteId: id, hiloId: antes.tramite.hiloId, pacienteId, nivel: 1, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
  });
  const entrada = { valorContacto: '5210000000001', token };
  const retomado = await casos.retomar(entrada, wa);
  expect(retomado).toMatchObject({ tipo: 'RETOMADO', operacion: {
    siguientePregunta: { casilla: 'horario' },
    eventos: [
      { tipo: 'CanalCambiado', payload: { de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC' } },
      { tipo: 'IdentidadVinculada', payload: { pacienteId } },
    ],
  } });
  await expect(casos.retomar({ valorContacto: entrada.valorContacto }, wa))
    .resolves.toMatchObject({ tipo: 'RETOMADO', nivel: 1, operacion: { siguientePregunta: { casilla: 'horario' } } });
  await expect(casos.reservar(id, '2026-11-25T18:00:00Z', wa))
    .resolves.toMatchObject({ tramite: { estado: 'HORARIO_RESERVADO' } });
  await expect(casos.retomar(entrada, wa)).resolves.toEqual({ tipo: 'SIN_RESULTADO' });
});

it('rechaza sede sin oferta y reserva con casillas pendientes sin mutar el trámite', async () => {
  const { casos, tramites } = escenario();
  const { tramite: { id } } = await casos.iniciar('AGENDAR', 'contacto', cc);
  const servicio = await casos.seleccionarServicio(id, servicioId, cc);
  await expect(casos.seleccionarSede(id, 'otra' as SedeId, cc)).rejects.toMatchObject({
    regla: 'SERVICIO_NO_DISPONIBLE_EN_SEDE', datos: { alternativas: [sedeId] },
  });
  expect((await tramites.obtener(id))?.version).toBe(servicio.tramite.version);
  await casos.seleccionarSede(id, sedeId, cc);
  await expect(casos.reservar(id, '2026-11-25T18:00:00Z', cc)).rejects.toMatchObject({
    regla: 'CASILLAS_PENDIENTES', datos: { casillas: ['paciente', 'requisitos'] },
  });
});

it('confirma una vez ante dos operaciones simultáneas y cancela solo con aprobación', async () => {
  const { casos } = escenario();
  const id = await listo(casos);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  const respuestas = await Promise.allSettled([casos.confirmar(id, cc), casos.confirmar(id, cc)]);
  expect(respuestas.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
  expect(respuestas.find(({ status }) => status === 'rejected')).toMatchObject({
    reason: { codigo: 'CONFLICTO_VERSION' },
  });
  await expect(casos.cancelar(id, { ...wa, vinculado: true })).rejects.toMatchObject({
    factores: ['OTP', 'BOTON_APROBACION'],
  });
  await expect(casos.cancelar(id, { ...wa, vinculado: true, factores: new Set(['BOTON_APROBACION']) }))
    .resolves.toMatchObject({ tramite: { estado: 'CANCELADA' } });
});

it('registra llegada con el QR una sola vez', async () => {
  const { casos, tokens } = escenario();
  const id = await listo(casos);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  const cita = await casos.confirmar(id, cc);
  const qr = tokens.emitir({
    tramiteId: id, hiloId: cita.tramite.hiloId, nivel: 1, canalOrigen: 'app', metodo: 'TOKEN_WEB',
  }, 'LLEGADA');
  const clinica = { ...cc, canal: 'clinica', actor: 'recepcion:demo' } as const;
  await expect(casos.retomar({ valorContacto: 'contacto', token: qr }, wa)).resolves.toEqual({ tipo: 'SIN_RESULTADO' });
  await expect(casos.registrarLlegada(qr, clinica)).resolves.toMatchObject({ tramite: { estado: 'EN_CLINICA' } });
  await expect(casos.registrarLlegada(qr, clinica)).rejects.toMatchObject({ regla: 'TOKEN_INVALIDO' });
});

const recepcion = { ...cc, canal: 'clinica', actor: 'recepcion:demo' } as const;

async function formarFila(puertos: ReturnType<typeof escenario>) {
  const { casos, tokens, reloj } = puertos;
  const fila = [];
  for (const hora of [20, 19, 18]) {
    const id = await listo(casos);
    await casos.reservar(id, `2026-11-25T${hora}:00:00Z`, cc);
    const { tramite } = await casos.confirmar(id, cc);
    const qr = tokens.emitir({
      tramiteId: id, hiloId: tramite.hiloId, nivel: 1, canalOrigen: 'app', metodo: 'TOKEN_WEB',
    }, 'LLEGADA');
    await casos.registrarLlegada(qr, recepcion);
    reloj.adelantar(1000);
    fila.push(id);
  }
  return fila;
}

it.each([0, 1])('cierra la atención en el índice %i y actualiza solo los turnos posteriores', async indice => {
  const puertos = escenario();
  const fila = await formarFila(puertos);
  const cierre = await puertos.casos.cerrarAtencion(fila[indice]!, recepcion);
  expect(cierre).toMatchObject({ tramite: { estado: 'ATENDIDA' }, eventos: [{ tipo: 'AtencionCerrada' }] });
  const turnos = puertos.tramites.eventos().filter(evento => evento.tipo === 'TurnoActualizado');
  expect(turnos).toMatchObject(fila.slice(indice + 1).map((id, i) => ({
    tramiteId: id, payload: { posicion: indice + i + 1 }, correlationId: recepcion.correlationId,
  })));
  expect(new Set(turnos.map(evento => evento.idempotencyKey)).size).toBe(turnos.length);
});

it('solo permite cerrar la atención a recepción desde clínica', async () => {
  const puertos = escenario();
  const [id] = await formarFila(puertos);
  await expect(puertos.casos.cerrarAtencion(id!, cc)).rejects.toMatchObject({ regla: 'SOLO_RECEPCION' });
  expect((await puertos.tramites.obtener(id!))?.estado).toBe('EN_CLINICA');
});

it('conserva la respuesta al fallar un turno y actualiza los siguientes', async () => {
  const registrarError = vi.fn();
  const puertos = escenario(registrarError);
  const [primero, segundo, tercero] = await formarFila(puertos);
  const guardar = puertos.tramites.guardar.bind(puertos.tramites);
  vi.spyOn(puertos.tramites, 'guardar').mockImplementation(async tramite => {
    if (tramite.id === segundo) throw new Error('Fallo simulado');
    await guardar(tramite);
  });
  await expect(puertos.casos.cerrarAtencion(primero!, recepcion))
    .resolves.toMatchObject({ tramite: { estado: 'ATENDIDA' } });
  expect(registrarError).toHaveBeenCalledExactlyOnceWith({
    codigo: 'TURNO_NO_ACTUALIZADO', correlation_id: recepcion.correlationId,
  });
  expect(puertos.tramites.eventos().filter(evento => evento.tipo === 'TurnoActualizado')).toMatchObject([
    { tramiteId: tercero, payload: { posicion: 2 } },
  ]);
});

it('pide fecha de nacimiento para un folio y bloquea al tercer intento', async () => {
  const { casos, reloj, eventos } = escenario();
  const id = await listo(casos);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  const { tramite } = await casos.confirmar(id, cc);
  const entrada = { folio: tramite.folio!, valorContacto: 'desconocido' };
  await expect(casos.retomar(entrada, wa)).resolves.toEqual({
    tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC',
  });
  for (let i = 0; i < 3; i++) {
    await casos.retomar({ ...entrada, fechaNac: '2000-01-01' }, { ...wa, idempotencyKey: 'fallo:' + i });
  }
  expect(eventos.eventos()).toHaveLength(3);
  expect(eventos.eventos().map(({ payload }) => payload)).toEqual([1, 2, 3].map((intentos) => ({ metodo: 'FOLIO_FECHA_NAC', intentos })));
  await expect(casos.retomar({ ...entrada, fechaNac: datos.fechaNac }, wa)).resolves.toMatchObject({ tipo: 'BLOQUEADO' });
  reloj.adelantar(15 * 60_000);
  await expect(casos.retomar({ ...entrada, fechaNac: datos.fechaNac }, wa)).resolves.toMatchObject({ tipo: 'RETOMADO' });
});

it('pide OTP para datos declarados con coincidencia única sin exponer identidad', async () => {
  const { casos } = escenario();
  await expect(casos.retomar({ valorContacto: 'nuevo', datosDeclarados: datos }, wa))
    .resolves.toEqual({ tipo: 'REQUIERE_VERIFICACION', metodo: 'OTP' });
});

it('el token prevalece sobre el vínculo de otro paciente', async () => {
  const { casos, tokens } = escenario();
  const primero = await listo(casos);
  const otraPersona = 'otra' as PacienteId;
  const { tramite } = await casos.reconocerElegibilidad(primero, cc);
  const token = tokens.emitir({
    tramiteId: primero, hiloId: tramite.hiloId, pacienteId, nivel: 2, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
  });
  const { tramite: tercero } = await casos.iniciar('AGENDAR', 'otro', cc);
  await casos.asignarPaciente(tercero.id, otraPersona, cc);
  const inicial = tokens.emitir({
    tramiteId: tercero.id, hiloId: tercero.hiloId, pacienteId: otraPersona, nivel: 1,
    canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
  });
  await casos.retomar({ valorContacto: 'compartido', token: inicial }, wa);
  await expect(casos.retomar({ valorContacto: 'compartido', token }, wa)).resolves.toMatchObject({
    tipo: 'RETOMADO', nivel: 2, operacion: { tramite: { id: primero } },
  });
  const ambiguo = await casos.retomar({ valorContacto: 'compartido' }, wa);
  expect(ambiguo).toEqual(await casos.retomar({ valorContacto: 'desconocido' }, wa));
  expect(ambiguo).toEqual({ tipo: 'SIN_RESULTADO' });
});

it('lista varios trámites del mismo paciente solo con el resumen de nivel 1', async () => {
  const { casos, tokens } = escenario();
  const primero = await listo(casos);
  await listo(casos, undefined, '5210000000085');
  const { tramite } = await casos.reconocerElegibilidad(primero, cc);
  const token = tokens.emitir({
    tramiteId: primero, hiloId: tramite.hiloId, pacienteId, nivel: 2, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
  });
  await casos.retomar({ valorContacto: 'vinculado', token }, wa);
  await expect(casos.retomar({ valorContacto: 'vinculado' }, wa)).resolves.toEqual({
    tipo: 'VARIOS',
    resumenes: [
      { servicioId, sedeId, canalOrigen: 'callcenter' },
      { servicioId, sedeId, canalOrigen: 'callcenter' },
    ],
  });
});

it('el teléfono capturado exige folio y fecha y no permite retomar con el número solo', async () => {
  const { casos } = escenario();
  await listo(casos);
  await expect(casos.retomar({ valorContacto: '5210000000001' }, wa)).resolves.toEqual({
    tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC',
    resumenes: [{ servicioId, sedeId, canalOrigen: 'callcenter' }],
  });
});

it('protege las guardas del inicio y de la captura y detecta cambios concurrentes', async () => {
  const { casos } = escenario();
  await expect(casos.iniciar('FACTURA', 'contacto', cc)).rejects.toMatchObject({ regla: 'TIPO_TRAMITE_NO_REGISTRADO' });
  const { tramite: { id } } = await casos.iniciar('AGENDAR', 'contacto', cc);
  await expect(casos.seleccionarServicio(id, 'inexistente' as ServicioId, cc)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  await expect(casos.reconocerElegibilidad(id, cc)).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' });
  await casos.seleccionarServicio(id, servicioId, cc);
  await expect(casos.asignarPaciente(id, 'inexistente' as PacienteId, cc)).rejects.toMatchObject({ regla: 'CASILLAS_PENDIENTES' });
  const capturas = await Promise.allSettled([
    casos.cumplirRequisito(id, 'ORDEN_MEDICA', cc),
    casos.cumplirRequisito(id, 'ORDEN_MEDICA', cc),
  ]);
  expect(capturas.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
  expect(capturas.find(({ status }) => status === 'rejected')).toMatchObject({ reason: { codigo: 'CONFLICTO_VERSION' } });
});

it('expira el hold al confirmar sin consultar la agenda externa', async () => {
  const { casos, reloj, agendaExterna, tramites } = escenario();
  const registrar = vi.spyOn(agendaExterna, 'registrarCita');
  const id = await listo(casos);
  await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  reloj.adelantar(600_000);
  await expect(casos.confirmar(id, cc)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  expect(registrar).not.toHaveBeenCalled();
  expect((await tramites.obtener(id))?.estado).toBe('LISTO_PARA_RESERVAR');
  expect(tramites.eventos().at(-1)?.tipo).toBe('ReservaExpirada');
});

it('conserva el hold con agenda externa caída y compensa ante un conflicto posterior', async () => {
  const { casos, agendaExterna, tramites } = escenario();
  const id = await listo(casos);
  const reserva = await casos.reservar(id, '2026-11-25T18:00:00Z', cc);
  agendaExterna.fallar = true;
  await expect(casos.confirmar(id, cc)).rejects.toMatchObject({ regla: 'AGENDA_NO_DISPONIBLE' });
  expect((await tramites.obtener(id))?.version).toBe(reserva.tramite.version);
  agendaExterna.fallar = false;
  const registrar = agendaExterna.registrarCita.bind(agendaExterna);
  vi.spyOn(agendaExterna, 'registrarCita').mockImplementationOnce(async (solicitud) => {
    const folio = await registrar(solicitud);
    const actual = await tramites.obtener(id);
    if (!actual) throw new Error('Falta el trámite.');
    actual.retomar({ canal: 'whatsapp', actor: 'paciente', nivelAuth: 1, ts: '2026-11-24T12:00:00Z',
      correlationId: 'conflicto', idempotencyKey: 'conflicto' }, 'TOKEN_CC');
    await tramites.guardar(actual);
    return folio;
  });
  await expect(casos.confirmar(id, cc)).rejects.toMatchObject({ codigo: 'CONFLICTO_VERSION' });
  expect(agendaExterna.activa('10000000')).toBe(false);
});

it('rechaza asignar por ID desde el canal del paciente y conserva la asignación para el asesor', async () => {
  const { casos, tramites } = escenario();
  const { tramite } = await casos.iniciar('AGENDAR', '5210000000001', cc);
  await expect(casos.asignarPaciente(tramite.id, pacienteId, wa)).rejects.toMatchObject({
    regla: 'ASIGNACION_SOLO_PERSONAL',
  });
  const sinAsignar = await tramites.obtener(tramite.id);
  expect(sinAsignar?.version).toBe(tramite.version);
  expect(sinAsignar?.pacienteId).toBeUndefined();
  await expect(casos.asignarPaciente(tramite.id, pacienteId, cc)).resolves.toMatchObject({
    tramite: { pacienteId },
  });
});

it('Vínculo declarado no revela', async () => {
  const { casos, contactos, reloj, intentos, eventos } = escenario();
  const numero = '5210000000071';
  const abierto = await casos.iniciar('AGENDAR', '5210000000072', cc);
  await casos.asignarPaciente(abierto.tramite.id, pacienteId, cc);
  const actual = await casos.iniciar('AGENDAR', numero, wa);
  const contacto = await contactos.buscar('whatsapp', numero);
  if (!contacto) throw new Error('Falta el contacto.');
  expect(contacto.hiloId).toBe(actual.tramite.hiloId);
  expect(contacto.hiloId).not.toBe(abierto.tramite.hiloId);
  const ts = reloj.ahora().toISOString();
  await contactos.vincular(contacto.id, {
    pacienteId, relacion: 'FAMILIAR', metodo: 'FLOW_DECLARADO', nivel: 0, ultimoUso: ts,
  });
  const fallar = vi.spyOn(intentos, 'fallar');
  const agregar = vi.spyOn(eventos, 'agregar');
  await expect(casos.retomar({ valorContacto: numero }, wa)).resolves.toEqual({ tipo: 'SIN_RESULTADO' });
  expect(fallar).not.toHaveBeenCalled();
  expect(agregar).not.toHaveBeenCalled();
});

it('rechaza CURP_INVALIDA en el caso de uso sin avanzar ni contar intento', async () => {
  const { casos, intentos, tramites } = escenario();
  const numero = '5210000000073';
  const { tramite } = await casos.iniciar('AGENDAR', numero, cc);
  const pendiente = await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, cc);
  const fallar = vi.spyOn(intentos, 'fallar');
  await expect(casos.identificarPaciente(tramite.id, { paso: 'CURP', curp: 'PELA900228XNTRNN05' }, numero, cc))
    .rejects.toMatchObject({ regla: 'CURP_INVALIDA' });
  const actual = await tramites.obtener(tramite.id);
  expect(actual?.pasoIdentificacion()).toBe('CURP');
  expect(actual?.version).toBe(pendiente.tramite.version);
  expect(fallar).not.toHaveBeenCalled();
});

it.each([
  { curp: 'PELA900228XNTRNN05', fechaNac: undefined },
  { curp: 'PELA900228XNTRNN04', fechaNac: '1990-02-27' },
])('en demo continúa sin CURP cuando el verificador o la fecha no coinciden', async ({ curp, fechaNac }) => {
  const { casos, intentos, pacientes } = escenario(undefined, { curpFlexible: true });
  const numero = '5210000000073';
  const { tramite } = await casos.iniciar('AGENDAR', numero, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: fechaNac ? 'MI' : 'OTRA_PERSONA' }, numero, cc);
  if (fechaNac) {
    await casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac }, numero, cc);
  }
  const fallar = vi.spyOn(intentos, 'fallar');
  const resultado = await casos.identificarPaciente(tramite.id, { paso: 'CURP', curp }, numero, cc);
  const pregunta = resultado.siguientePregunta;
  expect(pregunta).toMatchObject({ pista: { paso: 'DATOS' } });
  const campos = pregunta.tipo === 'PREGUNTA' ? pregunta.pista?.campos?.map(campo => campo.id) : [];
  expect(campos).toEqual(expect.arrayContaining(['sexo', 'entidadNacimiento']));
  expect(campos?.includes('fechaNac')).toBe(!fechaNac);
  expect(resultado.eventos.map(evento => evento.tipo)).not.toContain('IntentoVerificacionFallido');
  expect(fallar).not.toHaveBeenCalled();
  const asignado = await casos.identificarPaciente(tramite.id, {
    paso: 'DATOS', nombre: 'Paciente', apellidoPaterno: 'Prueba', fechaNac: fechaNac ?? '1990-02-28',
    sexo: 'X', entidadNacimiento: 'NT',
  }, numero, cc);
  expect(asignado.tramite.pacienteId).toBeDefined();
  expect(await pacientes.buscarPorCurp(curp)).toBeUndefined();
});

it('en demo asigna al paciente sin guardar una CURP válida con nombres distintos', async () => {
  const { casos, pacientes } = escenario(undefined, { curpFlexible: true });
  const numero = '5210000000073';
  const curp = 'PELA900228XNTRNN04';
  const { tramite } = await casos.iniciar('AGENDAR', numero, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'CURP', curp }, numero, cc);
  const resultado = await casos.identificarPaciente(tramite.id, {
    paso: 'DATOS', nombre: 'Paciente', apellidoPaterno: 'Prueba',
  }, numero, cc);
  expect(resultado.tramite.pacienteId).toBeDefined();
  expect(await pacientes.buscarPorCurp(curp)).toBeUndefined();
  expect(await pacientes.buscarPorDatos({
    nombre: 'Paciente', apellidoPaterno: 'Prueba', fechaNac: '1990-02-28',
  })).toEqual([resultado.tramite.pacienteId]);
});

it('Declaración no reactiva un vínculo vencido', async () => {
  const { casos, contactos, pacientes } = escenario();
  const numero = '5210000000003';
  const curp = 'PELA900228XNTRNN04';
  const idPaciente = 'paciente-curp' as PacienteId;
  await pacientes.registrar(idPaciente, { nombre: 'Ana', apellidoPaterno: 'Pérez', fechaNac: '1990-02-28', sexo: 'X', curp });
  const { tramite } = await casos.iniciar('AGENDAR', numero, wa);
  const contacto = await contactos.buscar('whatsapp', numero);
  if (!contacto) throw new Error('Falta el contacto.');
  const previo = { pacienteId: idPaciente, nivel: 1, metodo: 'TELEFONO_FECHA_NAC',
    relacion: 'TITULAR', ultimoUso: '2026-01-01T00:00:00.000Z' } as const;
  await contactos.vincular(contacto.id, previo);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, wa);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'CURP', curp }, numero, wa))
    .resolves.toMatchObject({ tramite: { pacienteId: idPaciente } });
  expect(await contactos.vinculosDe(contacto.id)).toEqual([previo]);
  await expect(casos.retomar({ valorContacto: numero }, wa)).resolves.toEqual({ tipo: 'SIN_RESULTADO' });
  const nuevo = await casos.iniciar('AGENDAR', numero, wa);
  const titular = await casos.identificarPaciente(nuevo.tramite.id, { paso: 'DESTINATARIO', para: 'MI' }, numero, wa);
  expect(titular.tramite.pasoIdentificacion()).toBe('FECHA_NAC');
  expect(titular.tramite.identificacion?.candidatos).toBeUndefined();
});

it('CURP con sexo X registra sin base y valida los nombres', async () => {
  const { casos, pacientes } = escenario();
  const numero = '5210000000004';
  const curp = 'PELA900228XNTRNN04';
  const { tramite } = await casos.iniciar('AGENDAR', numero, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'CURP', curp }, numero, cc);
  const nombres = { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: 'Luna' } as const;
  await expect(casos.identificarPaciente(tramite.id, { ...nombres, apellidoPaterno: 'García' }, numero, cc))
    .rejects.toMatchObject({ regla: 'CURP_NO_COINCIDE' });
  const resultado = await casos.identificarPaciente(tramite.id, nombres, numero, cc);
  const id = resultado.tramite.pacienteId;
  if (!id) throw new Error('Falta el paciente.');
  expect(await pacientes.buscarPorCurp(curp)).toBe(id);
  expect(await pacientes.baseDe(id)).toBeUndefined();
  expect(await pacientes.datosElegibilidad(id)).toEqual({ fechaNac: '1990-02-28', sexo: 'X' });
  expect(resultado.tramite.identificacion).toEqual({ relacion: 'FAMILIAR' });
  expect(resultado.eventos.map(evento => evento.tipo)).toEqual(['PacienteRegistrado', 'PacienteAsignado']);
  expect(JSON.stringify(resultado.eventos)).not.toMatch(/PELA900228|1990-02-28|Pérez/);
});

it('verifica por fecha solo al candidato elegido y conserva nivel según el método', async () => {
  const { casos, contactos, pacientes, reloj } = escenario();
  const waId = '5210000000021';
  const ani = '0000000021';
  const origen = await casos.iniciar('AGENDAR', waId, wa);
  await casos.asignarPaciente(origen.tramite.id, pacienteId, cc);
  const waContacto = await contactos.buscar('whatsapp', waId);
  if (!waContacto) throw new Error('Falta el contacto.');
  const otro = 'otra-persona' as PacienteId;
  await pacientes.registrar(otro, { nombre: 'Ana', apellidoPaterno: 'Demo', fechaNac: '1988-02-28', sexo: 'F' });
  for (const id of [pacienteId, otro]) {
    await contactos.vincular(waContacto.id, { pacienteId: id, nivel: 0, relacion: 'FAMILIAR',
      metodo: 'FLOW_DECLARADO', ultimoUso: '2026-11-01T00:00:00.000Z' });
  }
  const { tramite } = await casos.iniciar('AGENDAR', ani, { ...cc, actor: 'sistema' });
  const destinatario = await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'MI' }, ani, cc);
  expect(destinatario.siguientePregunta).toMatchObject({ pista: { paso: 'CONFIRMAR',
    opciones: expect.arrayContaining([{ id: 'NINGUNO', payload: 'NINGUNO', titulo: 'No soy ninguno' }]) } });
  const candidatos = destinatario.tramite.identificacion?.candidatos ?? [];
  expect(candidatos.map(({ nombreVisible }) => nombreVisible)).toEqual(['Ana D.', 'Paciente F.']);
  const elegido = candidatos.find(candidato => candidato.pacienteId === pacienteId);
  if (!elegido) throw new Error('Falta el candidato.');
  for (let intento = 1; intento <= 3; intento++) {
    await casos.identificarPaciente(tramite.id, { paso: 'CONFIRMAR', candidato: elegido.ref }, ani, cc);
    const fallo = await casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac: '1988-02-28' }, ani, cc);
    expect(fallo.tramite.pasoIdentificacion()).toBe('CONFIRMAR');
    expect(fallo.eventos).toMatchObject([{ tipo: 'IntentoVerificacionFallido', payload: { intentos: intento } }]);
  }
  await casos.identificarPaciente(tramite.id, { paso: 'CONFIRMAR', candidato: elegido.ref }, ani, cc);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac: datos.fechaNac }, ani, cc))
    .rejects.toMatchObject({ regla: 'IDENTIFICACION_BLOQUEADA' });

  const observado = await casos.retomar({ valorContacto: waId }, wa);
  expect(observado).toEqual({ tipo: 'SIN_RESULTADO' });
  reloj.adelantar(15 * 60_000);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac: datos.fechaNac }, ani, cc))
    .resolves.toMatchObject({ tramite: { pacienteId } });
});

it('confirma a un paciente por teléfono y fecha, sin pedir CURP', async () => {
  const { casos, contactos } = escenario();
  const origen = await casos.iniciar('AGENDAR', '5210000000022', wa);
  const primario = await contactos.buscar('whatsapp', '5210000000022');
  if (!primario) throw new Error('Falta el contacto.');
  await contactos.vincular(primario.id, { pacienteId, nivel: 0, relacion: 'FAMILIAR',
    metodo: 'FLOW_DECLARADO', ultimoUso: '2026-11-01T00:00:00.000Z' });
  const ani = '0000000022';
  const { tramite } = await casos.iniciar('AGENDAR', ani, cc);
  const titular = await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'MI' }, ani, cc);
  const candidato = titular.tramite.identificacion?.candidatos?.[0];
  if (!candidato) throw new Error('Falta el candidato.');
  await casos.identificarPaciente(tramite.id, { paso: 'CONFIRMAR', candidato: candidato.ref }, ani, cc);
  const resultado = await casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac: datos.fechaNac }, ani, cc);
  expect(resultado.tramite.pacienteId).toBe(pacienteId);
  expect(resultado.eventos).toMatchObject([{ tipo: 'IdentidadComprobada' }, { tipo: 'PacienteAsignado' }]);
  const destino = await contactos.buscar('callcenter', ani);
  if (!destino) throw new Error('Falta el contacto.');
  expect(await contactos.vinculosDe(destino.id)).toMatchObject([{ nivel: 1, metodo: 'TELEFONO_FECHA_NAC', relacion: 'TITULAR' }]);
  expect(await contactos.vinculosDe(primario.id)).toMatchObject([{ nivel: 0, metodo: 'FLOW_DECLARADO' }]);
  expect(origen.tramite.pacienteId).toBeUndefined();
});

it('guarda y reutiliza un registro sin CURP, y después completa la CURP por la base', async () => {
  const { casos, pacientes } = escenario();
  const n = '5210000000023';
  const declarado = { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: 'Luna',
    fechaNac: '1990-02-28', sexo: 'F', entidadNacimiento: 'NT' } as const;
  const iniciar = async (numero: string) => {
    const { tramite } = await casos.iniciar('AGENDAR', numero, { ...cc, actor: 'sistema' });
    await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, cc);
    return tramite.id;
  };
  const id = await iniciar(n);
  const sinCurp = await casos.identificarPaciente(id, { paso: 'CURP', curp: null }, n, cc);
  expect(sinCurp.siguientePregunta).toMatchObject({ pista: { paso: 'DATOS',
    campos: expect.arrayContaining([expect.objectContaining({ id: 'sexo' }), expect.objectContaining({ id: 'entidadNacimiento' })]) } });
  const nuevo = await casos.identificarPaciente(id, declarado, n, cc);
  const creado = nuevo.tramite.pacienteId;
  if (!creado) throw new Error('Falta el paciente.');
  expect(await pacientes.baseDe(creado)).toBe('PELA900228MNTRNN');
  const repetido = await iniciar(n);
  await casos.identificarPaciente(repetido, { paso: 'CURP', curp: null }, n, cc);
  await expect(casos.identificarPaciente(repetido, declarado, n, cc))
    .resolves.toMatchObject({ tramite: { pacienteId: creado }, eventos: [{ tipo: 'PacienteAsignado' }] });
  const curp = 'PELA900228MNTRNN00';
  const completar = await iniciar(n);
  await expect(casos.identificarPaciente(completar, { paso: 'CURP', curp }, n, cc))
    .resolves.toMatchObject({ tramite: { pacienteId: creado } });
  expect(await pacientes.buscarPorCurp(curp)).toBe(creado);
});

it('retoma en CURP en otro canal tras No soy ninguno, y rechaza una fecha distinta', async () => {
  const { casos, contactos, intentos, tokens } = escenario();
  const n = '5210000000025';
  const { tramite } = await casos.iniciar('AGENDAR', n, cc);
  const contacto = await contactos.buscar('callcenter', n);
  if (!contacto) throw new Error('Falta el contacto.');
  await contactos.vincular(contacto.id, { pacienteId, nivel: 1, metodo: 'TELEFONO_FECHA_NAC',
    relacion: 'TITULAR', ultimoUso: '2026-11-01T00:00:00.000Z' });
  await casos.seleccionarServicio(tramite.id, servicioId, cc);
  await casos.seleccionarSede(tramite.id, sedeId, cc);
  await casos.cumplirRequisito(tramite.id, 'ORDEN_MEDICA', cc);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'MI' }, n, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'CONFIRMAR', candidato: null }, n, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'FECHA_NAC', fechaNac: '1990-02-27' }, n, cc);
  const token = tokens.emitir({ tramiteId: tramite.id, hiloId: tramite.hiloId, nivel: 0,
    canalOrigen: 'callcenter', metodo: 'TOKEN_CC' });
  const retomado = await casos.retomar({ valorContacto: n, token }, wa);
  if (retomado.tipo !== 'RETOMADO') throw new Error('No se retomó el trámite.');
  expect(retomado.operacion.siguientePregunta).toMatchObject({ casilla: 'paciente', pista: { paso: 'CURP' } });
  expect(retomado.operacion.tramite.pasoIdentificacion()).toBe('CURP');
  const estado = retomado.operacion.tramite;
  expect(estado.identificacion?.ninguno).toBe(true);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'CURP', curp: 'PELA900228XNTRNN04' }, n, wa))
    .rejects.toMatchObject({ regla: 'CURP_NO_COINCIDE' });
  expect(await intentos.fallar(contacto.id, '2026-11-24T12:00:00Z')).toMatchObject({ intentos: 1 });
});

it('rechaza coincidencias múltiples por base y por datos', async () => {
  const { casos, pacientes } = escenario();
  const n = '5210000000026';
  const declarado = { nombre: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: 'Luna',
    fechaNac: '1990-02-28', sexo: 'F', entidadNacimiento: 'NT', curpBase: 'PELA900228MNTRNN' } as const;
  for (const id of ['duplicado-a', 'duplicado-b']) await pacientes.registrar(id as PacienteId, declarado);
  const { tramite } = await casos.iniciar('AGENDAR', n, cc);
  await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, n, cc);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'CURP', curp: 'PELA900228MNTRNN00' }, n, cc))
    .rejects.toMatchObject({ regla: 'IDENTIDAD_AMBIGUA' });
  await casos.identificarPaciente(tramite.id, { paso: 'CURP', curp: null }, n, cc);
  await expect(casos.identificarPaciente(tramite.id, { paso: 'DATOS', ...declarado }, n, cc))
    .rejects.toMatchObject({ regla: 'IDENTIDAD_AMBIGUA' });
});

it('un fallo al guardar el trámite nuevo conserva el último canal del hilo', async () => {
  const { casos, hilos, tramites } = escenario();
  const numero = '5210000000076';
  const { tramite } = await casos.iniciar('AGENDAR', numero, cc);
  const hilo = await hilos.obtener(tramite.hiloId);
  if (!hilo) throw new Error('Falta el hilo.');
  hilo.atenderEn('whatsapp');
  await hilos.guardar(hilo);

  const guardar = vi.spyOn(tramites, 'guardar').mockRejectedValueOnce(new Error('Fallo de persistencia simulado.'));
  try {
    await expect(casos.iniciar('AGENDAR', numero, cc)).rejects.toThrow('Fallo de persistencia simulado.');
    expect((await hilos.obtener(tramite.hiloId))?.ultimoCanal).toBe('whatsapp');
    expect((await tramites.abiertosPorHilo(tramite.hiloId)).map(({ id }) => id)).toEqual([tramite.id]);
  } finally {
    guardar.mockRestore();
  }
});
