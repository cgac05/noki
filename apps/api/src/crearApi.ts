import Fastify from 'fastify';
import type { Writable } from 'node:stream';
import cors from '@fastify/cors';
import { rutaRelojDemo, rutasComandos, rutasConsultas, rutasWhatsApp, type DependenciasRutaWa, type DependenciasComandos, type DependenciasConsultas } from '@noki/adapter-in-http';
import { comprobarPostgres } from '@noki/adapter-out-postgres';
import { comprobarRedis } from '@noki/adapter-out-redis';
import { v7 } from 'uuid';
import type { RelojDemo } from '@noki/application';

export interface DependenciasApi {
  databaseUrl: string;
  redisUrl: string;
  logger?: boolean;
  salidaLog?: Writable;
  origen?: string;
  comandos?: DependenciasComandos;
  consultas?: DependenciasConsultas;
  whatsapp?: DependenciasRutaWa;
  relojDemo?: RelojDemo;
}

export function crearApi(opciones: DependenciasApi) {
  const app = Fastify({
    logger: opciones.logger === false ? false : {
      level: opciones.salidaLog ? 'info' : process.env['LOG_LEVEL'] ?? 'info',
      ...(opciones.salidaLog ? { stream: opciones.salidaLog } : {}),
      redact: ['fechaNac', 'email', 'telefono', 'rfc', 'pin', 'curp', '*.fechaNac', '*.email', '*.telefono', '*.rfc', '*.pin', '*.curp', 'req.body.fechaNac', 'req.body.email', 'req.body.telefono', 'req.body.rfc', 'req.body.pin', 'req.body.curp', 'req.headers.authorization', 'req.body.waId', 'req.body.flowResponse', 'req.body.payload'],
    },
    genReqId: () => v7(),
    requestIdLogLabel: 'correlation_id',
  });
  if (opciones.origen) void app.register(cors, {
    origin: opciones.origen, methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'idempotency-key', 'authorization'],
  });
  if (opciones.comandos) void app.register(rutasComandos, opciones.comandos);
  if (opciones.consultas) void app.register(rutasConsultas, opciones.consultas);
  if (opciones.whatsapp) void app.register(rutasWhatsApp, opciones.whatsapp);
  if (opciones.comandos?.demo && opciones.relojDemo) void app.register(rutaRelojDemo, { relojDemo: opciones.relojDemo });
  app.get('/health', async () => ({ estado: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    const [postgres, redis] = await Promise.all([
      comprobarPostgres(opciones.databaseUrl), comprobarRedis(opciones.redisUrl),
    ]);
    return reply.code(postgres && redis ? 200 : 503).send({
      estado: postgres && redis ? 'ok' : 'error',
      postgres: postgres ? 'ok' : 'error', redis: redis ? 'ok' : 'error',
    });
  });
  return app;
}
