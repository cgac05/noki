import { Writable } from 'node:stream';
import { expect, it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import type { HiloId, PacienteId, TramiteId } from '../../../packages/domain/src/index.ts';

it('busca la sesión web por los últimos diez dígitos y el vínculo más reciente', async () => {
  const registros: string[] = [];
  const salidaLog = new Writable({
    write(trozo: Buffer, _codificacion, terminar) {
      registros.push(trozo.toString('utf8'));
      terminar();
    },
  });
  const { app, ids, contactos, pacientes } = crearApiPruebas({ salidaLog });
  const contacto = { id: ids.nuevo(), hiloId: ids.nuevo() as HiloId, canal: 'whatsapp', valor: '+52 1 (000) 000-0001' } as const;
  try {
    await contactos.crear(contacto);
    const registrar = async (nombre: string, ultimoUso: string) => {
      const pacienteId = ids.nuevo() as PacienteId;
      await pacientes.registrar(pacienteId, { nombre, apellidoPaterno: 'Pérez', fechaNac: '1990-01-01', sexo: 'F' });
      await contactos.vincular(contacto.id, { pacienteId, metodo: 'OTP_SMS', nivel: 1, relacion: 'TITULAR', ultimoUso });
      return pacienteId;
    };
    await registrar('Ana', '2026-11-22T12:00:00Z');
    const pacienteId = await registrar('Beatriz', '2026-11-24T12:00:00Z');
    const respuesta = await app.inject('/api/demo/sesion-web/5210000000001');
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ pacienteId, nombreVisible: 'Beatriz P.', tramitesEnProceso: [] });
    expect((await app.inject('/api/demo/sesion-web/5210000000099')).statusCode).toBe(404);
    expect((await app.inject('/api/demo/sesion-web/123')).statusCode).toBe(400);
    const log = registros.join('');
    expect(log).toContain('correlation_id');
    expect(log).toContain('/api/demo/sesion-web/:telefono');
    expect(log).not.toMatch(/\/api\/demo\/sesion-web\/\d/u);
  } finally { await app.close(); }
});

it.each([true, false])('la asignación de paciente desde web queda limitada a demo=%s', async demo => {
  const { app, ids, pacientes, tramites } = crearApiPruebas({ demo });
  const pacienteId = ids.nuevo() as PacienteId;
  const enviar = (tipo: string, payload: object, tramiteId?: TramiteId) => app.inject({
    method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': ids.nuevo() },
    payload: { canal: 'web', actor: 'paciente', tipo, payload, tramiteId },
  });
  try {
    await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'Pérez', fechaNac: '1990-01-01', sexo: 'F' });
    const inicio = await enviar('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: '5210000000001' });
    expect(inicio.statusCode).toBe(200);
    const tramiteId = inicio.json<{ tramite: { id: TramiteId } }>().tramite.id;
    expect((await enviar('AsignarPaciente', { pacienteId }, tramiteId)).statusCode).toBe(demo ? 200 : 422);
    expect((await tramites.obtener(tramiteId))?.pacienteId).toBe(demo ? pacienteId : undefined);
  } finally { await app.close(); }
});

it('la sesión web solo existe en demo', async () => {
  const { app } = crearApiPruebas({ demo: false });
  try {
    expect((await app.inject('/api/demo/sesion-web/123')).statusCode).toBe(404);
  } finally { await app.close(); }
});

it('lista el trámite de la llamada sin paciente ni eventos y permite continuarlo en WhatsApp', async () => {
  const { app, casos, ids, tramites } = crearApiPruebas();
  try {
    const { tramite } = await casos.iniciar('AGENDAR', '3119990002', {
      canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false,
      factores: new Set(), correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
    });
    const antes = tramites.eventos();
    const sesion = await app.inject('/api/demo/sesion-web/523119990002');
    expect(sesion.statusCode).toBe(200);
    expect(sesion.json()).toEqual({
      pacienteId: null, nombreVisible: null,
      tramitesEnProceso: [expect.objectContaining({ id: tramite.id, hiloId: tramite.hiloId })],
    });
    expect(tramites.eventos()).toEqual(antes);
    const continuacion = await app.inject({
      method: 'POST', url: '/api/comandos', headers: { 'idempotency-key': ids.nuevo() },
      payload: { canal: 'web', actor: 'paciente', tramiteId: tramite.id, hiloId: tramite.hiloId,
        tipo: 'SolicitarContinuacion', payload: { destino: 'whatsapp' } },
    });
    expect(continuacion.statusCode).toBe(200);
    const ficha = await app.inject('/api/hilos/' + tramite.hiloId + '/ficha');
    const { codigoContinuacion } = ficha.json<{ codigoContinuacion: string }>();
    expect(codigoContinuacion).toBeTruthy();
    expect(tramites.eventos().some(e => e.tipo === 'CanalCambiado')).toBe(false);
    const wa = await app.inject({
      method: 'POST', url: '/api/canales/wa/mensajes', headers: { 'idempotency-key': ids.nuevo() },
      payload: { waId: '523119990002', texto: 'CONTINUAR ' + codigoContinuacion.replace(/^CONTINUAR\s+/, '') },
    });
    expect(wa.statusCode).toBe(200);
    expect(tramites.eventos().find(e => e.tipo === 'CanalCambiado')?.payload)
      .toMatchObject({ a: 'whatsapp', metodo: 'TOKEN_WEB' });
  } finally { await app.close(); }
});

it.each([true, false])('consulta la fecha de nacimiento de la llamada solo con demo=%s', async demo => {
  const { app, casos, ids, pacientes } = crearApiPruebas({ demo });
  const pacienteId = ids.nuevo() as PacienteId;
  const contexto = {
    canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false,
    factores: new Set<never>(), correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
  } as const;
  try {
    const { tramite } = await casos.iniciar('AGENDAR', '3119990004', contexto);
    const ruta = '/api/demo/callcenter/hilos/' + tramite.hiloId + '/fecha-nacimiento';
    if (!demo) {
      expect((await app.inject(ruta)).statusCode).toBe(404);
      return;
    }
    expect((await app.inject(ruta)).json()).toEqual({ fechaNacimiento: null });
    await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'P', fechaNac: '1990-02-28', sexo: 'F' });
    await casos.asignarPaciente(tramite.id, pacienteId, { ...contexto, idempotencyKey: ids.nuevo() });
    expect((await app.inject(ruta)).json()).toEqual({ fechaNacimiento: '1990-02-28' });
    const ficha = await app.inject('/api/hilos/' + tramite.hiloId + '/ficha');
    expect(ficha.json()).toMatchObject({ nombrePila: 'Ana' });
    expect(ficha.json()).not.toHaveProperty('fechaNacimiento');
  } finally { await app.close(); }
});
