export const CANALES = ["web","whatsapp","app","callcenter","clinica"] as const;
export type Canal = (typeof CANALES)[number];

export const ESTADOS_TRAMITE = ["BORRADOR","COTIZADO","LISTO_PARA_RESERVAR","HORARIO_RESERVADO","CONFIRMADA","EN_CLINICA","ATENDIDA","CANCELADA","NO_ASISTIO","EXPIRADO"] as const;
export type EstadoTramite = (typeof ESTADOS_TRAMITE)[number];

export const CASILLAS = ["servicio","sede","paciente","requisitos","elegibilidad","horario"] as const;
export type Casilla = (typeof CASILLAS)[number];

export const TIPOS_TRAMITE = ["AGENDAR","ADELANTO","FACTURA"] as const;
export type TipoTramite = (typeof TIPOS_TRAMITE)[number];

export const CODIGOS_ERROR_DOMINIO = ["REGLA_VIOLADA","STEP_UP_REQUERIDO","CONFLICTO_VERSION","NO_ENCONTRADO","TRANSICION_INVALIDA"] as const;
export type CodigoErrorDominio = (typeof CODIGOS_ERROR_DOMINIO)[number];

export type Actor = 'paciente' | 'sistema' | `asesor:${string}` | `recepcion:${string}`;
export type NivelAuth = 0 | 1 | 2 | 3;
export type RelacionVinculo = 'TITULAR' | 'FAMILIAR' | 'TUTOR';
export type MetodoVinculo = 'FLOW_DECLARADO' | 'OTP_EMAIL' | 'OTP_SMS' | 'TOKEN_WEB' | 'TOKEN_CC' | 'FOLIO_FECHA_NAC' | 'INE_CLINICA' | 'TELEFONO_FECHA_NAC' | 'LLAMADA_CC' | 'MISMO_NUMERO';
