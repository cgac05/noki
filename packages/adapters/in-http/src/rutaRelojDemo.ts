import type { FastifyPluginAsync } from 'fastify';
import type { RelojDemo } from '@noki/application';
import { AdelantarRelojSchema, RespuestaRelojSchema, RUTA_RELOJ_DEMO } from '@noki/contracts';

export const rutaRelojDemo: FastifyPluginAsync<{ relojDemo: RelojDemo }> = async (app, { relojDemo }) => {
  app.post(RUTA_RELOJ_DEMO.ruta, async (solicitud, respuesta) => {
    const datos = AdelantarRelojSchema.safeParse(solicitud.body);
    if (!datos.success) return respuesta.code(400).send({ codigo: 'CUERPO_INVALIDO' });
    return RespuestaRelojSchema.parse({ ahora: await relojDemo.adelantar(datos.data.adelantarMinutos) });
  });
};
