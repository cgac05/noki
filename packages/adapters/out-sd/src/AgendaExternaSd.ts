import { setTimeout as esperar } from 'node:timers/promises';
import type { AgendaExternaPort, SolicitudCitaExterna } from '@noki/application';
import { ReglaViolada } from '@noki/domain';

type Registrar = (datos: { correlation_id: string; intento: number; codigo: string }) => void;

export class AgendaExternaSd implements AgendaExternaPort {
  constructor(private readonly base: string, private readonly registrar: Registrar = () => {}) {}

  registrarCita(solicitud: SolicitudCitaExterna, correlationId: string): Promise<string> {
    return this.ejecutar(correlationId, async () => {
      const respuesta = await fetch(new URL('/agenda/citas', this.base), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(solicitud), signal: AbortSignal.timeout(1000),
      });
      if (!respuesta.ok) throw new Error('No se registró la cita.');
      const datos: unknown = await respuesta.json();
      if (!datos || typeof datos !== 'object' || !('folio' in datos) ||
          typeof datos.folio !== 'string' || !/^\d{8,9}$/.test(datos.folio)) {
        throw new Error('Folio inválido.');
      }
      return datos.folio;
    });
  }

  cancelarCita(folio: string, correlationId: string): Promise<void> {
    return this.ejecutar(correlationId, async () => {
      const respuesta = await fetch(new URL('/agenda/citas/' + encodeURIComponent(folio), this.base), {
        method: 'DELETE', signal: AbortSignal.timeout(1000),
      });
      if (!respuesta.ok) throw new Error('No se canceló la cita.');
    });
  }

  private async ejecutar<T>(correlationId: string, operacion: () => Promise<T>): Promise<T> {
    for (let intento = 1; intento <= 3; intento++) {
      try { return await operacion(); }
      catch {
        if (intento === 3) break;
        this.registrar({ correlation_id: correlationId, intento, codigo: 'REINTENTO_AGENDA' });
        await esperar(intento * 100);
      }
    }
    throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
  }
}
