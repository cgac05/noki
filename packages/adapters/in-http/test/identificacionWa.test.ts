import { expect, it } from 'vitest';
import { RespuestaMensajeWaSchema } from '@noki/contracts';
import type { IdentificarPacientePayload } from '@noki/application';
import type { TramiteId } from '@noki/domain';
import { mensajesIdentificacion, respuestaFlowIdentificacion } from '../src/identificacionWa.ts';

const tramiteId = '01937954-6c40-7000-8000-000000000003' as TramiteId;

it('traduce el nombre enmascarado y No soy ninguno sin publicar la referencia del candidato', () => {
  const comandos: IdentificarPacientePayload[] = [];
  const mensajes = mensajesIdentificacion({
    entrada: 'LISTA', paso: 'CONFIRMAR', opciones: [
      { id: '1', titulo: 'Soy Ana P.', payload: 'referencia-candidata' },
      { id: '2', titulo: 'No soy ninguno', payload: 'NINGUNO' },
    ],
  }, payload => 'op:' + comandos.push(payload));
  expect(RespuestaMensajeWaSchema.parse({ mensajes }).mensajes).toEqual(mensajes);
  expect(mensajes[0]).toMatchObject({ secciones: [{ filas: [{ titulo: 'Soy Ana P.' }, { titulo: 'No soy ninguno' }] }] });
  expect(JSON.stringify(mensajes)).not.toContain('referencia-candidata');
  expect(comandos).toEqual([
    { paso: 'CONFIRMAR', candidato: 'referencia-candidata' }, { paso: 'CONFIRMAR', candidato: null },
  ]);
});

it('traduce Sin CURP y valida campos de Flow por id', () => {
  const comandos: IdentificarPacientePayload[] = [];
  const mensajes = mensajesIdentificacion({
    entrada: 'FLOW', paso: 'CURP', campos: [{ id: 'curp', etiqueta: 'CURP', captura: 'sensitive', requerido: true }],
  }, payload => 'op:' + comandos.push(payload));
  expect(RespuestaMensajeWaSchema.parse({ mensajes }).mensajes).toHaveLength(2);
  expect(comandos).toEqual([{ paso: 'CURP', curp: null }]);
  const pista = {
    entrada: 'FLOW', paso: 'FECHA_NAC',
    campos: [{ id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true }],
  } as const;
  const pregunta = { ...pista, campos: [...pista.campos] };
  expect(respuestaFlowIdentificacion(tramiteId, pregunta, {})).toBeUndefined();
  expect(respuestaFlowIdentificacion(tramiteId, pregunta, { fechaNac: '1990-02-30' })).toBeUndefined();
  expect(respuestaFlowIdentificacion(tramiteId, pregunta, { fechaNac: '1990-02-28' })).toEqual({
    paso: 'FECHA_NAC', fechaNac: '1990-02-28',
  });
});
