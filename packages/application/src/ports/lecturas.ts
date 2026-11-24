import type { Canal, EstadoTramite, HiloId, PacienteId, SedeId, ServicioId, Tramite, TramiteId } from '@noki/domain';

export interface EventoLeido {
  id: string;
  tipo: string;
  canal: Canal;
  ts: string;
}

export interface OfertaLeida {
  servicioId: ServicioId;
  servicio: string;
  sedeId: SedeId;
  sede: string;
  precioCentavos: number;
}

export interface CitaLeida {
  tramite: Tramite;
  servicio: string;
  sede: string;
  zonaHoraria: string;
  inicio: string;
}

export interface FichaLeida {
  hiloId: HiloId;
  nombrePila: string | null;
  telefonoEnmascarado: string | null;
  tramites: Tramite[];
  lineaTiempo: EventoLeido[];
  soloLectura: boolean;
  oferta: OfertaLeida | null;
}

export interface MetricasLeidas {
  porEstado: { estado: EstadoTramite; cantidad: number }[];
  kpis: Record<string, number>;
}

export interface ContextoDemoLeido {
  hiloId: HiloId | null;
  pacienteId: PacienteId | null;
  sedeId: SedeId | null;
}

export interface LecturasPort {
  tramite(id: TramiteId): Promise<Tramite | null>;
  contactoPorHilo(id: HiloId): Promise<string | null>;
  eventosPorClave(clave: string): Promise<EventoLeido[]>;
  lineaTiempo(id: HiloId): Promise<EventoLeido[] | null>;
  tramitesAbiertos(id: PacienteId): Promise<Tramite[]>;
  catalogo(): Promise<OfertaLeida[]>;
  zonaSede(id: SedeId): Promise<string | null>;
  fichaHilo(id: HiloId): Promise<FichaLeida | null>;
  citasPaciente(id: PacienteId): Promise<CitaLeida[]>;
  llegadasSede(id: SedeId, ts: string): Promise<CitaLeida[]>;
  metricas(): Promise<MetricasLeidas>;
  contextoDemo(): Promise<ContextoDemoLeido>;
  horariosOcupados(id: SedeId, fecha: string, ts: string): Promise<string[]>;
}
