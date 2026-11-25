import type { PerfilServicio } from '../PerfilServicio.ts';
import type { Canal } from '../vocabulario.ts';

export const FACTORES_RIESGO = [
  'anticipacionLog', 'inasistenciasPrevias', 'atencionesPrevias', 'requierePreparacion',
  'esConsulta', 'franjaTarde', 'finDeSemana', 'canalWeb', 'canalWhatsapp', 'canalApp',
  'canalCallcenter', 'primeraCita',
] as const;

export type FactoresRiesgo = Record<(typeof FACTORES_RIESGO)[number], number>;

interface DatosFactores {
  inicio: string;
  ahora: string;
  local: { hora: number; diaSemana: number };
  historial: { atenciones: number; inasistencias: number };
  perfil: Pick<PerfilServicio, 'tipo' | 'preparacion'>;
  canal: Canal;
}

export function factoresDesde({ inicio, ahora, local, historial, perfil, canal }: DatosFactores): FactoresRiesgo {
  const dias = (Date.parse(inicio) - Date.parse(ahora)) / 86_400_000;
  return {
    anticipacionLog: Math.log1p(Math.max(0, dias)),
    inasistenciasPrevias: Math.min(historial.inasistencias, 5),
    atencionesPrevias: Math.min(historial.atenciones, 10),
    requierePreparacion: Number(perfil.preparacion !== undefined),
    esConsulta: Number(perfil.tipo === 'CONSULTA'),
    franjaTarde: Number(local.hora >= 12),
    finDeSemana: Number(local.diaSemana === 0 || local.diaSemana === 6),
    canalWeb: Number(canal === 'web'),
    canalWhatsapp: Number(canal === 'whatsapp'),
    canalApp: Number(canal === 'app'),
    canalCallcenter: Number(canal === 'callcenter'),
    primeraCita: Number(historial.atenciones === 0 && historial.inasistencias === 0),
  };
}

export function vectorFactores(factores: FactoresRiesgo): number[] {
  return FACTORES_RIESGO.map((factor) => factores[factor]);
}
