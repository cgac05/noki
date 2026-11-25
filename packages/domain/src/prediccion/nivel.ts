import { ReglaViolada } from '../errores.ts';
import type { TramiteId } from '../identificadores.ts';
import type { FactoresRiesgo } from './factores.ts';

export const NIVELES_RIESGO = ['BAJO', 'MEDIO', 'ALTO'] as const;
export type NivelRiesgo = (typeof NIVELES_RIESGO)[number];

export interface RiesgoEstimado {
  tramiteId: TramiteId;
  nivel: NivelRiesgo;
  probabilidad: number;
  origen: 'MODELO' | 'REGLAS';
  versionModelo: string;
  estimadoEn: string;
}

export function nivelDesde(probabilidad: number): NivelRiesgo {
  if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 1) {
    throw new ReglaViolada('PROBABILIDAD_INVALIDA');
  }
  if (probabilidad < 0.20) return 'BAJO';
  if (probabilidad < 0.40) return 'MEDIO';
  return 'ALTO';
}

export function probabilidadPorReglas(factores: FactoresRiesgo): number {
  const probabilidad = 0.08 + 0.12 * Math.min(factores.inasistenciasPrevias, 2)
    + 0.06 * Number(factores.anticipacionLog > Math.log1p(14))
    + 0.04 * factores.primeraCita + 0.03 * factores.requierePreparacion
    - 0.02 * Math.min(factores.atencionesPrevias, 3);
  return Math.max(0.01, Math.min(0.95, probabilidad));
}
