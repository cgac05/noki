import { z } from 'zod';

const campoBase = { id: z.string().min(1), etiqueta: z.string().min(1), requerido: z.boolean().optional() };
export const CampoFlowSchema = z.discriminatedUnion('captura', [
  z.object({ ...campoBase, captura: z.literal('texto'), valorInicial: z.string().optional() }),
  z.object({ ...campoBase, captura: z.literal('fecha'), valorInicial: z.string().date().optional() }),
  z.object({ ...campoBase, captura: z.literal('sensitive'), valorInicial: z.string().optional() }),
  z.object({ ...campoBase, captura: z.literal('passcode') }).strict(),
]);
export type CampoFlow = z.infer<typeof CampoFlowSchema>;
export const OpcionSchema = z.object({ id: z.string().min(1), titulo: z.string().min(1), payload: z.string().min(1) });
export const MensajeBotSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('texto'), texto: z.string().min(1) }),
  z.object({ tipo: z.literal('botones'), texto: z.string().min(1), botones: z.array(OpcionSchema).min(1).max(3) }),
  z.object({
    tipo: z.literal('lista'), texto: z.string().min(1),
    secciones: z.array(z.object({ titulo: z.string().optional(), filas: z.array(OpcionSchema).min(1) })).min(1),
  }).superRefine((mensaje, ctx) => {
    if (mensaje.secciones.reduce((total, seccion) => total + seccion.filas.length, 0) > 10) {
      ctx.addIssue({ code: 'custom', path: ['secciones'], message: 'La lista admite como máximo 10 filas en total.' });
    }
  }),
  z.object({ tipo: z.literal('flow'), titulo: z.string().min(1), campos: z.array(CampoFlowSchema).min(1) }),
]);
export type MensajeBot = z.infer<typeof MensajeBotSchema>;
