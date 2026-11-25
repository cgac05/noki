import type { ComandoRequest, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa, NombreEventoSocket, DatosEventoSocket } from '@noki/contracts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from './consultas.ts';
import type { IdGuion, PasoGuion } from './demo.ts';

export const CONTACTO_DEMO = '5210000000001';
export const CONTACTO_BETO_DEMO = '5210000000002';
export const CONTACTO_CARLA_DEMO = '5210000000003';
export const CONTACTOS_DEMO = [CONTACTO_DEMO, CONTACTO_BETO_DEMO, CONTACTO_CARLA_DEMO] as const;

export interface ClienteApi {
  readonly modo: 'mock' | 'real';
  readonly sesionWebDemoHabilitada?: boolean;
  enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }): Promise<RespuestaComando>;
  enviarMensajeWa(mensaje: SolicitudMensajeWa, opciones?: { idempotencyKey?: string }): Promise<RespuestaMensajeWa>;
  consultar<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N>): Promise<RespuestaConsultaCliente<N>>;
  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void;
  unirse(sala: string): () => void;
  relojDemo?: { adelantar(minutos: number): Promise<{ ahora: string }> };
  demo?: {
    readonly ids: { hiloId: string; pacienteId: string; sedeId: string; tramiteWebId: string };
    guion(): IdGuion; elegirGuion(id: IdGuion): void;
    revision(): number; paso(): PasoGuion; reiniciar(): void; alCambiar(recibir: () => void): () => void;
  };
}
