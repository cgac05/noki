import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { verify } from 'argon2';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { reiniciarDemo } from '../../apps/api/src/semilla/reiniciarDemo.ts';

import { curpBase, validarCurp } from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
if (!['/noki_test', '/noki_identidad_test'].includes(new URL(url).pathname)) throw new Error('La semilla requiere una base de pruebas.');
const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1000 });
beforeAll(async () => { await migrar(url); await sembrar(url); });
afterAll(async () => { await pool.end(); });

async function contar(): Promise<number[]> {
  const cantidades: number[] = [];
  for (const tabla of ['sede', 'servicio', 'oferta_sede', 'recurso', 'paciente', 'contacto_canal', 'vinculo', 'credencial', 'usuario_interno', 'localidad']) {
    const resultado = await pool.query<{ total: string }>('SELECT count(*) AS total FROM ' + tabla);
    cantidades.push(Number(resultado.rows[0]?.total));
  }
  return cantidades;
}
describe('semilla y reinicio de demo sobre Postgres', () => {
  it('incluye las sedes, servicios con perfil, Xalisco y contactos de demo', async () => {
    const sedes = await pool.query<{ zona_horaria: string; ciudad: string }>("SELECT zona_horaria, ciudad FROM sede WHERE ciudad IN ('Tepic','Bahía de Banderas','Tijuana')");
    expect(sedes.rowCount).toBe(3);
    expect(new Set(sedes.rows.map(s => s.zona_horaria)).size).toBe(3);
    for (const zona of ['America/Mazatlan', 'America/Bahia_Banderas', 'America/Tijuana']) expect(sedes.rows.map(s => s.zona_horaria)).toContain(zona);
    const servicios = await pool.query<{ codigo: string; perfil: { requisitos: unknown[]; duracionMin: number }; sinonimos: string[] }>("SELECT codigo, perfil, sinonimos FROM servicio WHERE codigo IN ('QS','US_ABDOMINAL','NUTRICION','PAQUETE_MAMARIO_PAP')");
    expect(servicios.rowCount).toBe(4);
    for (const servicio of servicios.rows) { expect(servicio.perfil.requisitos.length).toBeGreaterThan(0); expect(servicio.perfil.duracionMin).toBeGreaterThan(0); expect(servicio.sinonimos.length).toBeGreaterThan(0); }
    const oferta = await pool.query("SELECT 1 FROM oferta_sede o JOIN sede s ON s.id = o.sede_id WHERE s.ciudad = 'Tepic'");
    expect(oferta.rowCount).toBe(4);
    const localidad = await pool.query<{ ciudad: string }>("SELECT s.ciudad FROM localidad l CROSS JOIN sede s WHERE l.nombre_normalizado = 'xalisco' ORDER BY (s.lat-l.lat)^2 + (s.lng-l.lng)^2 LIMIT 1");
    expect(localidad.rows[0]?.ciudad).toBe('Tepic');
    const contactos = await pool.query<{ valor_externo: string }>("SELECT c.valor_externo FROM contacto_canal c JOIN vinculo v ON v.contacto_id = c.id WHERE c.canal = 'whatsapp' ORDER BY c.valor_externo");
    expect(contactos.rows.map(c => c.valor_externo)).toEqual(['5210000000001','5210000000002']);
    const usuarios = await pool.query<{ usuario: string }>('SELECT usuario FROM usuario_interno ORDER BY usuario');
    expect(usuarios.rows.map(u => u.usuario)).toEqual(['admin','asesor1','recepcion.tepic']);
    const pacientes = await pool.query<{
      nombre: string; apellidoPaterno: string; apellidoMaterno: string;
      fechaNac: string; sexo: 'F' | 'M'; curp: string; base: string; entidadNacimiento: 'NT';
    }>(`SELECT nombre, ap_paterno AS "apellidoPaterno", ap_materno AS "apellidoMaterno",
      fecha_nac::text AS "fechaNac", sexo, curp, curp_base AS base, entidad_nac AS "entidadNacimiento"
      FROM paciente ORDER BY nombre`);
    expect(pacientes.rows.map(({ nombre }) => nombre)).toEqual(['Ana', 'Beto']);
    for (const p of pacientes.rows) {
      expect(p).toMatchObject({ apellidoPaterno: 'Paciente', apellidoMaterno: 'Demo', entidadNacimiento: 'NT' });
      expect(validarCurp(p.curp)).toEqual({ fechaNac: p.fechaNac, sexo: p.sexo, entidadNacimiento: 'NT' });
      expect(p.base).toBe(curpBase(p));
      expect(p.curp.slice(0, 16)).toBe(p.base);
    }
  });
  it('es idempotente y guarda solo hashes argon2id verificables', async () => {
    const antes = await contar();
    await sembrar(url);
    expect(await contar()).toEqual(antes);
    const credenciales = await pool.query<{ hash: string }>('SELECT hash FROM credencial');
    expect(credenciales.rowCount).toBe(2);
    for (const c of credenciales.rows) { expect(c.hash).toMatch(/^\$argon2id\$/); expect(c.hash).not.toBe('1234'); expect(await verify(c.hash, '1234')).toBe(true); }
    const usuarios = await pool.query<{ hash: string }>('SELECT hash FROM usuario_interno');
    for (const u of usuarios.rows) { expect(u.hash).toMatch(/^\$argon2id\$/); expect(u.hash).not.toBe('demo123'); expect(await verify(u.hash, 'demo123')).toBe(true); }
  });
  it('encuentra Química sanguínea por un sinónimo con errores de escritura', async () => {
    const resultado = await pool.query<{ codigo: string }>("SELECT codigo FROM servicio ORDER BY similarity(noki_texto_sinonimos(sinonimos), $1) DESC LIMIT 1", ['quimica sangina']);
    expect(resultado.rows[0]?.codigo).toBe('QS');
  });
  it('rechaza reinicio sin DEMO_MODE=true sin modificar datos', async () => {
    const antes = await contar();
    for (const modo of [undefined, 'false', 'TRUE']) await expect(reiniciarDemo(url, modo)).rejects.toThrow('DEMO_MODE=true');
    expect(await contar()).toEqual(antes);
  });
  it('reinicia la base de demo, migra y deja exactamente los datos semilla', async () => {
    await pool.query("INSERT INTO localidad VALUES ('extra-prueba','Demo','Demo',0,0)");
    await reiniciarDemo(url, 'true');
    expect(await contar()).toEqual([3,4,12,12,2,2,2,2,3,1]);
    const extra = await pool.query("SELECT 1 FROM localidad WHERE nombre_normalizado = 'extra-prueba'");
    expect(extra.rowCount).toBe(0);
  });
});
