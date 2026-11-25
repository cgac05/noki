import type { ModeloRiesgo } from '@noki/application';

export class ModeloRiesgoMemoria implements ModeloRiesgo {
  constructor(private readonly resultado: number | Error, private readonly versionModelo = 'memoria@1') {}

  async estimar() {
    if (this.resultado instanceof Error) throw this.resultado;
    return { probabilidad: this.resultado, versionModelo: this.versionModelo };
  }
}
