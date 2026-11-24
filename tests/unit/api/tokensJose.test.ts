import { describe, expect, it } from 'vitest';
import { RegistroTokensUsadosMemoria, RelojFalso } from '../../../packages/adapters/memory/src/index.ts';
import { TokensJose } from '../../../packages/adapters/out-security/src/index.ts';
import type { DatosEmisionToken } from '../../../packages/application/src/index.ts';
import type { HiloId, TramiteId } from '../../../packages/domain/src/index.ts';

const datos = {
  jti: '01937954-6c40-7000-8000-000000000001', uso: 'LLEGADA',
  tramiteId: '01937954-6c40-7000-8000-000000000002' as TramiteId,
  hiloId: '01937954-6c40-7000-8000-000000000003' as HiloId,
  nivel: 1, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
  emitidoEn: '2026-11-24T12:00:00Z', expiraEn: '2026-11-25T12:00:00Z',
} as const satisfies DatosEmisionToken;

function escenario() {
  const usados = new RegistroTokensUsadosMemoria();
  const reloj = new RelojFalso(new Date(datos.emitidoEn));
  const tokens = new TokensJose('secreto-sintetico-de-prueba-con-32-bytes', reloj, usados);
  return { usados, reloj, tokens };
}

describe('tokens firmados', () => {
  it('Uso equivocado conserva el token y dos usos simultáneos tienen un ganador', async () => {
    const { usados, tokens } = escenario();
    const token = await tokens.emitir(datos);
    expect(await tokens.emitir(datos)).toBe(token);
    expect(await tokens.verificar(token, 'CONTINUIDAD')).toBeNull();
    expect(await usados.usado(datos.jti)).toBe(false);
    const lecturas = await Promise.all([tokens.verificar(token, 'LLEGADA'), tokens.verificar(token, 'LLEGADA')]);
    expect(lecturas.filter(Boolean)).toHaveLength(1);
    expect(await usados.usado(datos.jti)).toBe(true);
  });

  it('Token vencido o alterado no consume un jti', async () => {
    const { usados, reloj, tokens } = escenario();
    const token = await tokens.emitir(datos);
    const ultimo = token.lastIndexOf('.') + 1;
    const alterado = token.slice(0, ultimo) + (token.charAt(ultimo) === 'A' ? 'B' : 'A') + token.slice(ultimo + 1);
    expect(await tokens.verificar(alterado, 'LLEGADA')).toBeNull();
    reloj.adelantar(86_400_000);
    expect(await tokens.verificar(token, 'LLEGADA')).toBeNull();
    expect(await usados.usado(datos.jti)).toBe(false);
  });

  it('Contexto reutilizable conserva paciente y nivel sin registrar consumo', async () => {
    const { usados, tokens } = escenario();
    const pacienteId = '01937954-6c40-7000-8000-000000000004' as DatosEmisionToken['pacienteId'];
    if (!pacienteId) throw new Error('Falta el paciente sintético.');
    const token = await tokens.emitir({ ...datos, uso: 'CONTEXTO', pacienteId });
    for (let intento = 0; intento < 2; intento++) {
      expect(await tokens.verificar(token, 'CONTEXTO')).toMatchObject({ pacienteId, nivel: 1 });
    }
    expect(await usados.usado(datos.jti)).toBe(false);
  });

  it('Secreto corto se rechaza antes de usar el emisor', () => {
    expect(() => new TokensJose('corto', new RelojFalso(new Date(datos.emitidoEn)), new RegistroTokensUsadosMemoria()))
      .toThrow('TOKEN_SECRET');
  });
});
