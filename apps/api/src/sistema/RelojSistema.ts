import type { Reloj } from '@noki/application';
export class RelojSistema implements Reloj {
  ahora(): Date { return new Date(); }
}
