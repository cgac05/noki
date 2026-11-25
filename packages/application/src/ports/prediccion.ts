import type { PacienteId, SedeId } from '@noki/domain';

export interface ModeloRiesgo {
  estimar(vector: readonly number[]): Promise<{ probabilidad: number; versionModelo: string }>;
}

export interface HistorialPrediccion {
  atenciones: number;
  inasistencias: number;
}

export interface LecturasPrediccion {
  historial(pacienteId: PacienteId, antesDe: string): Promise<HistorialPrediccion>;
  zonaSede(sedeId: SedeId): Promise<string | null>;
}

export interface CalendarioSede {
  local(instante: string, zona: string): { fecha: string; hora: number; minuto: number; diaSemana: number };
  aUtc(fecha: string, hora: number, minuto: number, zona: string): string;
}
