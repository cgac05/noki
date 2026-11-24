import type { ComandoRequest, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa, NombreEventoSocket, DatosEventoSocket } from '@noki/contracts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from './consultas.ts';
import type { PasoGuion } from './demo.ts';

export const CONTACTO_DEMO = '5210000000001';

export interface ClienteApi {
  readonly modo: 'mock' | 'real';
  enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }): Promise<RespuestaComando>;
  enviarMensajeWa(mensaje: SolicitudMensajeWa, opciones?: { idempotencyKey?: string }): Promise<RespuestaMensajeWa>;
  consultar<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N>): Promise<RespuestaConsultaCliente<N>>;
  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void;
  unirse(sala: string): () => void;
  demo?: {
    readonly ids: { hiloId: string; pacienteId: string; sedeId: string; tramiteWebId: string };
    revision(): number; paso(): PasoGuion; reiniciar(): void; alCambiar(recibir: () => void): () => void;
  };
}
