import type { HiloId, TramiteId, PacienteId, ServicioId, SedeId, ReservaId, RecursoId } from './identificadores.ts';
import type { Actor, Canal, NivelAuth, TipoTramite, MetodoVinculo } from './vocabulario.ts';
import type { RiesgoEstimado } from './prediccion/nivel.ts';

export const EVENTOS_DOMINIO = ["TramiteIniciado","ServicioSeleccionado","SedeSeleccionada","CotizacionGenerada","PreparacionAceptada","RequisitoCumplido","PacienteAsignado","DestinatarioDeclarado","PacienteRegistrado","ItinerarioPropuesto","ItinerarioAceptado","HorarioReservado","ReservaExpirada","CitaConfirmada","CitaReprogramada","CitaCancelada","PacienteLlego","TurnoActualizado","AtencionCerrada","Inasistencia","TramiteSuspendido","TramiteExpirado","CanalCambiado","PacienteReconocido","IdentidadVinculada","IdentidadComprobada","ConsentimientoOtorgado","ConsentimientoContactoWA","IntentoVerificacionFallido", "InteresAdelantoRegistrado", "InteresAdelantoCancelado", "HuecoLiberado", "OfertaEnviada", "OfertaAceptada", "OfertaRechazada", "OfertaExpirada", "OfertaPerdida", "CitaAdelantada", "HuecoAsignado", "HuecoDesierto", "RiesgoEstimado"] as const;

export interface EnvolturaEvento<T extends string, P> {
  tipo: T;
  tramiteId: TramiteId | null;
  hiloId: HiloId;
  canal: Canal;
  actor: Actor;
  nivelAuth: NivelAuth;
  version: number;
  correlationId: string;
  idempotencyKey: string;
  ts: string;
  payload: P;
}

export interface PayloadsEvento {
  RiesgoEstimado: Pick<RiesgoEstimado, 'nivel' | 'probabilidad' | 'origen' | 'versionModelo'>;
  InteresAdelantoRegistrado: { interesId: string; servicioId: ServicioId };
  InteresAdelantoCancelado: { interesId: string };
  HuecoLiberado: { huecoId: string; sedeId: SedeId; recursoId: RecursoId; servicioId: ServicioId; inicio: string; estrategia: 'SECUENCIAL' | 'OLEADA' };
  OfertaEnviada: { huecoId: string; ofertaId: string; expiraEn: string };
  OfertaAceptada: { huecoId: string; ofertaId: string };
  OfertaRechazada: { huecoId: string; ofertaId: string };
  OfertaExpirada: { huecoId: string; ofertaId: string };
  OfertaPerdida: { huecoId: string; ofertaId: string };
  CitaAdelantada: { reservaAnteriorId: ReservaId; reservaId: ReservaId; diasAdelantados: number };
  HuecoAsignado: { huecoId: string; ofertaId: string };
  HuecoDesierto: { huecoId: string };
  TramiteIniciado: { tipoTramite: TipoTramite };
  ServicioSeleccionado: { servicioId: ServicioId };
  SedeSeleccionada: { sedeId: SedeId };
  CotizacionGenerada: { precioCentavos: number; vigenteHasta: string };
  PreparacionAceptada: { servicioId: ServicioId };
  RequisitoCumplido: { requisitoId: string };
  PacienteAsignado: { pacienteId: PacienteId };
  DestinatarioDeclarado: { relacion: 'TITULAR' | 'FAMILIAR' };
  PacienteRegistrado: { pacienteId: PacienteId };
  ItinerarioPropuesto: { itinerarioId: string };
  ItinerarioAceptado: { itinerarioId: string };
  HorarioReservado: { reservaId: ReservaId; expiraEn: string };
  ReservaExpirada: { reservaId: ReservaId };
  CitaConfirmada: { folio: string };
  CitaReprogramada: { reservaAnteriorId: ReservaId; reservaId: ReservaId };
  CitaCancelada: { anticipacionHoras: number };
  PacienteLlego: { sedeId: SedeId };
  TurnoActualizado: { posicion: number };
  AtencionCerrada: { sedeId: SedeId };
  Inasistencia: { sedeId: SedeId };
  TramiteSuspendido: { ultimoCanal: Canal };
  TramiteExpirado: { motivo: string };
  CanalCambiado: { de: Canal; a: Canal; metodo: MetodoVinculo };
  PacienteReconocido: { pacienteId: PacienteId };
  IdentidadVinculada: { pacienteId: PacienteId; metodo: MetodoVinculo };
  IdentidadComprobada: { pacienteId: PacienteId; metodo: MetodoVinculo };
  ConsentimientoOtorgado: { version: string };
  ConsentimientoContactoWA: { consentimientoId: string };
  IntentoVerificacionFallido: { metodo: MetodoVinculo; intentos: number };
}

export type EventoDominio = {
  [T in keyof PayloadsEvento]: EnvolturaEvento<T, PayloadsEvento[T]>;
}[keyof PayloadsEvento];
