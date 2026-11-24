import type { FilaOutbox, OutboxPort, ParticionOutbox, PublicadorEventos, RegistroProcesados } from '@noki/application';
import type { EventoDominio } from '@noki/domain';

interface FilaMemoria extends FilaOutbox {
  particion: number;
  intentos: number;
  ultimoError?: string;
  publicadoEn?: string;
}

export class OutboxMemoria implements OutboxPort {
  private readonly filas = new Map<string, FilaMemoria>();
  private readonly tomadas = new Set<number>();

  agregar(particion: number, fila: FilaOutbox): void {
    this.filas.set(fila.id, { ...structuredClone(fila), particion, intentos: 0 });
  }

  estado(id: string): FilaMemoria | undefined { return structuredClone(this.filas.get(id)); }

  async tomarParticion(particion: number): Promise<ParticionOutbox | null> {
    if (this.tomadas.has(particion)) return null;
    this.tomadas.add(particion);
    return {
      pendientes: async (limite) => [...this.filas.values()]
        .filter((fila) => fila.particion === particion && !fila.publicadoEn).slice(0, limite)
        .map(({ id, evento }) => ({ id, evento: structuredClone(evento) })),
      marcarPublicado: async (id, ts) => {
        const fila = this.filas.get(id);
        if (fila) { fila.publicadoEn = ts; delete fila.ultimoError; }
      },
      marcarFallo: async (id, mensaje) => {
        const fila = this.filas.get(id);
        if (fila) { fila.intentos++; fila.ultimoError = mensaje; }
      },
      liberar: async () => { this.tomadas.delete(particion); },
    };
  }
}

export class PublicadorEventosMemoria implements PublicadorEventos {
  private readonly publicados: { particion: number; evento: EventoDominio }[] = [];

  async publicar(particion: number, evento: EventoDominio): Promise<void> {
    this.publicados.push({ particion, evento: structuredClone(evento) });
  }

  eventos(): readonly { particion: number; evento: EventoDominio }[] { return structuredClone(this.publicados); }
}

export class RegistroProcesadosMemoria implements RegistroProcesados {
  private readonly procesados = new Set<string>();

  async yaProcesado(consumidor: string, clave: string): Promise<boolean> {
    return this.procesados.has(JSON.stringify([consumidor, clave]));
  }

  async marcar(consumidor: string, clave: string): Promise<void> {
    this.procesados.add(JSON.stringify([consumidor, clave]));
  }
}
