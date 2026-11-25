import type { ReservaId, TramiteId } from '@noki/domain';

export type TipoTemporizadorTramite = 'HOLD' | 'INASISTENCIA' | 'INACTIVIDAD';
export type TipoTemporizador = TipoTemporizadorTramite | 'OFERTA';

export interface TemporizadorDeTramite {
  tipo: TipoTemporizadorTramite;
  tramiteId: TramiteId;
  venceEn: string;
  version: number;
  reservaId?: ReservaId;
}

export interface TemporizadorOferta {
  tipo: 'OFERTA';
  ofertaId: string;
  venceEn: string;
}

export type Temporizador = TemporizadorDeTramite | TemporizadorOferta;

export interface ProgramadorTemporizadores {
  programar(temporizador: Temporizador, ahora: string): Promise<void>;
  cancelar(tipo: TipoTemporizador, claveId: string): Promise<void>;
  adelantarVencidos(ahora: string): Promise<number>;
}
