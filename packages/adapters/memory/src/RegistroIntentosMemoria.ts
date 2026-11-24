import type { RegistroIntentos, ResultadoIntento } from '@noki/application';

export class RegistroIntentosMemoria implements RegistroIntentos {
  private readonly estados = new Map<string, ResultadoIntento>();

  async bloqueo(contactoId: string, ts: string): Promise<string | undefined> {
    const hasta = this.estados.get(contactoId)?.bloqueadoHasta;
    if (hasta && Date.parse(hasta) > Date.parse(ts)) return hasta;
    if (hasta) this.estados.delete(contactoId);
    return undefined;
  }

  async fallar(contactoId: string, ts: string): Promise<ResultadoIntento> {
    const anterior = this.estados.get(contactoId);
    if (anterior?.bloqueadoHasta && Date.parse(anterior.bloqueadoHasta) > Date.parse(ts)) {
      const resultado = { ...anterior, intentos: anterior.intentos + 1 };
      this.estados.set(contactoId, resultado);
      return { ...resultado };
    }
    const intentos = (anterior?.bloqueadoHasta ? 0 : anterior?.intentos ?? 0) + 1;
    const resultado: ResultadoIntento = { intentos };
    if (intentos >= 3) resultado.bloqueadoHasta = new Date(Date.parse(ts) + 15 * 60_000).toISOString();
    this.estados.set(contactoId, resultado);
    return { ...resultado };
  }

  async reiniciar(contactoId: string): Promise<void> {
    this.estados.delete(contactoId);
  }

}
