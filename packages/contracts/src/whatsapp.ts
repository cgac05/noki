import { z } from 'zod';
import { MensajeBotSchema } from './mensajesBot.ts';

export const SolicitudMensajeWaSchema = z.object({
  waId: z.string().regex(/^\d{10,15}$/),
  texto: z.string().min(1).optional(), payloadBoton: z.string().min(1).optional(),
  flowResponse: z.record(z.string(), z.string()).optional(),
}).refine(m => m.texto !== undefined || m.payloadBoton !== undefined || m.flowResponse !== undefined, {
  message: 'Se requiere texto, payloadBoton o flowResponse.',
});
export type SolicitudMensajeWa = z.infer<typeof SolicitudMensajeWaSchema>;
export const RespuestaMensajeWaSchema = z.object({ mensajes: z.array(MensajeBotSchema) });
export type RespuestaMensajeWa = z.infer<typeof RespuestaMensajeWaSchema>;
