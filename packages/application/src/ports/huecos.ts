import type { CandidatoHueco, EventoDominio, Hueco, OrigenHueco, ReservaId, TramiteId, HiloId } from '@noki/domain';

export type EventoReservaLiberada = Extract<EventoDominio, { tipo: 'CitaCancelada' | 'CitaAdelantada' }>;

export interface DatosHuecoLiberado extends Omit<OrigenHueco, 'id'> {
  servicio: string;
  sede: string;
  zonaHoraria: string;
  anticipacionMinimaHoras: number;
}

export interface CandidatoParaOferta extends CandidatoHueco {
  interesId: string;
  tramiteId: TramiteId;
  hiloId: HiloId;
  contactoId: string;
  waId: string;
  enviadasEn: readonly string[];
}

export interface HuecosRepo {
  porOrigen(reservaId: ReservaId): Promise<Hueco | null>;
  porOferta(ofertaId: string): Promise<Hueco | null>;
  guardar(hueco: Hueco): Promise<boolean>;
}

export interface LecturasHuecos {
  liberada(evento: EventoReservaLiberada): Promise<DatosHuecoLiberado | null>;
  datos(reservaId: ReservaId): Promise<DatosHuecoLiberado | null>;
  candidatos(hueco: DatosHuecoLiberado, ts: string): Promise<CandidatoParaOferta[]>;
}
