import type { AgendaPort, SolicitudReserva } from '@noki/application';
import { ReglaViolada, type ReservaId } from '@noki/domain';

export class AgendaMemoria implements AgendaPort {
  private readonly reservas = new Map<ReservaId, SolicitudReserva & { expiraEn: string; folio?: string }>();

  async apartar(solicitud: SolicitudReserva): Promise<{ reservaId: ReservaId; expiraEn: string }> {
    const { reservaId, inicio, sedeId, servicioId, ts, ttlReservaMin } = solicitud;
    const ocupado = [...this.reservas.values()].some((reserva) =>
      reserva.sedeId === sedeId && reserva.inicio === inicio
      && (reserva.recursoId ?? reserva.servicioId) === (solicitud.recursoId ?? servicioId)
      && (reserva.folio !== undefined || Date.parse(reserva.expiraEn) > Date.parse(ts)),
    );
    if (ocupado || this.reservas.has(reservaId)) throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
    const expiraEn = new Date(Date.parse(ts) + ttlReservaMin * 60_000).toISOString();
    this.reservas.set(reservaId, { ...solicitud, expiraEn });
    return { reservaId, expiraEn };
  }

  async confirmar(reservaId: ReservaId, folio: string, ts: string): Promise<void> {
    const reserva = this.reservas.get(reservaId);
    if (reserva?.folio === folio) return;
    if (!reserva || reserva.folio || Date.parse(ts) >= Date.parse(reserva.expiraEn)) {
      throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
    }
    reserva.folio = folio;
  }

  async liberar(reservaId: ReservaId): Promise<void> {
    this.reservas.delete(reservaId);
  }
}
