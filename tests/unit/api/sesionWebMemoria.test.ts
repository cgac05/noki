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
    expect(respuesta.json()).toEqual({ pacienteId, nombreVisible: 'Beatriz P.' });
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
