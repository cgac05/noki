import { vi } from 'vitest';

export class SocketFalso {
  connected = false;
  readonly oyentes = new Map<string, Set<(dato?: unknown) => void>>();
  readonly emit = vi.fn();
  readonly connect = vi.fn(() => this);
  readonly disconnect = vi.fn(() => { this.connected = false; return this; });
  on(nombre: string, recibir: (dato?: unknown) => void) {
    const grupo = this.oyentes.get(nombre) ?? new Set();
    grupo.add(recibir); this.oyentes.set(nombre, grupo); return this;
  }
  off(nombre: string, recibir: (dato?: unknown) => void) {
    this.oyentes.get(nombre)?.delete(recibir); return this;
  }
  recibir(nombre: string, dato?: unknown) {
    if (nombre === 'connect') this.connected = true;
    this.oyentes.get(nombre)?.forEach(oyente => oyente(dato));
  }
}
