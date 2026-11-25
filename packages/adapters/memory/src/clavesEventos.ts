import type { EventoDominio } from '@noki/domain';

export interface OpcionesClavesEventos {
  claveUnica?: boolean;
  claves?: Set<string>;
}

export function registrarClaves(claves: Set<string> | undefined, eventos: readonly EventoDominio[]): void {
  if (!claves) return;
  const nuevas = new Set<string>();
  for (const { idempotencyKey } of eventos) {
    if (claves.has(idempotencyKey) || nuevas.has(idempotencyKey)) {
      throw new Error('Clave de idempotencia repetida');
    }
    nuevas.add(idempotencyKey);
  }
  for (const clave of nuevas) claves.add(clave);
}
