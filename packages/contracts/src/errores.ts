import { z } from 'zod';
import { CodigoErrorSchema } from './vocabulario.ts';

export const CuerpoErrorSchema = z.object({
  error: z.object({ codigo: CodigoErrorSchema, mensaje: z.string().min(1), datos: z.record(z.string(), z.unknown()).optional() }),
});
export type CuerpoError = z.infer<typeof CuerpoErrorSchema>;
