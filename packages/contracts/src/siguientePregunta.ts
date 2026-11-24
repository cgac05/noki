import { z } from 'zod';
import { CasillaSchema } from './vocabulario.ts';
import { CampoFlowSchema, OpcionSchema } from './mensajesBot.ts';

export const SiguientePreguntaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('COMPLETO') }),
  z.object({
    tipo: z.literal('PREGUNTA'), casilla: CasillaSchema,
    pista: z.object({
      entrada: z.enum(['TEXTO', 'BOTONES', 'LISTA', 'FLOW', 'NINGUNA']),
      opciones: z.array(OpcionSchema).optional(),
      campos: z.array(CampoFlowSchema).optional(),
    }),
  }),
]);
export type SiguientePregunta = z.infer<typeof SiguientePreguntaSchema>;
