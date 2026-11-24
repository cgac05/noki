import type { AgendaPort, SolicitudReserva } from '@noki/application';
import { ConflictoVersion, NoEncontrado, type ReservaId } from '@noki/domain';

export class AgendaMemoria implements AgendaPort {
  private readonly reservas = new Map<ReservaId, SolicitudReserva & { expiraEn: string; folio?: string }>();
  private siguienteFolio = 10_000_000;

  async apartar(solicitud: SolicitudReserva): Promise<{ reservaId: ReservaId; expiraEn: string }> {
    const { reservaId, inicio, sedeId, servicioId, ts, ttlReservaMin } = solicitud;
    const ocupado = [...this.reservas.values()].some((reserva) =>
      reserva.sedeId === sedeId && reserva.servicioId === servicioId && reserva.inicio === inicio
      && (reserva.folio !== undefined || Date.parse(reserva.expiraEn) > Date.parse(ts)),
    );
    if (ocupado || this.reservas.has(reservaId)) throw new ConflictoVersion(0, 1);
    const expiraEn = new Date(Date.parse(ts) + ttlReservaMin * 60_000).toISOString();
    this.reservas.set(reservaId, { ...solicitud, expiraEn });
    return { reservaId, expiraEn };
  }

  async confirmar(reservaId: ReservaId, ts: string): Promise<string> {
    const reserva = this.reservas.get(reservaId);
    if (!reserva) throw new NoEncontrado('reserva', reservaId);
    if (reserva.folio) return reserva.folio;
    if (Date.parse(ts) >= Date.parse(reserva.expiraEn)) throw new ConflictoVersion(0, 1);
    reserva.folio = String(this.siguienteFolio++);
    return reserva.folio;
  }

  async liberar(reservaId: ReservaId): Promise<void> {
    this.reservas.delete(reservaId);
  }
}
