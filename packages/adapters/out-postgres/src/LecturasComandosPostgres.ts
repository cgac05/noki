import { sql, type Kysely } from 'kysely';
import type { AlertaSeguridadLeida, DatosEmisionToken, CitaLeida, LlegadaLeida, ContextoDemoLeido, EventoLeido, FichaLeida, LecturasPort, MetricasLeidas, OfertaLeida, TramiteRepo } from '@noki/application';
import { ESTADOS_TRAMITE, normalizarTelefono, type Canal, type EstadoTramite, type HiloId, type PacienteId, type SedeId, type Tramite, type TramiteId } from '@noki/domain';

export class LecturasComandosPostgres implements LecturasPort {
  constructor(private readonly db: Kysely<unknown>, private readonly tramites: TramiteRepo) {}

  tramite(id: TramiteId) {
    return this.tramites.obtener(id);
  }

  async contactoPorHilo(id: HiloId): Promise<string | null> {
    const { rows } = await sql<{ valor: string }>`SELECT c.valor_externo AS valor FROM hilo_atencion h
      JOIN contacto_canal c ON c.id = h.contacto_id WHERE h.id = ${id}`.execute(this.db);
    return rows[0]?.valor ?? null;
  }

  async eventosPorClave(clave: string): Promise<{ id: string; tipo: string; canal: Canal; ts: string }[]> {
    const { rows } = await sql<{ id: string; tipo: string; canal: Canal; ts: Date }>`
      SELECT id, tipo, canal, ts FROM evento
      WHERE idempotency_key = ${clave} OR left(idempotency_key, length(${clave}::text) + 1) = ${clave + ':'}
      ORDER BY ts, id`.execute(this.db);
    return rows.map(({ ts, ...evento }) => ({ ...evento, ts: ts.toISOString() }));
  }

  async lineaTiempo(id: HiloId): Promise<EventoLeido[] | null> {
    if (await this.contactoPorHilo(id) === null) return null;
    const { rows } = await sql<Omit<EventoLeido, 'ts'> & { ts: Date }>`
      SELECT id, tipo, canal, ts FROM evento WHERE hilo_id = ${id} ORDER BY ts, id`.execute(this.db);
    return rows.map(({ ts, ...evento }) => ({ ...evento, ts: ts.toISOString() }));
  }

  tramitesAbiertos(id: PacienteId): Promise<Tramite[]> {
    return this.tramites.abiertosPorPaciente(id);
  }

  async catalogo(): Promise<OfertaLeida[]> {
    const { rows } = await sql<OfertaLeida>`
      SELECT s.id AS "servicioId", s.nombre AS servicio, d.id AS "sedeId", d.nombre AS sede,
        o.precio_centavos AS "precioCentavos"
      FROM oferta_sede o JOIN servicio s ON s.id = o.servicio_id JOIN sede d ON d.id = o.sede_id
      WHERE o.disponible ORDER BY s.nombre, d.nombre, s.id, d.id`.execute(this.db);
    return rows;
  }

  async zonaSede(id: SedeId): Promise<string | null> {
    const { rows } = await sql<{ zona: string }>`SELECT zona_horaria AS zona FROM sede WHERE id = ${id}`.execute(this.db);
    return rows[0]?.zona ?? null;
  }

  async fichaHilo(id: HiloId): Promise<FichaLeida | null> {
    const contacto = await this.contactoPorHilo(id);
    if (contacto === null) return null;
    const { rows } = await sql<{ id: TramiteId; nombre: string | null; abierto: boolean }>`
      SELECT t.id, p.nombre, t.estado NOT IN ('ATENDIDA','CANCELADA','NO_ASISTIO','EXPIRADO') AS abierto
      FROM tramite t LEFT JOIN paciente p ON p.id = t.paciente_id
      WHERE t.hilo_id = ${id} ORDER BY t.ultima_actividad DESC, t.id DESC`.execute(this.db);
    const tramites = (await Promise.all(rows.map(fila => this.tramite(fila.id))))
      .filter((tramite): tramite is Tramite => tramite !== null);
    const ultimo = rows.find(({ abierto }) => abierto);
    const cotizado = tramites.find(tramite => tramite.id === ultimo?.id);
    const oferta = cotizado?.precioCentavos === undefined ? null : (await this.catalogo()).find(
      item => item.servicioId === cotizado.servicioId && item.sedeId === cotizado.sedeId,
    );
    const { rows: [cambio] } = await sql<{ solo: boolean }>`
      SELECT e.payload->>'de' = 'callcenter' AND e.payload->>'a' <> 'callcenter'
        AND h.ultimo_canal <> 'callcenter' AS solo
      FROM evento e JOIN hilo_atencion h ON h.id = e.hilo_id
      WHERE e.hilo_id = ${id} AND e.tipo = 'CanalCambiado' ORDER BY e.ts DESC, e.id DESC LIMIT 1`.execute(this.db);
    const telefono = /^\+?[0-9 ()-]+$/u.test(contacto) ? normalizarTelefono(contacto) : undefined;
    return {
      hiloId: id, tramites, lineaTiempo: await this.lineaTiempo(id) ?? [],
      nombrePila: ultimo?.nombre?.trim().split(/\s+/u)[0] || null,
      telefonoEnmascarado: telefono ? '•••• ' + telefono.slice(-4) : null,
      soloLectura: cambio?.solo ?? false,
      oferta: oferta && cotizado?.precioCentavos !== undefined ? { ...oferta, precioCentavos: cotizado.precioCentavos } : null,
    };
  }

