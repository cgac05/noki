import type { RegistroIntentos, ResultadoIntento } from '@noki/application';
import type { ContextoOperacion, EventoDominio, HiloId, MetodoVinculo } from '@noki/domain';

export class RegistroIntentosMemoria implements RegistroIntentos {
  private readonly estados = new Map<string, ResultadoIntento>();
  private readonly fallos: EventoDominio[] = [];

  async bloqueo(contactoId: string, ts: string): Promise<string | undefined> {
    const hasta = this.estados.get(contactoId)?.bloqueadoHasta;
    if (hasta && Date.parse(hasta) > Date.parse(ts)) return hasta;
    if (hasta) this.estados.delete(contactoId);
    return undefined;
  }

  async fallar(hiloId: HiloId, contactoId: string, metodo: MetodoVinculo, contexto: ContextoOperacion): Promise<ResultadoIntento> {
    const anterior = this.estados.get(contactoId);
    if (anterior?.bloqueadoHasta && Date.parse(anterior.bloqueadoHasta) > Date.parse(contexto.ts)) {
      return { ...anterior };
    }
    const intentos = (anterior?.bloqueadoHasta ? 0 : anterior?.intentos ?? 0) + 1;
    const resultado: ResultadoIntento = { intentos };
    if (intentos >= 3) resultado.bloqueadoHasta = new Date(Date.parse(contexto.ts) + 15 * 60_000).toISOString();
    this.estados.set(contactoId, resultado);
    this.fallos.push({
      ...contexto, hiloId, tramiteId: null, version: 0,
      tipo: 'IntentoVerificacionFallido', payload: { metodo, intentos },
    });
    return { ...resultado };
  }

  async reiniciar(contactoId: string): Promise<void> {
    this.estados.delete(contactoId);
  }

  eventos(): readonly EventoDominio[] {
    return structuredClone(this.fallos);
  }
}
