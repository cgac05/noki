import type { TramiteId } from '@noki/domain';
import type { ProgramadorTemporizadores, Temporizador, TipoTemporizador } from '@noki/application';

export class ProgramadorMemoria implements ProgramadorTemporizadores {
  private readonly trabajos = new Map<string, Temporizador>();

  constructor(private readonly ejecutar?: (temporizador: Temporizador) => Promise<void>) {}

  async programar(temporizador: Temporizador): Promise<void> {
    this.trabajos.set(this.id(temporizador.tipo, temporizador.tramiteId), { ...temporizador });
  }

  async cancelar(tipo: TipoTemporizador, tramiteId: TramiteId): Promise<void> {
    this.trabajos.delete(this.id(tipo, tramiteId));
  }

  vencidos(ahora: string): Temporizador[] {
    return this.listarVencidos(ahora).map(trabajo => ({ ...trabajo }));
  }

  async adelantarVencidos(ahora: string): Promise<number> {
    const vencidos = this.listarVencidos(ahora);
    if (!this.ejecutar) return vencidos.length;
    let ejecutados = 0;
    for (const trabajo of vencidos) {
      const id = this.id(trabajo.tipo, trabajo.tramiteId);
      if (this.trabajos.get(id) !== trabajo) continue;
      await this.ejecutar({ ...trabajo });
      if (this.trabajos.get(id) === trabajo) this.trabajos.delete(id);
      ejecutados++;
    }
    return ejecutados;
  }

  private listarVencidos(ahora: string): Temporizador[] {
    const limite = Date.parse(ahora);
    return [...this.trabajos.values()].filter(trabajo => Date.parse(trabajo.venceEn) <= limite);
  }

  private id(tipo: TipoTemporizador, tramiteId: TramiteId): string {
    return `${tipo}:${tramiteId}`;
  }
}
