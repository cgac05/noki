// Pendiente del cambio compartido contratos-consultas: todos los datos de lectura locales viven aquí.
import { z } from 'zod';
import {
  ComandoRequestSchema, EstadoTramiteSchema, EventoVistaSchema, MensajeBotSchema,
  RespuestaComandoSchema, SiguientePreguntaSchema, SolicitudMensajeWaSchema, TramiteVistaSchema,
} from '@noki/contracts';
import { validar } from './errores.ts';

export const AccionVistaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('comando'), titulo: z.string().min(1), comando: ComandoRequestSchema }).strict(),
  z.object({ tipo: z.literal('wa'), titulo: z.string().min(1), mensaje: SolicitudMensajeWaSchema }).strict(),
]);
export type AccionVista = z.infer<typeof AccionVistaSchema>;

export const PasoGuionSchema = z.object({
  id: z.enum(['INICIO', 'LLAMADA_ENTRANTE', 'COTIZADO', 'CONTINUAR_WA', 'ELEGIR_HORARIO', 'HORARIO_RESERVADO', 'VERIFICACION', 'CONFIRMADA', 'EN_CLINICA']),
  titulo: z.string().min(1), numero: z.number().int().positive(), total: z.number().int().positive(),
}).strict();
export type PasoGuion = z.infer<typeof PasoGuionSchema>;

export const CatalogoVistaSchema = z.object({
  servicioId: z.uuidv7(), servicio: z.string().min(1),
  sedeId: z.uuidv7(), sede: z.string().min(1), precioCentavos: z.number().int().nonnegative(),
}).strict();
export type CatalogoVista = z.infer<typeof CatalogoVistaSchema>;

export const CitaVistaSchema = z.object({
  tramite: TramiteVistaSchema, servicio: z.string().min(1), sede: z.string().min(1),
  inicio: z.string().datetime(), zonaHoraria: z.string().refine(valor => {
    try { new Intl.DateTimeFormat('es-MX', { timeZone: valor }); return true; } catch { return false; }
  }), tokenQr: z.string().min(1),
}).strict();
export type CitaVista = z.infer<typeof CitaVistaSchema>;

export const FichaHiloSchema = z.object({
  nombrePila: z.string().min(1), telefonoEnmascarado: z.string().regex(/^•••• \d{4}$/),
  tramites: z.array(TramiteVistaSchema), lineaTiempo: z.array(EventoVistaSchema),
  acciones: z.array(AccionVistaSchema), soloLectura: z.boolean(),
  catalogo: CatalogoVistaSchema.nullable(), codigoContinuacion: z.string().nullable(),
}).strict();
export type FichaHilo = z.infer<typeof FichaHiloSchema>;

export const LlegadaVistaSchema = z.object({
  cita: CitaVistaSchema, registrada: z.boolean(), accion: ComandoRequestSchema.nullable(),
}).strict();
export type LlegadaVista = z.infer<typeof LlegadaVistaSchema>;

export const MensajeBandejaSchema = z.object({
  id: z.uuidv7(), canal: z.enum(['sms', 'email']), asunto: z.string().min(1), cuerpo: z.string().min(1),
}).strict();
export type MensajeBandeja = z.infer<typeof MensajeBandejaSchema>;

export const MetricasVistaSchema = z.object({
  porEstado: z.array(z.object({ estado: EstadoTramiteSchema, cantidad: z.number().int().nonnegative() }).strict()),
  kpis: z.record(z.string(), z.number()),
}).strict();
export type MetricasVista = z.infer<typeof MetricasVistaSchema>;

export const ConversacionVistaSchema = z.object({
  mensajes: z.array(MensajeBotSchema), siguientePregunta: SiguientePreguntaSchema,
}).strict();
export type ConversacionVista = z.infer<typeof ConversacionVistaSchema>;

export const WebVistaSchema = z.object({
  catalogo: CatalogoVistaSchema,
  cotizacion: z.object({ precioCentavos: z.number().int().nonnegative(), codigoContinuacion: z.string().min(1) }).strict().nullable(),
  acciones: z.array(z.object({ titulo: z.string().min(1), comando: ComandoRequestSchema }).strict()),
}).strict();
export type WebVista = z.infer<typeof WebVistaSchema>;

export const ESQUEMAS_CONSULTAS = {
  ficha: FichaHiloSchema, conversacion: ConversacionVistaSchema, citas: z.array(CitaVistaSchema),
  llegadas: z.array(LlegadaVistaSchema), bandeja: z.array(MensajeBandejaSchema),
  metricas: MetricasVistaSchema, lineaTiempo: z.array(EventoVistaSchema), web: WebVistaSchema,
};
export type ConsultasProvisionales = { [K in keyof typeof ESQUEMAS_CONSULTAS]: z.infer<(typeof ESQUEMAS_CONSULTAS)[K]> };
export type ParametrosConsulta = { [K in keyof ConsultasProvisionales]: K extends 'lineaTiempo' ? { hiloId: string } : Record<string, never> };

export function validarConsulta<K extends keyof ConsultasProvisionales>(nombre: K, dato: unknown): ConsultasProvisionales[K] {
  // El mapa conserva la relación clave/esquema; TypeScript no distribuye el índice genérico sobre Zod.
  return validar(ESQUEMAS_CONSULTAS[nombre], dato) as ConsultasProvisionales[K];
}

export const PasoWebSchema = z.object({ vista: WebVistaSchema, respuesta: RespuestaComandoSchema }).strict();
export type PasoWeb = z.infer<typeof PasoWebSchema>;
