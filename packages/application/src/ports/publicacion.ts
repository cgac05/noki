import type { EventoDominio } from '@noki/domain';

export interface FilaOutbox { id: string; evento: EventoDominio }

export interface ParticionOutbox {
  pendientes(limite: number): Promise<FilaOutbox[]>;
  marcarPublicado(id: string, ts: string): Promise<void>;
  marcarFallo(id: string, mensaje: string): Promise<void>;
  liberar(): Promise<void>;
}

export interface OutboxPort {
  tomarParticion(particion: number): Promise<ParticionOutbox | null>;
}

export interface PublicadorEventos {
  publicar(particion: number, evento: EventoDominio): Promise<void>;
}

export interface RegistroProcesados {
  yaProcesado(consumidor: string, clave: string): Promise<boolean>;
  marcar(consumidor: string, clave: string): Promise<void>;
}
