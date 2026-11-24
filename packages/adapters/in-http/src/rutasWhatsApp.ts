import type { FastifyPluginAsync } from 'fastify';
import { RespuestaMensajeWaSchema, SolicitudMensajeWaSchema } from '@noki/contracts';
import type { ConversacionWa } from './ConversacionWa.ts';
import { ejecutarIdempotente, type DependenciasIdempotencia } from './idempotencia.ts';
import { respuestaError } from './respuestaError.ts';

export interface DependenciasRutaWa {
  motor: ConversacionWa;
  idempotencia: DependenciasIdempotencia;
}

export const rutasWhatsApp: FastifyPluginAsync<DependenciasRutaWa> = async (app, deps) => {
  const ruta = '/api/canales/wa/mensajes';
  app.post(ruta, async (request, reply) => {
    const errorHttp = (error: unknown) => respuestaError(error,
      () => request.log.error({ correlation_id: request.id }, 'Fallo en el simulador de WhatsApp'));
    try {
      const mensaje = SolicitudMensajeWaSchema.parse(request.body);
      const respuesta = await ejecutarIdempotente(deps.idempotencia, request.headers['idempotency-key'], ruta, mensaje,
        async clave => ({ codigo: 200, cuerpo: RespuestaMensajeWaSchema.parse({
          mensajes: await deps.motor.responder(mensaje, clave, request.id),
        }) }), errorHttp);
      return reply.code(respuesta.codigo).send(respuesta.cuerpo);
    } catch (error) {
      const respuesta = errorHttp(error);
      return reply.code(respuesta.codigo).send(respuesta.cuerpo);
    }
  });
};
