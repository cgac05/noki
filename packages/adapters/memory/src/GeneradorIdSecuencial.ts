import type { GeneradorId } from '@noki/application';

export class GeneradorIdSecuencial implements GeneradorId {
  private secuencia = 0n;
  nuevo(): string {
    this.secuencia += 1n;
    if (this.secuencia > 0xffffffffffffn) throw new RangeError('Se agotó la secuencia de IDs de prueba.');
    return '00000000-0000-7000-8000-' + this.secuencia.toString(16).padStart(12, '0');
  }
}
