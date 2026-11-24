import { expect, it } from 'vitest';
import {
  TramiteRepoMemoria, AgendaExternaMemoria, AgendaMemoria, CatalogoMemoria, RegistroIntentosMemoria,
  VerificadorTokensMemoria, RelojFalso,
} from '../../../packages/adapters/memory/src/index.ts';
import {
  Tramite, crearRegistroTiposTramite,
  type ContextoOperacion, type HiloId, type ReservaId, type SedeId, type ServicioId, type TramiteId,
} from '../../../packages/domain/src/index.ts';

const hiloId = 'hilo' as HiloId;
const tramiteId = 'tramite' as TramiteId;
const servicioId = 'servicio' as ServicioId;
const sedeId = 'sede' as SedeId;
const reservaId = 'reserva' as ReservaId;
const contexto: ContextoOperacion = {
  canal: 'whatsapp', actor: 'paciente', nivelAuth: 0, ts: '2026-11-24T12:00:00Z',
  idempotencyKey: 'iniciar', correlationId: 'demo',
};

it('escritura concurrente conserva el primer cambio y sus eventos', async () => {
  const repo = new TramiteRepoMemoria();
  const inicial = Tramite.iniciar(tramiteId, hiloId, 'AGENDAR', crearRegistroTiposTramite(), contexto);
  await repo.guardar(inicial);
  expect(inicial.eventosPendientes()).toHaveLength(0);
  const primero = await repo.obtener(tramiteId);
  const segundo = await repo.obtener(tramiteId);
  if (!primero || !segundo) throw new Error('Falta el trámite.');
  primero.seleccionarSede(sedeId, null, { ...contexto, idempotencyKey: 'primero' });
  segundo.expirarPorInactividad({ ...contexto, idempotencyKey: 'segundo' });
  await repo.guardar(primero);
  await expect(repo.guardar(segundo)).rejects.toMatchObject({ codigo: 'CONFLICTO_VERSION' });
  expect((await repo.obtener(tramiteId))?.sedeId).toBe(sedeId);
  expect(repo.eventos().map(({ tipo }) => tipo)).toEqual(['TramiteIniciado', 'SedeSeleccionada']);
});

it('consume un token una sola vez aun con dos verificaciones simultáneas', async () => {
  const tokens = new VerificadorTokensMemoria();
  const token = tokens.emitir({ tramiteId, hiloId, nivel: 1, canalOrigen: 'callcenter', metodo: 'TOKEN_CC' });
  const resultados = await Promise.all([tokens.verificar(token), tokens.verificar(token)]);
  expect(resultados.filter(Boolean)).toHaveLength(1);
});

it('devuelve nulo para una oferta inexistente', async () => {
  const catalogo = new CatalogoMemoria();
  expect(await catalogo.oferta(servicioId, sedeId)).toBeNull();
});

it('confirma con un folio de ocho o nueve dígitos', async () => {
  const agenda = new AgendaMemoria();
  await agenda.apartar({ reservaId, tramiteId, servicioId, sedeId, inicio: contexto.ts, ts: contexto.ts, ttlReservaMin: 10 });
  const externa = new AgendaExternaMemoria();
  const folio = await externa.registrarCita({ reservaId, sedeId, servicioId, inicio: contexto.ts });
  expect(folio).toMatch(/^\d{8,9}$/);
  await expect(agenda.confirmar(reservaId, folio, contexto.ts)).resolves.toBeUndefined();
});

it('cuenta los intentos y bloquea durante 15 minutos', async () => {
  const registro = new RegistroIntentosMemoria();
  const reloj = new RelojFalso(new Date(contexto.ts));
  for (let intento = 1; intento <= 3; intento++) {
    expect(await registro.fallar('contacto', reloj.ahora().toISOString())).toMatchObject({ intentos: intento });
  }
  expect(await registro.bloqueo('contacto', reloj.ahora().toISOString())).toBeDefined();
  reloj.adelantar(15 * 60_000);
  expect(await registro.bloqueo('contacto', reloj.ahora().toISOString())).toBeUndefined();
});
