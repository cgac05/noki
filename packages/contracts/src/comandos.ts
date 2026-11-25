import { z } from 'zod';
import { CanalSchema, ActorSchema, TipoTramiteSchema, EstadoTramiteSchema } from './vocabulario.ts';
import { SiguientePreguntaSchema } from './siguientePregunta.ts';

const comun = { canal: CanalSchema, actor: ActorSchema, tramiteId: z.uuidv7().optional(), hiloId: z.uuidv7().optional() };
export const ENTIDADES_NACIMIENTO = [
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR',
  'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP',
  'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE',
] as const;

const formatoCurp = new RegExp(
  '^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HMX](' + ENTIDADES_NACIMIENTO.join('|') +
  ')[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$',
);

const datosNombre = z.string().trim().min(1);
export const IdentificarPacienteSchema = z.object({
  ...comun, tipo: z.literal('IdentificarPaciente'), tramiteId: z.uuidv7(),
  payload: z.discriminatedUnion('paso', [
    z.strictObject({ paso: z.literal('DESTINATARIO'), para: z.enum(['MI', 'OTRA_PERSONA']) }),
    z.strictObject({ paso: z.literal('CONFIRMAR'), candidato: z.string().min(1).nullable() }),
    z.strictObject({ paso: z.literal('FECHA_NAC'), fechaNac: z.iso.date() }),
    z.strictObject({ paso: z.literal('CURP'), curp: z.string().regex(formatoCurp).nullable() }),
    z.strictObject({
      paso: z.literal('DATOS'), nombre: datosNombre, apellidoPaterno: datosNombre,
      apellidoMaterno: datosNombre.optional(), fechaNac: z.iso.date().optional(),
      sexo: z.enum(['F', 'M', 'X']).optional(), entidadNacimiento: z.enum(ENTIDADES_NACIMIENTO).optional(),
    }),
    z.strictObject({ paso: z.literal('REINICIAR') }),
  ]),
});
export const ComandoRequestSchema = z.discriminatedUnion('tipo', [
  z.object({ ...comun, tipo: z.literal('IniciarTramite'), payload: z.object({ tipoTramite: TipoTramiteSchema, contacto: z.string().regex(/^\d{10,15}$/).optional() }) }),
  z.object({
    ...comun, tipo: z.literal('SolicitarContinuacion'), tramiteId: z.uuidv7(),
    payload: z.object({ destino: z.literal('whatsapp') }),
  }),
  z.object({ ...comun, tipo: z.literal('SeleccionarServicio'), payload: z.object({ servicioId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('SeleccionarSede'), payload: z.object({ sedeId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('AsignarPaciente'), payload: z.object({ pacienteId: z.uuidv7() }) }),
  IdentificarPacienteSchema,
  z.object({ ...comun, tipo: z.literal('ReservarHorario'), payload: z.object({ recursoId: z.uuidv7(), inicio: z.string().datetime() }) }),
  z.object({ ...comun, tipo: z.literal('ConfirmarCita'), payload: z.object({ reservaId: z.uuidv7() }) }),
  z.object({ ...comun, tipo: z.literal('CancelarCita'), payload: z.object({ motivo: z.string().min(1).max(200).optional() }) }),
  z.object({ ...comun, tipo: z.literal('RegistrarLlegada'), payload: z.object({ token: z.string().min(1) }) }),
  z.object({
    ...comun, tipo: z.literal('CerrarAtencion'), tramiteId: z.uuidv7(), payload: z.strictObject({}),
  }),
]);
export type ComandoRequest = z.infer<typeof ComandoRequestSchema>;
export type CerrarAtencion = Extract<ComandoRequest, { tipo: 'CerrarAtencion' }>;
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
