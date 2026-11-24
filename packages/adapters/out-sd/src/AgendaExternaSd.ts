import { setTimeout as esperar } from 'node:timers/promises';
import type { AgendaExternaPort, ConsultaDisponibilidad, SolicitudCitaExterna } from '@noki/application';
import { ReglaViolada } from '@noki/domain';

type Registrar = (datos: { correlation_id: string; intento: number; codigo: string }) => void;

export class AgendaExternaSd implements AgendaExternaPort {
  constructor(private readonly base: string, private readonly registrar: Registrar = () => {}) {}

  disponibilidad(consulta: ConsultaDisponibilidad, correlationId: string): Promise<string[]> {
    const url = new URL('/agenda/disponibilidad', this.base);
    url.search = new URLSearchParams({ ...consulta }).toString();
    return this.ejecutar(correlationId, async () => {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(1000) });
      this.exigirRespuesta(respuesta);
      const datos: unknown = await respuesta.json();
      if (!datos || typeof datos !== 'object' || !('horarios' in datos) ||
          !Array.isArray(datos.horarios) || !datos.horarios.every(
            (inicio: unknown): inicio is string => typeof inicio === 'string' && Number.isFinite(Date.parse(inicio)),
          )) throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
      return datos.horarios;
    });
  }

  registrarCita(solicitud: SolicitudCitaExterna, correlationId: string): Promise<string> {
    return this.ejecutar(correlationId, async () => {
      const respuesta = await fetch(new URL('/agenda/citas', this.base), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(solicitud), signal: AbortSignal.timeout(1000),
      });
      this.exigirRespuesta(respuesta);
      const datos: unknown = await respuesta.json();
      if (!datos || typeof datos !== 'object' || !('folio' in datos) ||
          typeof datos.folio !== 'string' || !/^\d{8,9}$/.test(datos.folio)) {
        throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
      }
      return datos.folio;
    });
  }

  cancelarCita(folio: string, correlationId: string): Promise<void> {
    return this.ejecutar(correlationId, async () => {
      const respuesta = await fetch(new URL('/agenda/citas/' + encodeURIComponent(folio), this.base), {
        method: 'DELETE', signal: AbortSignal.timeout(1000),
      });
      this.exigirRespuesta(respuesta);
    });
  }

  private exigirRespuesta(respuesta: Response): void {
    if (respuesta.ok) return;
    if (respuesta.status >= 500) throw new Error('Agenda externa no disponible.');
    throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
  }

  private async ejecutar<T>(correlationId: string, operacion: () => Promise<T>): Promise<T> {
    for (let intento = 1; intento <= 3; intento++) {
      try { return await operacion(); }
      catch (error) {
        if (error instanceof ReglaViolada) throw error;
        if (intento === 3) break;
        this.registrar({ correlation_id: correlationId, intento, codigo: 'REINTENTO_AGENDA' });
        await esperar(intento * 100);
      }
    }
    throw new ReglaViolada('AGENDA_NO_DISPONIBLE');
  }
}
