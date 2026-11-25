import type { ReservaId, TramiteId } from '@noki/domain';

export type TipoTemporizador = 'HOLD' | 'INASISTENCIA' | 'INACTIVIDAD';

export interface Temporizador {
  tipo: TipoTemporizador;
  tramiteId: TramiteId;
  venceEn: string;
  version: number;
  reservaId?: ReservaId;
}

export interface ProgramadorTemporizadores {
  programar(temporizador: Temporizador, ahora: string): Promise<void>;
  cancelar(tipo: TipoTemporizador, tramiteId: TramiteId): Promise<void>;
  adelantarVencidos(ahora: string): Promise<number>;
}
