import type { Reloj } from '@noki/application';

export class RelojFalso implements Reloj {
  private instante: number;
  constructor(fecha: Date) { this.instante = fecha.getTime(); }
  ahora(): Date { return new Date(this.instante); }
  adelantar(ms: number): void { this.instante += ms; }
  fijar(fecha: Date): void { this.instante = fecha.getTime(); }
}
