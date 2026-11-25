import type { PerfilServicio } from '../PerfilServicio.ts';
import type { NivelRiesgo } from './nivel.ts';

type RecordatorioPerfil = PerfilServicio['recordatorios'][number];
export type TipoRecordatorioRiesgo = RecordatorioPerfil | 'REFUERZO' | 'DEVOLUCION_LLAMADA';
type Variante = 'ESTANDAR' | 'CONFIRMAR' | 'CONFIRMAR_Y_FACILITAR_CAMBIO';
type Recordatorio = { tipo: TipoRecordatorioRiesgo; variante: Variante };
export type HorarioSilencio = { desde: string; hasta: string };

const variantes: Record<NivelRiesgo, Variante> = {
  BAJO: 'ESTANDAR', MEDIO: 'CONFIRMAR', ALTO: 'CONFIRMAR_Y_FACILITAR_CAMBIO',
};

export function varianteDesde(nivel: NivelRiesgo): Variante {
  return variantes[nivel];
}

export function planPorNivel(nivel: NivelRiesgo, perfil: readonly RecordatorioPerfil[],
  opciones?: { devolucionLlamada?: boolean }): Recordatorio[] {
  const variante = varianteDesde(nivel);
  const plan: Recordatorio[] = perfil.map((tipo) => ({ tipo, variante: tipo === 'POST' ? 'ESTANDAR' : variante }));
  if (nivel === 'ALTO') {
    plan.push({ tipo: 'REFUERZO', variante });
    if (opciones?.devolucionLlamada === true) plan.push({ tipo: 'DEVOLUCION_LLAMADA', variante });
  }
  return plan;
}

export const DESPLAZAMIENTO_HORAS = {
  T48: 48, REFUERZO: 24, T2: 2, PREPARACION: null, POST: null, DEVOLUCION_LLAMADA: null,
} as const satisfies Record<TipoRecordatorioRiesgo, number | null>;

export function enSilencio(horaLocal: string, { desde, hasta }: HorarioSilencio): boolean {
  return desde > hasta ? horaLocal >= desde || horaLocal < hasta : horaLocal >= desde && horaLocal < hasta;
}
