export interface Reloj {
  ahora(): Date;
}

export interface RelojAjustable extends Reloj {
  adelantar(ms: number): void;
}
