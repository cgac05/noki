import type { ComandoRequest, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa, NombreEventoSocket, DatosEventoSocket } from '@noki/contracts';
import type { ConsultasProvisionales, ParametrosConsulta, PasoGuion } from './provisional.ts';

export const CONTACTO_DEMO = '5210000000001';

export interface ClienteApi {
  readonly modo: 'mock' | 'real';
  enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }): Promise<RespuestaComando>;
  enviarMensajeWa(mensaje: SolicitudMensajeWa): Promise<RespuestaMensajeWa>;
  consultar<K extends keyof ConsultasProvisionales>(nombre: K, parametros: ParametrosConsulta[K]): Promise<ConsultasProvisionales[K]>;
  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void;
  demo?: { paso(): PasoGuion; reiniciar(): void; alCambiar(recibir: () => void): () => void };
}