  citasPaciente(id: PacienteId): Promise<CitaLeida[]> {
    return this.leerCitas(sql`t.paciente_id = ${id} AND t.estado IN ('CONFIRMADA','EN_CLINICA','ATENDIDA')`, false);
  }

  async llegadasSede(id: SedeId, ts: string): Promise<LlegadaLeida[]> {
    const [citas, fila] = await Promise.all([
      this.leerCitas(sql`t.sede_id = ${id} AND t.estado IN ('CONFIRMADA','EN_CLINICA')
        AND r.inicio >= date_trunc('day', ${ts}::timestamptz AT TIME ZONE d.zona_horaria) AT TIME ZONE d.zona_horaria`, true),
      this.tramites.filaSede(id, ts),
    ]);
    const posiciones = new Map(fila.map((tramiteId, indice) => [tramiteId, indice + 1]));
    return citas.map(cita => {
      const posicion = posiciones.get(cita.tramite.id);
      return cita.tramite.estado === 'EN_CLINICA' && posicion !== undefined ? { ...cita, posicion } : cita;
    });
  }

  async alertasSeguridad(): Promise<AlertaSeguridadLeida[]> {
    const { rows } = await sql<Pick<AlertaSeguridadLeida, 'id' | 'canal' | 'hiloId' | 'intentos'> & { ts: Date }>`
      SELECT id, canal, ts, hilo_id AS "hiloId", (payload->>'intentos')::int AS intentos
      FROM evento WHERE tipo = 'IntentoVerificacionFallido'
      ORDER BY ts DESC, id DESC LIMIT 50
    `.execute(this.db);
    return rows.map(({ ts, ...alerta }) => ({
      ...alerta, ts: ts.toISOString(), tipo: 'INTENTO_VERIFICACION_FALLIDO', bloqueado: alerta.intentos >= 3,
    }));
  }

  private async leerCitas(filtro: ReturnType<typeof sql>, limitar: boolean): Promise<CitaLeida[]> {
    const { rows } = await sql<{ id: TramiteId; servicio: string; sede: string; zonaHoraria: string; inicio: Date }>`
      SELECT t.id, s.nombre AS servicio, d.nombre AS sede, d.zona_horaria AS "zonaHoraria", r.inicio
      FROM tramite t JOIN servicio s ON s.id = t.servicio_id JOIN sede d ON d.id = t.sede_id
      JOIN reserva r ON r.tramite_id = t.id AND r.estado = 'CONFIRMADA'
      WHERE ${filtro} ORDER BY r.inicio, t.id ${limitar ? sql`LIMIT 50` : sql``}`.execute(this.db);
    const citas = await Promise.all(rows.map(async ({ id, inicio, ...cita }) => {
      const tramite = await this.tramite(id);
      return tramite ? { ...cita, inicio: inicio.toISOString(), tramite } : null;
    }));
    return citas.filter((cita): cita is CitaLeida => cita !== null);
  }

