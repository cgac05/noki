import { z } from 'zod';
import { TramiteVistaSchema, EventoVistaSchema } from './comandos.ts';
import { MensajeBotSchema } from './mensajesBot.ts';
import { SolicitudMensajeWaSchema } from './whatsapp.ts';

const WaIdSchema = SolicitudMensajeWaSchema.shape.waId;

export const EVENTOS_SOCKET = {
  TRAMITE_ACTUALIZADO: 'tramite:actualizado', HILO_LINEA_TIEMPO: 'hilo:linea-tiempo',
  ADMIN_METRICAS: 'admin:metricas', SEDE_FILA: 'sede:fila', BANDEJA_MENSAJE: 'bandeja:mensaje', WA_MENSAJES: 'wa:mensajes',
} as const;
export type NombreEventoSocket = (typeof EVENTOS_SOCKET)[keyof typeof EVENTOS_SOCKET];
export const ESQUEMAS_EVENTOS_SOCKET = {
  [EVENTOS_SOCKET.TRAMITE_ACTUALIZADO]: TramiteVistaSchema,
  [EVENTOS_SOCKET.HILO_LINEA_TIEMPO]: z.object({ hiloId: z.uuidv7(), eventos: z.array(EventoVistaSchema) }),
  [EVENTOS_SOCKET.ADMIN_METRICAS]: z.record(z.string(), z.number()),
  [EVENTOS_SOCKET.SEDE_FILA]: z.object({ tramiteId: z.uuidv7(), posicion: z.number().int().nonnegative() }),
  [EVENTOS_SOCKET.BANDEJA_MENSAJE]: z.object({ mensajeId: z.uuidv7(), canal: z.enum(['sms', 'email']) }),
  [EVENTOS_SOCKET.WA_MENSAJES]: z.object({ waId: WaIdSchema, mensajes: z.array(MensajeBotSchema).min(1).max(5) }),
} satisfies Record<NombreEventoSocket, z.ZodType>;
export type DatosEventoSocket = { [K in NombreEventoSocket]: z.infer<(typeof ESQUEMAS_EVENTOS_SOCKET)[K]> };
export type DatosMensajesWa = DatosEventoSocket[typeof EVENTOS_SOCKET.WA_MENSAJES];
export const SalaSchema = z.union([
  z.literal('admin'), z.templateLiteral(['tramite:', z.uuidv7()]), z.templateLiteral(['hilo:', z.uuidv7()]),
  z.templateLiteral(['paciente:', z.uuidv7()]), z.templateLiteral(['sede:', z.uuidv7()]),
  z.templateLiteral(['wa:', WaIdSchema]).refine(sala => WaIdSchema.safeParse(sala.slice(3)).success),
]);
export type Sala = z.infer<typeof SalaSchema>;

export const EVENTOS_CLIENTE_SOCKET = {
  SALA_UNIRSE: 'sala:unirse',
  SALA_SALIR: 'sala:salir',
} as const;
export const ESQUEMAS_EVENTOS_CLIENTE_SOCKET = {
  [EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE]: SalaSchema,
  [EVENTOS_CLIENTE_SOCKET.SALA_SALIR]: SalaSchema,
};
