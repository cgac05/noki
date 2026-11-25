import { describe, expect, it } from 'vitest';
import type { DatosBotonWa, TokensBotonWa } from '../../../packages/application/src/index.ts';
import { RegistroTokensUsadosMemoria, RelojFalso, TokensBotonWaMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { TokensBotonWaJose } from '../../../packages/adapters/out-security/src/index.ts';

const contactoId = '019ad100-0000-7000-8000-000000000001';
const otroContactoId = '019ad100-0000-7000-8000-000000000002';
const datos: DatosBotonWa = {
  uso: 'APROBACION', accion: 'CANCELAR', contactoId,
  tramiteId: '019ad100-0000-7000-8000-000000000003',
  jti: '019ad100-0000-7000-8000-000000000004',
  expiraEn: '2026-11-25T15:10:00.000Z',
};

function preparar(tipo: string, ahora = '2026-11-25T15:00:00.000Z', demo = true) {
  const reloj = new RelojFalso(new Date(ahora));
  const usados = new RegistroTokensUsadosMemoria();
  const tokens: TokensBotonWa = tipo === 'Jose'
    ? new TokensBotonWaJose('secreto-sintetico-de-prueba-con-32-bytes', reloj, usados, demo)
    : new TokensBotonWaMemoria(reloj, usados, demo);
  return { tokens, usados, reloj };
}

describe.each(['Memoria', 'Jose'])('botones de WhatsApp en %s', tipo => {
  it('rechaza el botón de otro número sin invalidarlo y rechaza su reutilización', async () => {
    const { tokens, usados } = preparar(tipo);
    const boton = await tokens.emitir(datos);
    expect(boton).toBeTypeOf('string');
    if (!boton) throw new Error('Falta el botón de prueba');
    expect(await tokens.consumir(boton, otroContactoId)).toBeNull();
    expect(await usados.usado(datos.jti)).toBe(false);
    expect(await tokens.consumir(boton, contactoId)).toEqual(datos);
    expect(await tokens.consumir(boton, contactoId)).toBeNull();
  });

  it('consume un solo botón de aprobación entre dos acciones simultáneas', async () => {
    const { tokens } = preparar(tipo);
    const cancelar = await tokens.emitir(datos);
    const conservar = await tokens.emitir({ ...datos, accion: 'CONSERVAR' });
    if (!cancelar || !conservar) throw new Error('Faltan los botones de prueba');
    const resultados = await Promise.all([tokens.consumir(cancelar, contactoId), tokens.consumir(conservar, contactoId)]);
    expect(resultados.filter(Boolean)).toHaveLength(1);
  });

  it('rechaza los botones alterados y vencidos sin consumir el identificador', async () => {
    const { tokens, usados, reloj } = preparar(tipo);
    const boton = await tokens.emitir(datos);
    if (!boton) throw new Error('Falta el botón de prueba');
    const indice = boton.lastIndexOf('.') + 1;
    const alterno = boton[indice] === 'A' ? 'B' : 'A';
    const alterado = boton.slice(0, indice) + alterno + boton.slice(indice + 1);
    expect(await tokens.consumir(alterado, contactoId)).toBeNull();
    reloj.fijar(new Date(datos.expiraEn));
    expect(await tokens.consumir(boton, contactoId)).toBeNull();
    expect(await usados.usado(datos.jti)).toBe(false);
  });

  it('fuera de demo no emite ni acepta botones', async () => {
    const { tokens, usados } = preparar(tipo, undefined, false);
    expect(await tokens.emitir(datos)).toBeNull();
    expect(await tokens.consumir('boton', contactoId)).toBeNull();
    expect(await usados.usado(datos.jti)).toBe(false);
  });
});

it.each(['Memoria', 'Jose'])('verifica el uso y contacto de un botón de oferta en %s antes de consumirlo', async tipo => {
  const { tokens } = preparar(tipo);
  const oferta: DatosBotonWa = { uso: 'OFERTA', accion: 'ACEPTAR', contactoId,
    ofertaId: datos.tramiteId, jti: datos.jti, expiraEn: datos.expiraEn };
  const token = await tokens.emitir(oferta);
  if (!token) throw new Error('Falta el botón de oferta');
  expect(await tokens.consumir(token, contactoId, 'APROBACION')).toBeNull();
  expect(await tokens.consumir(token, otroContactoId, 'OFERTA')).toBeNull();
  expect(await tokens.consumir(token, contactoId, 'OFERTA')).toEqual(oferta);
});
