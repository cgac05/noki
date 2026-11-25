import { z } from 'zod';

export const AdelantarRelojSchema = z.object({ adelantarMinutos: z.number().int().min(1).max(10_080) });
export const RespuestaRelojSchema = z.object({ ahora: z.string().datetime() });
export const RUTA_RELOJ_DEMO = { metodo: 'POST', ruta: '/api/demo/reloj', soloDemo: true } as const;
