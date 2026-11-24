import { z } from 'zod';

export const CanalSchema = z.enum(["web","whatsapp","app","callcenter","clinica"]);
export const EstadoTramiteSchema = z.enum(["BORRADOR","COTIZADO","LISTO_PARA_RESERVAR","HORARIO_RESERVADO","CONFIRMADA","EN_CLINICA","ATENDIDA","CANCELADA","NO_ASISTIO","EXPIRADO"]);
export const CasillaSchema = z.enum(["servicio","sede","paciente","requisitos","elegibilidad","horario"]);
export const TipoTramiteSchema = z.enum(["AGENDAR","ADELANTO","FACTURA"]);
export const CodigoErrorDominioSchema = z.enum(["REGLA_VIOLADA","STEP_UP_REQUERIDO","CONFLICTO_VERSION","NO_ENCONTRADO","TRANSICION_INVALIDA"]);
export const CodigoErrorSchema = z.enum([...CodigoErrorDominioSchema.options, 'VALIDACION', 'INTERNO']);
export const NivelAuthSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const ActorSchema = z.union([
  z.literal('paciente'), z.literal('sistema'),
  z.templateLiteral(['asesor:', z.string().min(1)]),
  z.templateLiteral(['recepcion:', z.string().min(1)]),
]);
