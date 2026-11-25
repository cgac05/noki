import { factoresDesde } from '../packages/domain/src/prediccion/factores.ts';
import type { FactoresRiesgo } from '../packages/domain/src/prediccion/factores.ts';
import type { Canal } from '../packages/domain/src/vocabulario.ts';

export interface CitaSintetica {
  factores: FactoresRiesgo;
  inasistencia: number;
}

export function aleatorioConSemilla(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 2 ** 32;
  };
}

const canales: readonly Canal[] = ['web', 'whatsapp', 'app', 'callcenter', 'clinica'];
const origen = '2026-01-01T00:00:00.000Z';

export function generarDatos(semilla: number, cantidad: number): CitaSintetica[] {
  const aleatorio = aleatorioConSemilla(semilla);
  const entero = (limite: number) => Math.floor(aleatorio() * limite);
  return Array.from({ length: cantidad }, () => {
    const dias = 1 + entero(45);
    const historial = aleatorio() < 0.25
      ? { inasistencias: 0, atenciones: 0 }
      : { inasistencias: Math.floor(aleatorio() ** 2 * 5), atenciones: 1 + entero(14) };
    const preparacion = aleatorio() < 0.30 ? { texto: 'Preparación simulada' } : undefined;
    const factores = factoresDesde({
      inicio: new Date(Date.parse(origen) + dias * 86_400_000).toISOString(),
      ahora: origen,
      local: { hora: 7 + entero(13), diaSemana: entero(7) },
      historial,
      perfil: { tipo: aleatorio() < 0.30 ? 'CONSULTA' : 'ESTUDIO', ...(preparacion && { preparacion }) },
      canal: canales[entero(canales.length)]!,
    });
    const logit = -3.8 + 0.65 * factores.anticipacionLog + 0.8 * factores.inasistenciasPrevias
      - 0.30 * factores.atencionesPrevias + 0.65 * factores.primeraCita
      + 0.60 * factores.requierePreparacion + 0.45 * factores.finDeSemana + 0.40 * factores.franjaTarde
      + 0.35 * factores.canalWeb - 0.30 * factores.canalApp + (aleatorio() - 0.5) * 0.8;
    return { factores, inasistencia: Number(aleatorio() < 1 / (1 + Math.exp(-logit))) };
  });
}
