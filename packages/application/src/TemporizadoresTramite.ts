import { NoEncontrado, type ContextoOperacion, type RegistroTiposTramite, type ReservaId, type Tramite, type TramiteId } from '@noki/domain';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { ProgramadorTemporizadores, Temporizador, TipoTemporizador } from './ports/ProgramadorTemporizadores.ts';
import type { Reloj } from './ports/Reloj.ts';
import type { AgendaPort, TramiteRepo } from './ports/nucleo.ts';

export type ResultadoTemporizador =
  | { tipo: 'APLICADO' }
  | { tipo: 'SIN_EFECTO' }
  | { tipo: 'REPROGRAMAR'; venceEn: string };

interface PuertosTemporizadores {
  reloj: Reloj;
  ids: GeneradorId;
  registro: RegistroTiposTramite;
  tramites: TramiteRepo;
  agenda: AgendaPort;
  programador: ProgramadorTemporizadores;
  registrarError?: (datos: { correlation_id: string; codigo: string }) => void;
}

const tipos: readonly TipoTemporizador[] = ['HOLD', 'INASISTENCIA', 'INACTIVIDAD'];

export class TemporizadoresTramite {
  constructor(private readonly puertos: PuertosTemporizadores) {}

  async reconciliar(tramiteId: TramiteId): Promise<void> {
    const tramite = await this.cargar(tramiteId);
    const ahora = this.puertos.reloj.ahora().toISOString();
    for (const tipo of tipos) {
      const trabajo = tramite && this.trabajo(tipo, tramite);
      if (trabajo) await this.puertos.programador.programar(trabajo, ahora);
      else await this.puertos.programador.cancelar(tipo, tramiteId);
    }
  }

  async ejecutar(trabajo: Temporizador): Promise<ResultadoTemporizador> {
    const tramite = await this.cargar(trabajo.tramiteId);
    if (!tramite) return { tipo: 'SIN_EFECTO' };
    const vigente = this.trabajo(trabajo.tipo, tramite);
    if (!vigente ||
        (trabajo.tipo === 'HOLD' && trabajo.reservaId !== vigente.reservaId) ||
        (trabajo.tipo === 'INACTIVIDAD' && trabajo.version !== vigente.version)) {
      return { tipo: 'SIN_EFECTO' };
    }
    const ahora = this.puertos.reloj.ahora();
    if (ahora.getTime() < Date.parse(vigente.venceEn)) return { tipo: 'REPROGRAMAR', venceEn: vigente.venceEn };
    const contexto: ContextoOperacion = {
      actor: 'sistema', nivelAuth: 0, canal: tramite.ultimoCanal, ts: ahora.toISOString(),
      correlationId: this.puertos.ids.nuevo(), idempotencyKey: this.puertos.ids.nuevo(),
    };
    const reserva = tramite.horario?.reservaId;
    switch (trabajo.tipo) {
      case 'HOLD': tramite.expirarHold(contexto); break;
      case 'INASISTENCIA': tramite.marcarInasistencia(contexto); break;
      case 'INACTIVIDAD': tramite.expirarPorInactividad(contexto); break;
    }
    await this.puertos.tramites.guardar(tramite);
    if (reserva && trabajo.tipo !== 'INASISTENCIA') await this.expirarReserva(reserva, contexto);
    return { tipo: 'APLICADO' };
  }

  private async cargar(id: TramiteId): Promise<Tramite | null> {
    try { return await this.puertos.tramites.obtener(id); }
    catch (error) {
      if (error instanceof NoEncontrado) return null;
      throw error;
    }
  }

  private trabajo(tipo: TipoTemporizador, tramite: Tramite): Temporizador | undefined {
    const { id: tramiteId, version, estado, horario, perfil } = tramite;
    const base = { tipo, tramiteId, version };
    const calcularPlazo = (inicio: string, ms: number) => {
      const fecha = structuredClone(this.puertos.reloj.ahora());
      fecha.setTime(Date.parse(inicio) + ms);
      return fecha.toISOString();
    };
    switch (tipo) {
      case 'HOLD':
        if (estado === 'HORARIO_RESERVADO' && horario) {
          return { ...base, venceEn: horario.expiraEn, reservaId: horario.reservaId };
        }
        break;
      case 'INASISTENCIA':
        if (estado === 'CONFIRMADA' && horario && perfil) {
          return { ...base, venceEn: calcularPlazo(horario.inicio, perfil.toleranciaMin * 60_000) };
        }
        break;
      case 'INACTIVIDAD':
        if (estado === 'BORRADOR' || estado === 'COTIZADO' || estado === 'LISTO_PARA_RESERVAR' || estado === 'HORARIO_RESERVADO') {
          const { inactividadHoras } = this.puertos.registro.obtener(tramite.tipo);
          return { ...base, venceEn: calcularPlazo(tramite.ultimaActividad, inactividadHoras * 3_600_000) };
        }
        break;
    }
    return undefined;
  }

  private async expirarReserva(reserva: ReservaId, contexto: ContextoOperacion): Promise<void> {
    try { await this.puertos.agenda.expirar(reserva); }
    catch {
      this.puertos.registrarError?.({ correlation_id: contexto.correlationId, codigo: 'COMPENSACION_AGENDA_FALLIDA' });
    }
  }
}
