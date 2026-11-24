import Fastify from 'fastify';

export function crearSdMock(logger = true) {
  const app = Fastify({
    logger: logger ? { level: process.env['LOG_LEVEL'] ?? 'info', redact: ['fechaNac', 'email', 'telefono', 'rfc', 'pin', 'curp'] } : false,
    requestIdLogLabel: 'correlation_id',
  });
  app.get('/health', async () => ({ estado: 'ok' }));
  return app;
}
