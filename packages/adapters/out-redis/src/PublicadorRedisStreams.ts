import { Redis } from 'ioredis';
import type { PublicadorEventos } from '@noki/application';
import type { EventoDominio } from '@noki/domain';

export class PublicadorRedisStreams implements PublicadorEventos {
  private readonly redis: Redis;

  constructor(url: string, private readonly prefijo = 'eventos:') {
    this.redis = new Redis(url, {
      lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0,
      connectTimeout: 1000, commandTimeout: 2000,
    });
    this.redis.on('error', () => {});
  }

  async publicar(particion: number, evento: EventoDominio): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
    await this.redis.xadd(this.prefijo + particion, '*',
      'idempotencyKey', evento.idempotencyKey, 'tipo', evento.tipo, 'evento', JSON.stringify(evento));
  }

  cerrar(): void { this.redis.disconnect(); }
}
