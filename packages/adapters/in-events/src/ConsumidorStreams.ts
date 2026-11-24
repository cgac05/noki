import { Redis } from 'ioredis';
import type { RegistroProcesados } from '@noki/application';
import { EVENTOS_DOMINIO, type EventoDominio } from '@noki/domain';

type Mensaje = [id: string, campos: string[]];
type Lectura = [stream: string, mensajes: Mensaje[]][];

function eventoDe(campos: string[]): EventoDominio | undefined {
  const indice = campos.findIndex((valor, posicion) => posicion % 2 === 0 && valor === 'evento');
  const json = indice < 0 ? undefined : campos[indice + 1];
  if (!json) return undefined;
  try {
    const datos: unknown = JSON.parse(json);
    if (datos && typeof datos === 'object' && 'idempotencyKey' in datos &&
        typeof datos.idempotencyKey === 'string' && 'tipo' in datos &&
        EVENTOS_DOMINIO.some((tipo) => tipo === datos.tipo)) return datos as EventoDominio;
  } catch { return undefined; }
  return undefined;
}

export class ConsumidorStreams {
  private readonly redis: Redis;
  private detenido = false;

  constructor(url: string, private readonly grupo: string, private readonly registro: RegistroProcesados,
    private readonly manejar: (evento: EventoDominio) => Promise<void>, private readonly prefijo = 'eventos:') {
    this.redis = new Redis(url, {
      lazyConnect: true, commandTimeout: 3000, maxRetriesPerRequest: 0, enableOfflineQueue: false,
    });
    this.redis.on('error', () => {});
  }

  async iniciar(): Promise<void> {
    this.detenido = false;
    if (this.redis.status === 'wait') await this.redis.connect();
    for (let particion = 0; particion < 8; particion++) {
      try { await this.redis.xgroup('CREATE', this.prefijo + particion, this.grupo, '0', 'MKSTREAM'); }
      catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith('BUSYGROUP')) throw error;
      }
    }
  }

  detener(): void { this.detenido = true; }
  cerrar(): void { this.redis.disconnect(); }

  async consumirPendientes(limite = 100): Promise<void> {
    const bloqueadas = new Set<number>();
    for (let particion = 0; particion < 8 && !this.detenido; particion++) {
      const stream = this.prefijo + particion;
      while (!this.detenido) {
        const resultado = await this.leer(stream, '0');
        if (resultado === 'PROCESADO') continue;
        if (resultado === 'BLOQUEADO') bloqueadas.add(particion);
        break;
      }
    }
    for (let particion = 0; particion < 8 && !this.detenido; particion++) {
      if (bloqueadas.has(particion)) continue;
      const stream = this.prefijo + particion;
      for (let i = 0; i < limite && !this.detenido; i++) {
        if (await this.leer(stream, '>') !== 'PROCESADO') break;
      }
    }
  }

  private async leer(stream: string, desde: '0' | '>'): Promise<'PROCESADO' | 'VACIO' | 'BLOQUEADO'> {
    // Nombre estable para recuperar el PEL de la instancia anterior del mismo grupo.
    const datos = await this.redis.xreadgroup('GROUP', this.grupo, this.grupo,
      'COUNT', 1, 'STREAMS', stream, desde) as Lectura | null;
    const mensaje = datos?.[0]?.[1][0];
    if (!mensaje || this.detenido) return 'VACIO';
    return await this.procesar(stream, ...mensaje) ? 'PROCESADO' : 'BLOQUEADO';
  }

  private async procesar(stream: string, id: string, campos: string[]): Promise<boolean> {
    const evento = eventoDe(campos);
    if (!evento) {
      await this.fallido(stream, id, 'DESCONOCIDA', 'DESCONOCIDO');
      return true;
    }
    if (await this.registro.yaProcesado(this.grupo, evento.idempotencyKey)) {
      await this.redis.xack(stream, this.grupo, id);
      return true;
    }
    try { await this.manejar(evento); }
    catch {
      const pendientes = await this.redis.xpending(stream, this.grupo, id, id, 1) as [string, string, number, number][];
      if ((pendientes[0]?.[3] ?? 0) < 3) return false;
      await this.fallido(stream, id, evento.idempotencyKey, evento.tipo);
      return true;
    }
    await this.registro.marcar(this.grupo, evento.idempotencyKey);
    await this.redis.xack(stream, this.grupo, id);
    return true;
  }

  private async fallido(stream: string, id: string, clave: string, tipo: string): Promise<void> {
    const resultado = await this.redis.multi()
      .xadd(this.prefijo + 'fallidos', '*', 'grupo', this.grupo, 'idempotencyKey', clave, 'tipo', tipo, 'motivo', 'PROCESAMIENTO_FALLIDO')
      .xack(stream, this.grupo, id)
      .exec();
    if (!resultado || resultado.some(([error]) => error)) throw new Error('No se registró el mensaje fallido.');
  }
}
