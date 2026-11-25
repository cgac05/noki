import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { argon2id, hash } from 'argon2';
import { idDemo, PACIENTES_DEMO, SEDES_DEMO, SERVICIOS_DEMO, USUARIOS_DEMO } from './datosDemo.ts';

import { sembrarCitasHuecos } from './sembrarCitasHuecos.ts';

export async function sembrar(connectionString: string, ahora = new Date()): Promise<void> {
  const db = new Kysely<unknown>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString, connectionTimeoutMillis: 1000 }) }) });
  try {
    await db.transaction().execute(async tx => {
      for (const sede of SEDES_DEMO) {
        await sql`INSERT INTO sede (id,nombre,ciudad,lat,lng,zona_horaria,horario)
          VALUES (${sede.id},${sede.nombre},${sede.ciudad},${sede.lat},${sede.lng},${sede.zonaHoraria},${JSON.stringify({ apertura: '07:00', cierre: '17:00' })}::jsonb)
          ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre,ciudad=EXCLUDED.ciudad,lat=EXCLUDED.lat,lng=EXCLUDED.lng,zona_horaria=EXCLUDED.zona_horaria,horario=EXCLUDED.horario`.execute(tx);
      }
      for (const servicio of SERVICIOS_DEMO) {
        await sql`INSERT INTO servicio (id,codigo,nombre,categoria,sinonimos,perfil)
          VALUES (${servicio.id},${servicio.codigo},${servicio.nombre},${servicio.perfil.tipo},${servicio.sinonimos},${JSON.stringify(servicio.perfil)}::jsonb)
          ON CONFLICT (id) DO UPDATE SET codigo=EXCLUDED.codigo,nombre=EXCLUDED.nombre,categoria=EXCLUDED.categoria,sinonimos=EXCLUDED.sinonimos,perfil=EXCLUDED.perfil`.execute(tx);
      }
      for (const [i,sede] of SEDES_DEMO.entries()) {
        for (const [j,servicio] of SERVICIOS_DEMO.entries()) {
          await sql`INSERT INTO oferta_sede (sede_id,servicio_id,precio_centavos,disponible,modo_agenda)
            VALUES (${sede.id},${servicio.id},${servicio.precioCentavos},true,${servicio.perfil.modoAgenda})
            ON CONFLICT (sede_id,servicio_id) DO UPDATE SET precio_centavos=EXCLUDED.precio_centavos,disponible=EXCLUDED.disponible,modo_agenda=EXCLUDED.modo_agenda`.execute(tx);
          await sql`INSERT INTO recurso (id,sede_id,tipo,servicios_compatibles)
            VALUES (${idDemo(1000+i*10+j)},${sede.id},${servicio.perfil.requiereProfesional ? 'PROFESIONAL' : 'SALA'},${[servicio.id]})
            ON CONFLICT (id) DO UPDATE SET sede_id=EXCLUDED.sede_id,tipo=EXCLUDED.tipo,servicios_compatibles=EXCLUDED.servicios_compatibles`.execute(tx);
        }
      }
      await sql`INSERT INTO localidad (nombre_normalizado,municipio,estado,lat,lng)
        VALUES ('xalisco','Xalisco','Nayarit',21.447,-104.900)
        ON CONFLICT (nombre_normalizado) DO UPDATE SET municipio=EXCLUDED.municipio,estado=EXCLUDED.estado,lat=EXCLUDED.lat,lng=EXCLUDED.lng`.execute(tx);
      const { rows: columnasIdentidad } = await sql<{ disponible: boolean }>`
        SELECT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'paciente'::regclass
          AND attname = 'curp_base' AND NOT attisdropped) AS disponible
      `.execute(tx);
      const identidadDisponible = columnasIdentidad[0]?.disponible === true;
      for (const paciente of PACIENTES_DEMO) {
        await sql`INSERT INTO paciente (id,nombre,ap_paterno,ap_materno,fecha_nac,sexo,curp,nivel_identidad)
          VALUES (${paciente.id},${paciente.nombre},'Paciente','Demo',${paciente.fechaNac},${paciente.sexo},NULL,0)
          ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre,ap_paterno=EXCLUDED.ap_paterno,ap_materno=EXCLUDED.ap_materno,fecha_nac=EXCLUDED.fecha_nac,sexo=EXCLUDED.sexo,curp=EXCLUDED.curp`.execute(tx);
        if (identidadDisponible) {
          await sql`UPDATE paciente SET curp = ${paciente.curp}, entidad_nac = ${paciente.entidadNacimiento},
            curp_base = ${paciente.curp.slice(0, 16)} WHERE id = ${paciente.id}`.execute(tx);
        }
        await sql`INSERT INTO contacto_canal (id,canal,valor_externo) VALUES (${paciente.contactoId},'whatsapp',${paciente.wa})
          ON CONFLICT (id) DO UPDATE SET canal=EXCLUDED.canal,valor_externo=EXCLUDED.valor_externo`.execute(tx);
        await sql`INSERT INTO vinculo (contacto_id,paciente_id,relacion,metodo)
          VALUES (${paciente.contactoId},${paciente.id},'TITULAR','FLOW_DECLARADO')
          ON CONFLICT (contacto_id,paciente_id) DO UPDATE SET relacion=EXCLUDED.relacion,metodo=EXCLUDED.metodo`.execute(tx);
        const hashPin = await hash('1234', { type: argon2id });
        await sql`INSERT INTO credencial (id,paciente_id,tipo,hash) VALUES (${paciente.credencialId},${paciente.id},'PIN',${hashPin})
          ON CONFLICT (paciente_id,tipo) DO UPDATE SET hash=EXCLUDED.hash`.execute(tx);
      }
      const { rows: [tablas] } = await sql<{ huecos: boolean }>`SELECT to_regclass(format('%I.hueco', current_schema())) IS NOT NULL AS huecos`.execute(tx);
      if (tablas?.huecos) await sembrarCitasHuecos(tx, ahora);
      for (const usuario of USUARIOS_DEMO) {
        const hashClave = await hash('demo123', { type: argon2id });
        await sql`INSERT INTO usuario_interno (id,usuario,rol,sede_id,hash)
          VALUES (${usuario.id},${usuario.usuario},${usuario.rol},${usuario.sedeId},${hashClave})
          ON CONFLICT (id) DO UPDATE SET usuario=EXCLUDED.usuario,rol=EXCLUDED.rol,sede_id=EXCLUDED.sede_id,hash=EXCLUDED.hash`.execute(tx);
      }
    });
  } finally { await db.destroy(); }
}
