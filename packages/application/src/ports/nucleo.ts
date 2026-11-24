import type {
  Canal, DatosElegibilidad, EventoDominio, HiloAtencion, HiloId, MetodoVinculo, NivelAuth,
  PacienteId, PerfilServicio, RecursoId, RelacionVinculo, ReservaId, SedeId, ServicioId, Tramite, TramiteId,
} from '@noki/domain';

export interface TramiteRepo {
  obtener(id: TramiteId): Promise<Tramite | null>;
  guardar(tramite: Tramite): Promise<void>;
  abiertosPorPaciente(id: PacienteId): Promise<Tramite[]>;
  abiertosPorHilo(id: HiloId): Promise<Tramite[]>;
  porFolio(folio: string): Promise<Tramite | null>;
}

export interface HiloRepo {
  obtener(id: HiloId): Promise<HiloAtencion | null>;
  guardar(hilo: HiloAtencion): Promise<void>;
  porContacto(contactoId: string): Promise<HiloAtencion | null>;
}

export interface Contacto {
  id: string;
  canal: Canal;
  valor: string;
  hiloId: HiloId;
}

export interface Vinculo {
  pacienteId: PacienteId;
  metodo: MetodoVinculo;
  relacion: RelacionVinculo;
  nivel: NivelAuth;
}

export interface ContactosPort {
  buscar(canal: Canal, valor: string): Promise<Contacto | null>;
  crear(contacto: Contacto): Promise<Contacto>;
  vinculosDe(contactoId: string): Promise<Vinculo[]>;
  vincular(contactoId: string, vinculo: Vinculo): Promise<void>;
  buscarTelefonoCapturado(numero: string): Promise<HiloId[]>;
}

export interface TokenVerificado {
  tramiteId: TramiteId;
  hiloId: HiloId;
  pacienteId?: PacienteId;
  nivel: NivelAuth;
  canalOrigen: Canal;
  metodo: 'TOKEN_CC' | 'TOKEN_WEB';
}

export type UsoToken = 'CONTINUIDAD' | 'LLEGADA';

export interface VerificadorTokens {
  verificar(token: string, uso?: UsoToken): Promise<TokenVerificado | null>;
}

export interface DatosDeclarados {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNac: string;
}

export interface PacientesPort {
  datosElegibilidad(id: PacienteId): Promise<DatosElegibilidad | undefined>;
  coincideFechaNac(id: PacienteId, fechaNac: string): Promise<boolean>;
  buscarPorDatos(datos: DatosDeclarados): Promise<PacienteId[]>;
}

export interface CatalogoPort {
  oferta(servicioId: ServicioId, sedeId: SedeId): Promise<number | null>;
  sedesQueOfrecen(servicioId: ServicioId): Promise<SedeId[]>;
  perfil(servicioId: ServicioId): Promise<PerfilServicio | null>;
}

export interface SolicitudReserva {
  recursoId?: RecursoId;
  reservaId: ReservaId;
  tramiteId: TramiteId;
  servicioId: ServicioId;
  sedeId: SedeId;
  inicio: string;
  ttlReservaMin: number;
  ts: string;
}

export interface AgendaPort {
  apartar(solicitud: SolicitudReserva): Promise<{ reservaId: ReservaId; expiraEn: string }>;
  confirmar(reservaId: ReservaId, folio: string, ts: string): Promise<void>;
  liberar(reservaId: ReservaId): Promise<void>;
}

export type SolicitudCitaExterna = Pick<SolicitudReserva, 'reservaId' | 'sedeId' | 'servicioId' | 'inicio'>;

export interface AgendaExternaPort {
  registrarCita(solicitud: SolicitudCitaExterna, correlationId: string): Promise<string>;
  cancelarCita(folio: string, correlationId: string): Promise<void>;
}

export interface ResultadoIntento {
  intentos: number;
  bloqueadoHasta?: string;
}

export interface RegistroIntentos {
  bloqueo(contactoId: string, ts: string): Promise<string | undefined>;
  fallar(contactoId: string, ts: string): Promise<ResultadoIntento>;
  reiniciar(contactoId: string): Promise<void>;
}

export interface EventosSinTramite {
  agregar(eventos: readonly (EventoDominio & { tramiteId: null })[]): Promise<void>;
}
