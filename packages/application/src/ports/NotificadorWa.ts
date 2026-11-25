export interface BotonMensajeWa { titulo: string; payload: string }

export interface MensajeWaSaliente {
  texto: string;
  botones?: readonly BotonMensajeWa[];
}

export interface NotificadorWa {
  enviar(waId: string, mensajes: readonly MensajeWaSaliente[]): Promise<void>;
}
