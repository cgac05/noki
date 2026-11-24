import { expect } from 'vitest';
import type {
  BandejaPort, ConversacionesWa, RegistroComandos, RegistroTokensUsados,
} from '../../../packages/application/src/index.ts';

export async function probarPuertosApi(
  comandos: RegistroComandos, conversaciones: ConversacionesWa, bandeja: BandejaPort,
  tokens: RegistroTokensUsados, contactoId: string,
): Promise<void> {
  const ts = '2026-11-24T12:00:00.000Z';
  const clave = '01937954-6c40-7000-8000-000000000050';
  const jti = '01937954-6c40-7000-8000-000000000051';
  const respuestas = await Promise.all(Array.from({ length: 8 }, () => comandos.reservar(clave, 'huella', ts)));
  expect(respuestas.filter(({ estado }) => estado === 'NUEVA')).toHaveLength(1);
  expect(respuestas.filter(({ estado }) => estado === 'EN_CURSO')).toHaveLength(7);
  expect(await comandos.reservar(clave, 'ajena', ts)).toEqual({ estado: 'HUELLA_DISTINTA' });
  expect(await comandos.reservar(clave, 'huella', '2026-11-24T12:01:01.000Z')).toEqual({ estado: 'NUEVA' });
  await comandos.soltar(clave);
  expect(await comandos.reservar(clave, 'huella', ts)).toEqual({ estado: 'NUEVA' });
  const respuesta = { codigo: 'REGLA_VIOLADA' };
  await comandos.completar(clave, 422, respuesta);
  await comandos.soltar(clave);
  expect(await comandos.reservar(clave, 'huella', ts)).toEqual({ estado: 'COMPLETADA', codigo: 422, respuesta });

  expect(await conversaciones.obtener(contactoId)).toBeNull();
  await conversaciones.guardar(contactoId, { opciones: [] }, ts);
  await conversaciones.guardar(contactoId, { opciones: ['op:ejemplo'] }, ts);
  expect(await conversaciones.obtener(contactoId)).toEqual({ opciones: ['op:ejemplo'] });
  const mensaje = { id: clave, canal: 'sms', asunto: 'Demo', cuerpo: 'Prueba', ts } as const;
  await bandeja.agregar(mensaje);
  await bandeja.agregar(mensaje);
  expect(await bandeja.listar()).toEqual([mensaje]);

  expect(await tokens.usado(jti)).toBe(false);
  const usos = await Promise.all([tokens.consumir(jti, ts), tokens.consumir(jti, ts)]);
  expect(usos.filter(Boolean)).toHaveLength(1);
  expect(await tokens.usado(jti)).toBe(true);
}
