import type { OutboxPort, PublicadorEventos } from './ports/publicacion.ts';
import type { Reloj } from './ports/Reloj.ts';

export class RelayOutbox {
  constructor(private readonly outbox: OutboxPort, private readonly publicador: PublicadorEventos,
    private readonly reloj: Reloj, private readonly limite = 100) {}

  async publicarPendientes(): Promise<void> {
    for (let numero = 0; numero < 8; numero++) {
      const particion = await this.outbox.tomarParticion(numero);
      if (!particion) continue;
      try {
        for (const { id, evento } of await particion.pendientes(this.limite)) {
          try {
            await this.publicador.publicar(numero, evento);
          } catch {
            await particion.marcarFallo(id, 'PUBLICACION_FALLIDA');
            break;
          }
          await particion.marcarPublicado(id, this.reloj.ahora().toISOString());
        }
      } finally {
        await particion.liberar();
      }
    }
  }
}
