import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ResolvedorContinuidad } from '../../packages/application/src/index.ts';
import { PacientesMemoria, TramiteRepoMemoria, VerificadorTokensMemoria } from '../../packages/adapters/memory/src/index.ts';
import { abrirPostgres, ContactosPostgres, EventosSinTramitePostgres, migrar, particionEvento, RegistroIntentosPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import type { ContextoOperacion, HiloId } from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const pool = new Pool({ connectionString: url });
const db = abrirPostgres(url);
const contactoId = randomUUID();
const hiloId = randomUUID() as HiloId;
const operacion = (): ContextoOperacion => ({
  canal: 'whatsapp', actor: 'paciente', nivelAuth: 0, correlationId: randomUUID(),
  idempotencyKey: randomUUID(), ts: '2026-11-24T12:00:00Z',
});

afterAll(async () => {
  try {
    await pool.query('DELETE FROM outbox WHERE evento_id IN (SELECT id FROM evento WHERE hilo_id = $1)', [hiloId]);
    await pool.query('DELETE FROM evento WHERE hilo_id = $1', [hiloId]);
    await pool.query('DELETE FROM intento_verificacion WHERE contacto_id = $1', [contactoId]);
    await pool.query('UPDATE contacto_canal SET hilo_id = NULL WHERE id = $1', [contactoId]);
    await pool.query('DELETE FROM hilo_atencion WHERE id = $1', [hiloId]);
    await pool.query('DELETE FROM contacto_canal WHERE id = $1', [contactoId]);
  } finally {
    await pool.end();
    await db.destroy();
  }
});

it('cuenta tres fallos concurrentes y guarda los eventos sin trámite con su outbox', async () => {
  await migrar(url);
  const contactos = new ContactosPostgres(db);
  const contacto = await contactos.crear({ id: contactoId, hiloId, canal: 'whatsapp', valor: 'intentos-ficticios' });
  const intentos = new RegistroIntentosPostgres(db);
  const eventos = new EventosSinTramitePostgres(db, { nuevo: randomUUID });
  const resolvedor = new ResolvedorContinuidad(new TramiteRepoMemoria(), contactos,
    new VerificadorTokensMemoria(), new PacientesMemoria(), intentos, eventos);
  const respuestas = await Promise.all(Array.from({ length: 3 }, () =>
    resolvedor.resolver({ valorContacto: contacto.valor, folio: '11112222', fechaNac: '2000-01-01' }, contacto, operacion()),
  ));
  expect(respuestas).toEqual(Array.from({ length: 3 }, () => ({ tipo: 'SIN_RESULTADO' })));
  expect(await intentos.bloqueo(contactoId, operacion().ts)).toBe('2026-11-24T12:15:00.000Z');
  expect(await resolvedor.resolver({ valorContacto: contacto.valor, token: 'token' }, contacto, operacion())).toMatchObject({
    tipo: 'BLOQUEADO',
  });
  const { rows } = await pool.query(`SELECT e.tramite_id, e.tipo, e.payload, o.particion
    FROM evento e JOIN outbox o ON o.evento_id = e.id WHERE e.hilo_id = $1 ORDER BY e.payload->>'intentos'`, [hiloId]);
  expect(rows).toEqual([1, 2, 3].map((intentos) => ({
    tramite_id: null, tipo: 'IntentoVerificacionFallido',
    payload: { intentos, metodo: 'FOLIO_FECHA_NAC' }, particion: particionEvento(undefined, hiloId),
  })));
});
