import { sql, type Kysely } from 'kysely';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { idDemo, PACIENTES_DEMO, SEDES_DEMO, SERVICIOS_DEMO } from './datosDemo.ts';

const DIA = 86_400_000;

export async function sembrarCitasHuecos(tx: Kysely<unknown>, ahora: Date): Promise<void> {
  const [sede] = SEDES_DEMO;
  const servicio = SERVICIOS_DEMO.find(s => s.codigo === 'US_ABDOMINAL');
  if (!servicio) throw new Error('Falta el servicio de ultrasonido de la demo.');
  const fechaLocal = formatInTimeZone(ahora, sede.zonaHoraria, 'yyyy-MM-dd');
  const fecha = new Date(fechaLocal + 'T00:00:00Z');
  fecha.setUTCDate(fecha.getUTCDate() + (4 - fecha.getUTCDay() + 7) % 7);
  let jueves = fromZonedTime(fecha.toISOString().slice(0, 10) + 'T09:15:00', sede.zonaHoraria);
  if (jueves.getTime() - ahora.getTime() < 2 * DIA) {
    fecha.setUTCDate(fecha.getUTCDate() + 7);
    jueves = fromZonedTime(fecha.toISOString().slice(0, 10) + 'T09:15:00', sede.zonaHoraria);
  }

  for (const [i, paciente] of PACIENTES_DEMO.entries()) {
    const fechaCita = new Date(fecha);
    fechaCita.setUTCDate(fecha.getUTCDate() + i * 7);
    const inicio = fromZonedTime(fechaCita.toISOString().slice(0, 10) + 'T09:15:00', sede.zonaHoraria).toISOString();
    const hiloId = idDemo(200 + i);
    const tramiteId = idDemo(210 + i);
    const reservaId = idDemo(220 + i);
    const folio = String(90_000_000 + i);
    const ts = ahora.toISOString();
    await sql`INSERT INTO hilo_atencion (id, paciente_id, contacto_id, abierto_en, ultimo_canal)
      VALUES (${hiloId}, ${paciente.id}, ${paciente.contactoId}, ${ts}, 'whatsapp') ON CONFLICT (id) DO NOTHING`.execute(tx);
    await sql`UPDATE contacto_canal SET hilo_id = ${hiloId} WHERE id = ${paciente.contactoId} AND hilo_id IS NULL`.execute(tx);
    await sql`UPDATE vinculo SET ultimo_uso = ${ts}, nivel = GREATEST(nivel, 1)
      WHERE paciente_id = ${paciente.id} AND contacto_id = ${paciente.contactoId}`.execute(tx);
    const instantanea = {
      id: tramiteId, hiloId, tipo: 'AGENDAR', canalOrigen: 'whatsapp',
      datos: { version: 1, ultimaActividad: ts, ultimoCanal: 'whatsapp', fase: 'CONFIRMADA',
        servicioId: servicio.id, sedeId: sede.id, pacienteId: paciente.id, perfil: servicio.perfil,
        requisitos: servicio.perfil.requisitos.map(r => r.tipo), elegibilidad: 'CUMPLIDA',
        cotizacion: { precioCentavos: servicio.precioCentavos, vigenteHasta: inicio },
        horario: { reservaId, inicio, expiraEn: ts }, folio },
    };
    await sql`INSERT INTO tramite (id, hilo_id, paciente_id, servicio_id, sede_id, folio_externo, estado, tipo,
      version, canal_origen, ultimo_canal, ultima_actividad, datos)
      VALUES (${tramiteId}, ${hiloId}, ${paciente.id}, ${servicio.id}, ${sede.id}, ${folio}, 'CONFIRMADA',
        'AGENDAR', 1, 'whatsapp', 'whatsapp', ${ts}, ${JSON.stringify(instantanea)}::jsonb)
      ON CONFLICT (id) DO NOTHING`.execute(tx);
    await sql`INSERT INTO reserva (id, sede_id, recurso_id, inicio, tramite_id, estado, expira_en, folio)
      VALUES (${reservaId}, ${sede.id}, ${idDemo(1001)}, ${inicio}, ${tramiteId}, 'CONFIRMADA', ${ts}, ${folio})
      ON CONFLICT (id) DO NOTHING`.execute(tx);
    if (i === 0) continue;
    const desde = i === 1 ? ts : new Date(jueves.getTime() + DIA).toISOString();
    await sql`INSERT INTO interes_adelanto
      (id, tramite_id, paciente_id, servicio_id, sedes_aceptadas, ventana, estado, registrado_en)
      VALUES (${idDemo(230 + i)}, ${tramiteId}, ${paciente.id}, ${servicio.id}, ${[sede.id]}::uuid[],
        tstzrange(${desde}, ${inicio}, '[)'), 'ACTIVO', ${ts}) ON CONFLICT (id) DO NOTHING`.execute(tx);
  }
}
