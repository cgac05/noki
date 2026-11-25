import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { GeneradorIdSecuencial } from '../../packages/adapters/memory/src/index.ts';

const url = process.env['TEST_DATABASE_URL'];
if (!url || new URL(url).pathname !== '/noki_test') throw new Error('Ejecuta pnpm test:integracion: se requiere la base aislada noki_test.');
const pool = new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 1000 });
const ids = new GeneradorIdSecuencial();
const sede = ids.nuevo(); const servicio = ids.nuevo(); const recurso = ids.nuevo();
const contacto = ids.nuevo(); const hilo = ids.nuevo(); const tramite = ids.nuevo();

beforeAll(async () => {
  await migrar(url);
  await pool.query("INSERT INTO sede (id, nombre, ciudad, lat, lng, zona_horaria, horario) VALUES ($1, 'Sede de prueba', 'Ciudad de prueba', 0, 0, 'America/Mazatlan', '{}')", [sede]);
  await pool.query("INSERT INTO servicio (id, codigo, nombre, categoria, sinonimos, perfil) VALUES ($1, 'PRUEBA', 'Servicio de prueba', 'ESTUDIO', '{}', '{}')", [servicio]);
  await pool.query("INSERT INTO recurso (id, sede_id, tipo, servicios_compatibles) VALUES ($1, $2, 'SALA', ARRAY[$3]::uuid[])", [recurso, sede, servicio]);
  await pool.query("INSERT INTO contacto_canal (id, canal, valor_externo) VALUES ($1, 'web', 'contacto-prueba')", [contacto]);
  await pool.query("INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal) VALUES ($1, $2, 'web')", [hilo, contacto]);
  await pool.query("INSERT INTO tramite (id, hilo_id, tipo, estado, ultimo_canal) VALUES ($1, $2, 'AGENDAR', 'BORRADOR', 'web')", [tramite, hilo]);
});
afterAll(async () => { await pool.end(); });

describe('migración real e integridad del núcleo', () => {
  it('crea todas las tablas del núcleo y ninguna tabla excluida; tipo es obligatorio', async () => {
    const tablas = await pool.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const nombres = tablas.rows.map(t => t.tablename);
    for (const tabla of ['paciente', 'contacto_canal', 'vinculo', 'credencial', 'usuario_interno', 'hilo_atencion', 'tramite', 'evento', 'servicio', 'sede', 'oferta_sede', 'recurso', 'reserva', 'localidad', 'outbox', 'evento_procesado', 'token_usado', 'hueco', 'oferta_hueco', 'interes_adelanto']) expect(nombres).toContain(tabla);
    for (const tabla of ['recordatorio', 'preferencias_contacto', 'factura', 'perfil_fiscal']) expect(nombres).not.toContain(tabla);
    await expect(pool.query("INSERT INTO tramite (id, hilo_id, estado, ultimo_canal) VALUES ($1, $2, 'BORRADOR', 'web')", [ids.nuevo(), hilo])).rejects.toMatchObject({ code: '23502', column: 'tipo' });
  });

  it('repite la migración sin aplicar nada nuevo', async () => {
    expect(await migrar(url)).toEqual([]);
  });

  const reservar = (inicio: string, estado: string) => pool.query('INSERT INTO reserva (id, sede_id, recurso_id, inicio, tramite_id, estado) VALUES ($1, $2, $3, $4, $5, $6)', [ids.nuevo(), sede, recurso, inicio, tramite, estado]);
  it('rechaza dos reservas activas para el mismo horario', async () => {
    const inicio = '2026-12-01T15:00:00Z';
    await reservar(inicio, 'APARTADA');
    await expect(reservar(inicio, 'CONFIRMADA')).rejects.toMatchObject({ code: '23505' });
  });

  it('permite reservar tras una cancelación o expiración', async () => {
    for (const [inicio, estado] of [['2026-12-02T15:00:00Z', 'CANCELADA'], ['2026-12-03T15:00:00Z', 'EXPIRADA']] as const) {
      await reservar(inicio, estado);
      await expect(reservar(inicio, 'APARTADA')).resolves.toMatchObject({ rowCount: 1 });
    }
  });

  it('permite exactamente un éxito en 50 reservas concurrentes', async () => {
    const resultados = await Promise.allSettled(Array.from({ length: 50 }, () => reservar('2026-12-04T15:00:00Z', 'APARTADA')));
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rechazadas = resultados.filter(r => r.status === 'rejected');
    expect(rechazadas).toHaveLength(49);
    for (const resultado of rechazadas) expect(resultado.reason).toMatchObject({ code: '23505' });
  });

  it('impide duplicar eventos por idempotency_key', async () => {
    const clave = ids.nuevo();
    const insertar = () => pool.query("INSERT INTO evento (id, tramite_id, hilo_id, tipo, payload, canal, actor, nivel_auth, version, correlation_id, idempotency_key, ts) VALUES ($1,$2,$3,'TramiteIniciado','{}','web','paciente',0,1,$4,$5,'2026-01-01T00:00:00Z')", [ids.nuevo(), tramite, hilo, ids.nuevo(), clave]);
    await insertar();
    await expect(insertar()).rejects.toMatchObject({ code: '23505' });
  });

  it('registra idempotencia por consumidor y tokens de un solo uso', async () => {
    const clave = ids.nuevo();
    const insertar = (consumidor: string) => pool.query('INSERT INTO evento_procesado (consumidor, idempotency_key) VALUES ($1,$2)', [consumidor, clave]);
    await insertar('proyecciones');
    await expect(insertar('proyecciones')).rejects.toMatchObject({ code: '23505' });
    await expect(insertar('notificador')).resolves.toMatchObject({ rowCount: 1 });
    const token = () => pool.query("INSERT INTO token_usado (jti, expira_en) VALUES ($1,'2026-12-01T00:00:00Z')", [clave]);
    await token();
    await expect(token()).rejects.toMatchObject({ code: '23505' });
  });

  it('crea pg_trgm y los índices de nombre, sinónimos y outbox pendiente', async () => {
    const extension = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'");
    expect(extension.rowCount).toBe(1);
    const indices = await pool.query<{ indexdef: string }>("SELECT indexdef FROM pg_indexes WHERE tablename = 'servicio'");
    expect(indices.rows.filter(i => i.indexdef.includes('gin_trgm_ops'))).toHaveLength(2);
    const outbox = await pool.query<{ indexdef: string }>("SELECT indexdef FROM pg_indexes WHERE tablename = 'outbox'");
    expect(outbox.rows.some(i => i.indexdef.includes('publicado_en IS NULL'))).toBe(true);
  });
});
