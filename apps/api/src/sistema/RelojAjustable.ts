import type { RelojAjustable as PuertoRelojAjustable } from '@noki/application';

export class RelojAjustable implements PuertoRelojAjustable {
  private desfaseMs = 0;

  constructor(private readonly demo: boolean) {}

  ahora(): Date { return new Date(Date.now() + this.desfaseMs); }

  adelantar(ms: number): void {
    if (this.demo && ms > 0) this.desfaseMs += ms;
  }
}
