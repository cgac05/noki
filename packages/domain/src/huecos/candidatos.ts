import type { PerfilServicio } from '../PerfilServicio.ts';
import type { SedeId, ServicioId } from '../identificadores.ts';

const HORA_MS = 3_600_000;

export type EstrategiaHueco = 'SECUENCIAL' | 'OLEADA';

export interface CandidatoHueco {
  estado: 'ACTIVO' | 'CUMPLIDO' | 'CANCELADO' | 'VENCIDO';
  servicioId: ServicioId;
  sedesAceptadas: readonly SedeId[];
  ventanaDesde: string;
  ventanaHasta: string;
  citaActualInicio: string;
  requisitosCubiertos: boolean;
  recursoCompatible: boolean;
  registradoEn: string;
}

export function elegirEstrategia(inicio: string, ahora: string): EstrategiaHueco {
  return Date.parse(inicio) - Date.parse(ahora) >= 24 * HORA_MS ? 'SECUENCIAL' : 'OLEADA';
}

export function ordenarCandidatos<T extends Pick<CandidatoHueco, 'registradoEn'>>(candidatos: readonly T[]): T[] {
  return [...candidatos].sort((a, b) => Date.parse(a.registradoEn) - Date.parse(b.registradoEn));
}

export function candidatoCompatible(hueco: { inicio: string; sedeId: SedeId; servicioId: ServicioId },
  interes: CandidatoHueco, perfil: Pick<PerfilServicio, 'anticipacionMinimaHoras'>, ahora: string,
  historial: { horaLocal: number; enviadasEn: readonly string[] }): boolean {
  const inicio = Date.parse(hueco.inicio);
  const instante = Date.parse(ahora);
  const enviosRecientes = historial.enviadasEn.filter(enviada => {
    const tiempo = Date.parse(enviada);
    return tiempo > instante - 7 * 24 * HORA_MS && tiempo <= instante;
  });
  return interes.estado === 'ACTIVO'
    && interes.servicioId === hueco.servicioId
    && interes.recursoCompatible
    && interes.sedesAceptadas.includes(hueco.sedeId)
    && inicio >= Date.parse(interes.ventanaDesde)
    && inicio < Date.parse(interes.ventanaHasta)
    && inicio < Date.parse(interes.citaActualInicio)
    && inicio > instante
    && inicio - instante >= perfil.anticipacionMinimaHoras * HORA_MS
    && interes.requisitosCubiertos
    && enviosRecientes.length < 3
    && historial.horaLocal >= 7 && historial.horaLocal < 22;
}
