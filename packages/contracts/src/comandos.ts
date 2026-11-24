import { z } from 'zod';
import { CanalSchema, ActorSchema, TipoTramiteSchema, EstadoTramiteSchema } from './vocabulario.ts';
import { SiguientePreguntaSchema } from './siguientePregunta.ts';

const comun = { canal: CanalSchema, actor: ActorSchema, tramiteId: z.uuidv7().optional(), hiloId: z.uuidv7().optional() };
export const ComandoRequestSchema = z.discriminatedUnion('tipo', [
  z.object({ ...comun, tipo: z.literal('IniciarTramite'), payload: z.object({ tipoTramite: TipoTramiteSchema, contacto: z.string().regex(/^\d{10,15}$/).optional() }) }),
  z.object({
    ...comun, tipo: z.literal('SolicitarContinuacion'), tramiteId: z.uuidv7(),
    payload: z.object({ destino: z.literal('whatsapp') }),
  }),
  z.object({ ...comun, tipo: z.literal('SeleccionarServicio'), payload: z.object({ servicioId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('SeleccionarSede'), payload: z.object({ sedeId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('AsignarPaciente'), payload: z.object({ pacienteId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('ReservarHorario'), payload: z.object({ recursoId: z.uuidv7(), inicio: z.string().datetime() }) }),
  z.object({ ...comun, tipo: z.literal('ConfirmarCita'), payload: z.object({ reservaId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('CancelarCita'), payload: z.object({ motivo: z.string().min(1).max(200).optional() }) }),
  z.object({ ...comun, tipo: z.literal('RegistrarLlegada'), payload: z.object({ token: z.string().min(1) }) }),
]);
export type ComandoRequest = z.infer<typeof ComandoRequestSchema>;
export const TramiteVistaSchema = z.object({
  id: z.uuidv7(), hiloId: z.uuidv7(), tipo: TipoTramiteSchema, estado: EstadoTramiteSchema,
  version: z.number().int().nonnegative(), servicioId: z.uuidv7().optional(), sedeId: z.uuidv7().optional(),
  horario: z.object({
    reservaId: z.uuidv7(), inicio: z.string().datetime(), expiraEn: z.string().datetime().optional(),
  }).optional(),
}).refine(tramite => tramite.horario?.expiraEn === undefined || tramite.estado === 'HORARIO_RESERVADO', {
  path: ['horario', 'expiraEn'], message: 'Solo una reserva vigente puede tener vencimiento.',
});
export type TramiteVista = z.infer<typeof TramiteVistaSchema>;
export const EventoVistaSchema = z.object({ id: z.uuidv7(), tipo: z.string().min(1), canal: CanalSchema, ts: z.string().datetime() });
export type EventoVista = z.infer<typeof EventoVistaSchema>;
export const RespuestaComandoSchema = z.object({ tramite: TramiteVistaSchema, siguientePregunta: SiguientePreguntaSchema, eventos: z.array(EventoVistaSchema) });
export type RespuestaComando = z.infer<typeof RespuestaComandoSchema>;
