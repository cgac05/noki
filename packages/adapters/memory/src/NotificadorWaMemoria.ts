import type { MensajeWaSaliente, NotificadorWa } from '@noki/application';

export class NotificadorWaMemoria implements NotificadorWa {
  readonly envios: { waId: string; mensajes: readonly MensajeWaSaliente[] }[] = [];

  async enviar(waId: string, mensajes: readonly MensajeWaSaliente[]): Promise<void> {
    this.envios.push({ waId, mensajes: structuredClone(mensajes) });
  }
}
