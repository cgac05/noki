import { expect, it } from 'vitest';
import { AgendaMemoria, GeneradorIdSecuencial, ProgramadorMemoria, RelojFalso, TramiteRepoMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { RelojDemo, TemporizadoresTramite } from '../../../packages/application/src/index.ts';
import { crearRegistroTiposTramite, Tramite, type ContextoOperacion, type HiloId, type TramiteId } from '../../../packages/domain/src/index.ts';

it('conserva el plazo tras un comando sin efectos y expira con contexto del sistema', async () => {
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const ids = new GeneradorIdSecuencial();
  const registro = crearRegistroTiposTramite();
  const tramites = new TramiteRepoMemoria();
  const agenda = new AgendaMemoria();
  const programador = new ProgramadorMemoria();
  const temporizadores = new TemporizadoresTramite({ reloj, ids, registro, tramites, agenda, programador });
  const contexto = (): ContextoOperacion => ({
    actor: 'asesor:prueba', canal: 'callcenter', nivelAuth: 1, ts: reloj.ahora().toISOString(),
    correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
  });
  const tramite = Tramite.iniciar(ids.nuevo() as TramiteId, ids.nuevo() as HiloId, 'AGENDAR', registro, contexto());
  tramite.cumplirRequisito('ORDEN_MEDICA', contexto());
  await tramites.guardar(tramite);
  await temporizadores.reconciliar(tramite.id);
  const original = programador.vencidos('2026-11-25T12:00:00Z')[0]!;
  expect(original?.tipo).toBe('INACTIVIDAD');
  reloj.adelantar(23 * 3_600_000);
  tramite.cumplirRequisito('ORDEN_MEDICA', contexto());
  expect(tramite.eventosPendientes()).toEqual([]);
  await tramites.guardar(tramite);
  await temporizadores.reconciliar(tramite.id);
  expect(programador.vencidos(original.venceEn)).toEqual([original]);
  expect(await temporizadores.ejecutar(original)).toEqual({ tipo: 'REPROGRAMAR', venceEn: original.venceEn });
  await new RelojDemo(reloj, programador).adelantar(60);
  expect(await temporizadores.ejecutar(original)).toEqual({ tipo: 'APLICADO' });
  expect(await temporizadores.ejecutar(original)).toEqual({ tipo: 'SIN_EFECTO' });
  expect((await tramites.obtener(tramite.id))?.estado).toBe('EXPIRADO');
  expect(tramites.eventos().at(-1)).toMatchObject({
    tipo: 'TramiteExpirado', actor: 'sistema', nivelAuth: 0, canal: 'callcenter', payload: { motivo: 'INACTIVIDAD' },
  });
  await temporizadores.reconciliar(tramite.id);
  expect(programador.vencidos('2026-11-28T12:00:00Z')).toEqual([]);
  expect(await temporizadores.ejecutar({ ...original, tramiteId: ids.nuevo() as TramiteId }))
    .toEqual({ tipo: 'SIN_EFECTO' });
});
