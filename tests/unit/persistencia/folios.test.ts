import { expect, it, vi } from 'vitest';
import { ResolvedorContinuidad } from '../../../packages/application/src/index.ts';
import { ContactosMemoria, EventosSinTramiteMemoria, PacientesMemoria, RegistroIntentosMemoria, TramiteRepoMemoria, VerificadorTokensMemoria } from '../../../packages/adapters/memory/src/index.ts';
import type { HiloId } from '../../../packages/domain/src/index.ts';

it('responde igual para folios sin fecha sin consultar y cuenta el folio inexistente con fecha', async () => {
  const repo = new TramiteRepoMemoria();
  const consulta = vi.spyOn(repo, 'porFolio');
  const eventos = new EventosSinTramiteMemoria();
  const intentos = new RegistroIntentosMemoria();
  const resolvedor = new ResolvedorContinuidad(repo, new ContactosMemoria(), new VerificadorTokensMemoria(), new PacientesMemoria(), intentos, eventos);
  const contacto = { id: 'ficticio', hiloId: 'hilo' as HiloId, canal: 'whatsapp', valor: 'ficticio' } as const;
  const contexto = {
    actor: 'paciente', canal: 'whatsapp', nivelAuth: 0, correlationId: 'prueba',
    idempotencyKey: 'prueba', ts: '2026-11-24T12:00:00Z',
  } as const;
  for (const folio of ['12345678', '23456789']) {
    expect(await resolvedor.resolver({ valorContacto: contacto.valor, folio }, contacto, contexto)).toEqual({
      tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC',
    });
  }
  expect(consulta).not.toHaveBeenCalled();
  expect(eventos.eventos()).toEqual([]);
  expect(await resolvedor.resolver({ valorContacto: contacto.valor, folio: '23456789', fechaNac: '2000-01-01' }, contacto, contexto))
    .toEqual({ tipo: 'SIN_RESULTADO' });
  expect(eventos.eventos()).toMatchObject([{
    tipo: 'IntentoVerificacionFallido', tramiteId: null, version: 0, hiloId: contacto.hiloId,
    payload: { metodo: 'FOLIO_FECHA_NAC', intentos: 1 },
  }]);
  expect(JSON.stringify(eventos.eventos())).not.toMatch(/2000-01-01|23456789/);
});
