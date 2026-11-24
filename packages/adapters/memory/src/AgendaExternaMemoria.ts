import type { AgendaExternaPort, ConsultaDisponibilidad, SolicitudCitaExterna } from '@noki/application';
import { ReglaViolada, type ReservaId } from '@noki/domain';

export class AgendaExternaMemoria implements AgendaExternaPort {
  private readonly citas = new Map<ReservaId, { folio: string; activa: boolean }>();
  private siguienteFolio = 10_000_000;
  fallar = false;

  async disponibilidad({ fecha }: ConsultaDisponibilidad): Promise<string[]> {
    if (this.fallar) throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
    const comienzo = Date.parse(fecha + 'T07:00:00Z');
    return Array.from({ length: 15 }, (_, indice) => new Date(comienzo + indice * 1_800_000).toISOString());
  }

  async registrarCita(solicitud: SolicitudCitaExterna): Promise<string> {
    if (this.fallar) throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
    const anterior = this.citas.get(solicitud.reservaId);
    if (anterior && !anterior.activa) throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
    if (anterior) return anterior.folio;
    const folio = String(this.siguienteFolio++);
    this.citas.set(solicitud.reservaId, { folio, activa: true });
    return folio;
  }

  async cancelarCita(folio: string): Promise<void> {
    const cita = [...this.citas.values()].find((actual) => actual.folio === folio);
    if (cita) cita.activa = false;
  }

  activa(folio: string): boolean {
    return [...this.citas.values()].some((cita) => cita.activa && cita.folio === folio);
  }
}
