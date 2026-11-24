import { z } from 'zod';
import { MensajeBotSchema, OfertaCatalogoSchema, RespuestaComandoSchema, SiguientePreguntaSchema } from '@noki/contracts';

// Solo las lecturas exclusivas del guion; los modelos compartidos vienen del contrato.
export const PasoGuionSchema = z.object({
  id: z.enum(['INICIO', 'LLAMADA_ENTRANTE', 'COTIZADO', 'CONTINUAR_WA', 'ELEGIR_HORARIO', 'HORARIO_RESERVADO', 'VERIFICACION', 'CONFIRMADA', 'EN_CLINICA']),
  titulo: z.string().min(1), numero: z.number().int().positive(), total: z.number().int().positive(),
}).strict();
export type PasoGuion = z.infer<typeof PasoGuionSchema>;

export const ConversacionVistaSchema = z.object({
  mensajes: z.array(MensajeBotSchema), siguientePregunta: SiguientePreguntaSchema,
}).strict();
export type ConversacionVista = z.infer<typeof ConversacionVistaSchema>;

export const WebVistaSchema = z.object({
  catalogo: OfertaCatalogoSchema,
  cotizacion: z.object({ precioCentavos: z.number().int().nonnegative(), codigoContinuacion: z.string().min(1) }).strict().nullable(),
}).strict();
export type WebVista = z.infer<typeof WebVistaSchema>;

export const ESQUEMAS_DEMO = { conversacion: ConversacionVistaSchema, web: WebVistaSchema };
export const PasoWebSchema = z.object({ vista: WebVistaSchema, respuesta: RespuestaComandoSchema }).strict();
export type PasoWeb = z.infer<typeof PasoWebSchema>;