  async metricas(): Promise<MetricasLeidas> {
    const { rows: conteos } = await sql<{ estado: EstadoTramite; cantidad: number }>`
      SELECT estado, count(*)::int AS cantidad FROM tramite GROUP BY estado`.execute(this.db);
    const { rows: [kpis] } = await sql<Record<string, number>>`
      WITH totales AS (
        SELECT count(*) FILTER (WHERE tipo = 'CanalCambiado')::int AS cambios,
          count(DISTINCT hilo_id)::int AS hilos,
          count(*) FILTER (WHERE tipo = 'CitaConfirmada')::int AS citas,
          count(*) FILTER (WHERE tipo = 'PacienteLlego')::int AS llegadas,
          count(*) FILTER (WHERE tipo = 'IntentoVerificacionFallido')::int AS intentos
        FROM evento
      ), selecciones AS (
        SELECT payload, lag(payload) OVER (PARTITION BY tramite_id, tipo ORDER BY ts, id) AS anterior
        FROM evento WHERE tipo IN ('ServicioSeleccionado','SedeSeleccionada','PacienteAsignado')
      )
      SELECT cambios AS "cambiosCanal", coalesce(round(cambios::numeric / nullif(hilos, 0), 2), 0)::float8 AS "cambiosCanalPorHilo",
        (SELECT count(*)::int FROM tramite t WHERE EXISTS (SELECT 1 FROM evento c WHERE c.tramite_id = t.id AND c.tipo = 'CitaConfirmada')
          AND EXISTS (SELECT 1 FROM evento e WHERE e.tramite_id = t.id AND e.tipo = 'CanalCambiado')) AS "tramitesRecuperados",
        citas AS "citasConfirmadas", llegadas AS "llegadasRegistradas",
        (SELECT count(*)::int FROM selecciones WHERE payload = anterior) AS "datosRepetidos",
        intentos AS "intentosVerificacionFallidos" FROM totales`.execute(this.db);
    return {
      porEstado: ESTADOS_TRAMITE.map(estado => ({ estado, cantidad: conteos.find(fila => fila.estado === estado)?.cantidad ?? 0 })),
      kpis: kpis ?? {},
    };
  }

  async contextoDemo(): Promise<ContextoDemoLeido> {
    const { rows } = await sql<ContextoDemoLeido>`
      SELECT t.hilo_id AS "hiloId", t.paciente_id AS "pacienteId", t.sede_id AS "sedeId"
      FROM tramite t JOIN evento e ON e.tramite_id = t.id AND e.tipo = 'CitaConfirmada'
      WHERE t.estado IN ('CONFIRMADA','EN_CLINICA','ATENDIDA')
      ORDER BY e.ts DESC, e.id DESC LIMIT 1`.execute(this.db);
    return rows[0] ?? { hiloId: null, pacienteId: null, sedeId: null };
  }

  async datosContinuacion(hiloId: HiloId, ts: string): Promise<DatosEmisionToken | null> {
    const { rows } = await sql<{
      jti: string; id: TramiteId; paciente: PacienteId | null; expira: Date; nivel: DatosEmisionToken['nivel'];
    }>`SELECT te.jti, t.id, t.paciente_id AS paciente, te.expira_en AS expira, e.nivel_auth AS nivel
      FROM token_emitido te JOIN tramite t ON t.id = te.tramite_id
      JOIN evento e ON e.tramite_id = t.id AND e.tipo = 'ConsentimientoContactoWA'
        AND e.payload->>'consentimientoId' = te.jti::text
      LEFT JOIN token_usado tu ON tu.jti = te.jti
      WHERE t.hilo_id = ${hiloId} AND te.uso = 'CONTINUIDAD' AND te.expira_en > ${ts}::timestamptz
        AND tu.jti IS NULL AND t.estado NOT IN ('ATENDIDA','CANCELADA','NO_ASISTIO','EXPIRADO')
      ORDER BY te.expira_en DESC, te.jti DESC LIMIT 1`.execute(this.db);
    const fila = rows[0];
    return fila ? {
      jti: fila.jti, tramiteId: fila.id, hiloId, nivel: fila.nivel, uso: 'CONTINUIDAD',
      canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
      ...(fila.paciente ? { pacienteId: fila.paciente } : {}),
      emitidoEn: new Date(fila.expira.getTime() - 86_400_000).toISOString(), expiraEn: fila.expira.toISOString(),
    } : null;
  }

  async horariosOcupados(id: SedeId, fecha: string, ts: string): Promise<string[]> {
    const { rows } = await sql<{ inicio: Date }>`
      SELECT DISTINCT r.inicio FROM reserva r JOIN sede s ON s.id = r.sede_id
      WHERE r.sede_id = ${id} AND (r.inicio AT TIME ZONE s.zona_horaria)::date = ${fecha}::date
        AND (r.estado = 'CONFIRMADA' OR (r.estado = 'APARTADA' AND r.expira_en > ${ts}::timestamptz))
      ORDER BY r.inicio`.execute(this.db);
    return rows.map(({ inicio }) => inicio.toISOString());
  }
}
