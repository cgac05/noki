import type { ProgramadorTemporizadores } from './ports/ProgramadorTemporizadores.ts';
import type { RelojAjustable } from './ports/Reloj.ts';

export class RelojDemo {
  constructor(
    private readonly reloj: RelojAjustable,
    private readonly programador: ProgramadorTemporizadores,
  ) {}

  async adelantar(minutos: number): Promise<string> {
    this.reloj.adelantar(minutos * 60_000);
    const ahora = this.reloj.ahora().toISOString();
    await this.programador.adelantarVencidos(ahora);
    return ahora;
  }
}
