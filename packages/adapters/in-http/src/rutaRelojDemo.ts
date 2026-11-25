import type { FastifyPluginAsync } from 'fastify';
import type { RelojDemo } from '@noki/application';
import { z } from 'zod';

const cuerpo = z.object({ adelantarMinutos: z.number().int().min(1).max(10_080) });

export const rutaRelojDemo: FastifyPluginAsync<{ relojDemo: RelojDemo }> = async (app, { relojDemo }) => {
  app.post('/api/demo/reloj', async (solicitud, respuesta) => {
    const datos = cuerpo.safeParse(solicitud.body);
    if (!datos.success) return respuesta.code(400).send({ codigo: 'CUERPO_INVALIDO' });
    return { ahora: await relojDemo.adelantar(datos.data.adelantarMinutos) };
  });
};
