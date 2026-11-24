import { expect, it } from 'vitest';
import { CasosTramite, ResolvedorContinuidad, type DatosDeclarados } from '../../../packages/application/src/index.ts';
import {
  AgendaMemoria, CatalogoMemoria, ContactosMemoria, GeneradorIdSecuencial, HiloRepoMemoria,
  PacientesMemoria, RegistroIntentosMemoria, RelojFalso, TramiteRepoMemoria, VerificadorTokensMemoria,
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

function escenario() {
  const tramites = new TramiteRepoMemoria();
  const hilos = new HiloRepoMemoria();
  const contactos = new ContactosMemoria();
  const tokens = new VerificadorTokensMemoria();
  const pacientes = new PacientesMemoria();
  const catalogo = new CatalogoMemoria();
  const agenda = new AgendaMemoria();
  const intentos = new RegistroIntentosMemoria();
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const politica = new PoliticaIdentidad();
  const ids = new GeneradorIdSecuencial();
  catalogo.registrar(servicioId, perfil, new Map([[sedeId, 5500]]));
  pacientes.registrar(pacienteId, { ...datos, sexo: 'F' });
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes, intentos);
  const casos = new CasosTramite({
    tramites, hilos, contactos, tokens, pacientes, catalogo, agenda, reloj, politica, ids,
    registro: crearRegistroTiposTramite(), resolvedor,
  });
  return { casos, reloj, contactos, tokens, intentos, tramites };
}

async function listo(casos: CasosTramite) {
  const { tramite: { id } } = await casos.iniciar('AGENDAR', '5210000000001', cc);
  await casos.asignarPaciente(id, pacienteId, cc);
  await casos.seleccionarServicio(id, servicioId, cc);
  await casos.seleccionarSede(id, sedeId, cc);
  await casos.cumplirRequisito(id, 'ORDEN_MEDICA', cc);
  return id;
}

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

it('pide fecha de nacimiento para un folio y bloquea al tercer intento', async () => {
  const { casos, reloj, intentos } = escenario();
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
  expect(intentos.eventos()).toHaveLength(3);
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
  await listo(casos);
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
