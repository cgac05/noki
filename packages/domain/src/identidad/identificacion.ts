import type { PacienteId } from '../identificadores.ts';

export const PASOS_IDENTIFICACION = ['DESTINATARIO', 'CONFIRMAR', 'FECHA_NAC', 'CURP', 'DATOS'] as const;
export type PasoIdentificacion = typeof PASOS_IDENTIFICACION[number];
export type RelacionIdentificacion = 'TITULAR' | 'FAMILIAR';

export interface CandidatoIdentificacion {
  ref: string;
  pacienteId: PacienteId;
  nombreVisible: string;
}

export interface IdentificacionPendiente {
  relacion: RelacionIdentificacion;
  candidatos?: CandidatoIdentificacion[];
  elegido?: string;
  ninguno?: true;
  fechaNac?: string;
  curp?: string;
  sinCurp?: true;
}
