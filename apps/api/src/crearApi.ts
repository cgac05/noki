import Fastify from 'fastify';
import { comprobarPostgres } from '@noki/adapter-out-postgres';
import { comprobarRedis } from '@noki/adapter-out-redis';
import { v7 } from 'uuid';

export function crearApi(opciones: { databaseUrl: string; redisUrl: string; logger?: boolean }) {
  const app = Fastify({
    logger: opciones.logger === false ? false : {
      level: process.env['LOG_LEVEL'] ?? 'info',
      redact: ['fechaNac', 'email', 'telefono', 'rfc', 'pin', 'curp', '*.fechaNac', '*.email', '*.telefono', '*.rfc', '*.pin', '*.curp', 'req.body.fechaNac', 'req.body.email', 'req.body.telefono', 'req.body.rfc', 'req.body.pin', 'req.body.curp', 'req.headers.authorization'],
    },
    genReqId: () => v7(),
    requestIdLogLabel: 'correlation_id',
  });
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
