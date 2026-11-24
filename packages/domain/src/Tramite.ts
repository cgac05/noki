import { ReglaViolada, TransicionInvalida } from './errores.ts';
import type { EventoDominio, PayloadsEvento } from './eventos.ts';
import type { HiloId, PacienteId, ReservaId, SedeId, ServicioId, TramiteId } from './identificadores.ts';
import type { PerfilServicio } from './PerfilServicio.ts';
import type { DefinicionTipoTramite, RegistroTiposTramite } from './RegistroTiposTramite.ts';
import type { Actor, Canal, Casilla, EstadoTramite, MetodoVinculo, NivelAuth, TipoTramite } from './vocabulario.ts';

export interface ContextoOperacion {
  canal: Canal;
  actor: Actor;
  nivelAuth: NivelAuth;
  correlationId: string;
  idempotencyKey: string;
  ts: string;
}

export interface Cotizacion {
  precioCentavos: number;
  vigenteHasta: string;
}

export interface HorarioReservado {
  reservaId: ReservaId;
  inicio: string;
  expiraEn: string;
}

export interface DatosElegibilidad {
  sexo: 'F' | 'M';
  fechaNac: string;
}

type EventoNuevo = {
  [T in EventoDominio['tipo']]: Pick<Extract<EventoDominio, { tipo: T }>, 'tipo' | 'payload'>;
}[EventoDominio['tipo']];

type EventoIdentidad = Extract<EventoNuevo, { tipo: 'PacienteReconocido' | 'IdentidadVinculada' }>;

interface DatosTramite {
  version: number;
  fase?: EstadoTramite;
  servicioId?: ServicioId;
  sedeId?: SedeId;
  pacienteId?: PacienteId;
  perfil?: PerfilServicio;
  cotizacion?: Cotizacion;
  requisitos: string[];
  elegibilidad?: 'CUMPLIDA' | 'ADVERTENCIA_ELEGIBILIDAD';
  horario?: HorarioReservado;
  folio?: string;
  ultimoCanal: Canal;
}

export class Tramite {
  private readonly pendientes: EventoDominio[] = [];

  private constructor(
    readonly id: TramiteId,
    readonly hiloId: HiloId,
    readonly tipo: TipoTramite,
    readonly canalOrigen: Canal,
    private readonly definicion: DefinicionTipoTramite,
    private readonly datos: DatosTramite,
    private base: number,
  ) {}

  static iniciar(id: TramiteId, hiloId: HiloId, tipo: TipoTramite, registro: RegistroTiposTramite, contexto: ContextoOperacion): Tramite {
    const tramite = new Tramite(id, hiloId, tipo, contexto.canal, registro.obtener(tipo), {
      version: 0, requisitos: [], ultimoCanal: contexto.canal,
    }, 0);
    tramite.anotar(contexto, { tipo: 'TramiteIniciado', payload: { tipoTramite: tipo } });
    return tramite;
  }

  get version() { return this.datos.version; }
  get versionCargada() { return this.base; }
  get estado() { return this.datos.fase ?? this.definicion.hitos((casilla) => this.casillaLlena(casilla)); }
  get servicioId() { return this.datos.servicioId; }
  get sedeId() { return this.datos.sedeId; }
  get pacienteId() { return this.datos.pacienteId; }
  get perfil() { return structuredClone(this.datos.perfil); }
  get precioCentavos() { return this.datos.cotizacion?.precioCentavos; }
  get horario() { return structuredClone(this.datos.horario); }
  get folio() { return this.datos.folio; }
  get ultimoCanal() { return this.datos.ultimoCanal; }
  get advertenciaElegibilidad() {
    return this.datos.elegibilidad === 'ADVERTENCIA_ELEGIBILIDAD' ? this.datos.elegibilidad : undefined;
  }

  casillaLlena(casilla: Casilla): boolean {
    const datos = this.datos;
    switch (casilla) {
      case 'servicio': return datos.servicioId !== undefined;
      case 'sede': return datos.sedeId !== undefined;
      case 'paciente': return datos.pacienteId !== undefined;
      case 'requisitos':
        return datos.perfil?.requisitos.every(({ tipo }) => datos.requisitos.includes(tipo)) ?? false;
      case 'elegibilidad': return datos.elegibilidad === 'CUMPLIDA';
      case 'horario': return datos.horario !== undefined;
    }
  }

  eventosPendientes(): readonly EventoDominio[] {
    return structuredClone(this.pendientes);
  }

  copiaPersistida(): Tramite {
    return new Tramite(this.id, this.hiloId, this.tipo, this.canalOrigen, this.definicion,
      structuredClone(this.datos), this.version);
  }

  marcarGuardado(): void {
    this.base = this.version;
    this.pendientes.length = 0;
  }

  seleccionarServicio(servicioId: ServicioId, perfil: PerfilServicio, cotizacion: Cotizacion | null,
    contexto: ContextoOperacion, paciente?: DatosElegibilidad): void {
    this.exigirEditable('seleccionarServicio');
    const primero = !this.servicioId;
    const elegibilidad = this.evaluar(perfil, this.pacienteId, paciente, contexto.ts);
    this.datos.servicioId = servicioId;
    this.datos.perfil = structuredClone(perfil);
    if (!primero) this.datos.requisitos = [];
    if (!cotizacion) delete this.datos.sedeId;
    this.fijarElegibilidad(elegibilidad);
    const eventos: EventoNuevo[] = [{ tipo: 'ServicioSeleccionado', payload: { servicioId } }];
    this.actualizarCotizacion(cotizacion, eventos);
    this.anotar(contexto, ...eventos);
  }

  seleccionarSede(sedeId: SedeId, cotizacion: Cotizacion | null, contexto: ContextoOperacion): void {
    this.exigirEditable('seleccionarSede');
    if (this.servicioId && !cotizacion) throw new ReglaViolada('SERVICIO_NO_DISPONIBLE_EN_SEDE');
    this.datos.sedeId = sedeId;
    const eventos: EventoNuevo[] = [{ tipo: 'SedeSeleccionada', payload: { sedeId } }];
    this.actualizarCotizacion(cotizacion, eventos);
    this.anotar(contexto, ...eventos);
  }

  asignarPaciente(pacienteId: PacienteId, contexto: ContextoOperacion, paciente?: DatosElegibilidad): void {
    this.exigirEditable('asignarPaciente');
    const elegibilidad = this.evaluar(this.datos.perfil, pacienteId, paciente, contexto.ts);
    this.datos.pacienteId = pacienteId;
    this.fijarElegibilidad(elegibilidad);
    this.anotar(contexto, { tipo: 'PacienteAsignado', payload: { pacienteId } });
  }

  cumplirRequisito(requisitoId: PerfilServicio['requisitos'][number]['tipo'], contexto: ContextoOperacion): void {
    this.exigirEditable('cumplirRequisito');
    if (this.datos.requisitos.includes(requisitoId)) return;
    this.datos.requisitos.push(requisitoId);
    this.anotar(contexto, { tipo: 'RequisitoCumplido', payload: { requisitoId } });
  }

  aceptarPreparacion(contexto: ContextoOperacion): void {
    this.exigirEditable('aceptarPreparacion');
    const servicioId = this.servicioId;
    if (!servicioId) throw new ReglaViolada('CASILLAS_PENDIENTES', { casillas: ['servicio'] });
    if (this.datos.requisitos.includes('ACEPTAR_PREPARACION')) return;
    this.datos.requisitos.push('ACEPTAR_PREPARACION');
    this.anotar(contexto, { tipo: 'PreparacionAceptada', payload: { servicioId } });
  }

  reconocerElegibilidad(contexto: ContextoOperacion): void {
    this.exigirEditable('reconocerElegibilidad');
    if (!this.advertenciaElegibilidad) throw new TransicionInvalida(this.estado, 'reconocerElegibilidad');
    this.fijarElegibilidad('CUMPLIDA');
    this.anotar(contexto, { tipo: 'RequisitoCumplido', payload: { requisitoId: 'ELEGIBILIDAD' } });
  }

  validarApartar(): EstadoTramite {
    const destino = this.definicion.transiciones['apartar']?.[this.estado];
    if (destino) return destino;
    if (this.estado === 'BORRADOR' || this.estado === 'COTIZADO') {
      const casillas: Casilla[] = ['servicio', 'sede', 'paciente', 'requisitos'];
      const pendientes = casillas.filter((casilla) => !this.casillaLlena(casilla));
      if (this.sedeId && this.precioCentavos === undefined) pendientes.push('sede');
      throw new ReglaViolada('CASILLAS_PENDIENTES', { casillas: pendientes });
    }
    throw new TransicionInvalida(this.estado, 'apartar');
  }

  apartar(horario: HorarioReservado, contexto: ContextoOperacion): void {
    this.datos.fase = this.validarApartar();
    this.datos.horario = { ...horario };
    this.anotar(contexto, { tipo: 'HorarioReservado', payload: { reservaId: horario.reservaId, expiraEn: horario.expiraEn } });
  }

  validarConfirmar(ts: string): void {
    this.destino('confirmar');
    if (Date.parse(ts) >= Date.parse(this.datos.horario?.expiraEn ?? '')) {
      throw new TransicionInvalida(this.estado, 'confirmar');
    }
  }

  confirmar(folio: string, contexto: ContextoOperacion): void {
    this.validarConfirmar(contexto.ts);
    this.datos.folio = folio;
    this.transicionar('confirmar', contexto, { tipo: 'CitaConfirmada', payload: { folio } });
  }

  expirarHold(contexto: ContextoOperacion): void {
    this.destino('expirarHold');
    const horario = this.datos.horario;
    if (!horario || Date.parse(contexto.ts) < Date.parse(horario.expiraEn)) {
      throw new TransicionInvalida(this.estado, 'expirarHold');
    }
    delete this.datos.fase;
    delete this.datos.horario;
    this.anotar(contexto, { tipo: 'ReservaExpirada', payload: { reservaId: horario.reservaId } });
  }

  registrarLlegada(contexto: ContextoOperacion): void {
    this.transicionar('registrarLlegada', contexto, { tipo: 'PacienteLlego', payload: { sedeId: this.sede('registrarLlegada') } });
  }

  cerrarAtencion(contexto: ContextoOperacion): void {
    this.transicionar('cerrarAtencion', contexto, { tipo: 'AtencionCerrada', payload: { sedeId: this.sede('cerrarAtencion') } });
  }

  cancelar(contexto: ContextoOperacion): void {
    const horario = this.datos.horario;
    if (!horario) throw new TransicionInvalida(this.estado, 'cancelar');
    const anticipacionHoras = (Date.parse(horario.inicio) - Date.parse(contexto.ts)) / 3_600_000;
    this.transicionar('cancelar', contexto, { tipo: 'CitaCancelada', payload: { anticipacionHoras } });
  }

  marcarInasistencia(contexto: ContextoOperacion): void {
    this.transicionar('marcarInasistencia', contexto, { tipo: 'Inasistencia', payload: { sedeId: this.sede('marcarInasistencia') } });
  }

  expirarPorInactividad(contexto: ContextoOperacion): void {
    this.transicionar('expirarPorInactividad', contexto, { tipo: 'TramiteExpirado', payload: { motivo: 'INACTIVIDAD' } });
  }

  retomar(contexto: ContextoOperacion, metodo: MetodoVinculo, identidad?: EventoIdentidad,
    cambioHilo?: PayloadsEvento['CanalCambiado']): void {
    const eventos: EventoNuevo[] = identidad ? [identidad] : [];
    const cambio = cambioHilo ?? (contexto.canal === this.ultimoCanal
      ? undefined
      : { de: this.ultimoCanal, a: contexto.canal, metodo });
    if (cambio) eventos.unshift({ tipo: 'CanalCambiado', payload: cambio });
    this.datos.ultimoCanal = contexto.canal;
    if (eventos.length) this.anotar(contexto, ...eventos);
  }

  private evaluar(perfil: PerfilServicio | undefined, pacienteId: PacienteId | undefined,
    paciente: DatosElegibilidad | undefined, ts: string): DatosTramite['elegibilidad'] {
    if (!perfil || !pacienteId) return undefined;
    const regla = perfil.elegibilidad;
    if (!regla) return 'CUMPLIDA';
    if (!paciente) throw new ReglaViolada('CASILLAS_PENDIENTES', { casillas: ['elegibilidad'] });
    const hoy = ts.slice(0, 10);
    const edad = Number(hoy.slice(0, 4)) - Number(paciente.fechaNac.slice(0, 4))
      - Number(hoy.slice(5) < paciente.fechaNac.slice(5));
    const cumple = (!regla.sexo || regla.sexo === paciente.sexo)
      && (regla.edadMin === undefined || edad >= regla.edadMin)
      && (regla.edadMax === undefined || edad <= regla.edadMax);
    return cumple ? 'CUMPLIDA' : 'ADVERTENCIA_ELEGIBILIDAD';
  }

  private fijarElegibilidad(valor: DatosTramite['elegibilidad']): void {
    if (valor) this.datos.elegibilidad = valor;
    else delete this.datos.elegibilidad;
  }

  private actualizarCotizacion(cotizacion: Cotizacion | null, eventos: EventoNuevo[]): void {
    if (cotizacion && this.servicioId && this.sedeId) {
      this.datos.cotizacion = { ...cotizacion };
      eventos.push({ tipo: 'CotizacionGenerada', payload: { ...cotizacion } });
    } else {
      delete this.datos.cotizacion;
    }
  }

  private exigirEditable(comando: string): void {
    if (this.datos.fase) throw new TransicionInvalida(this.estado, comando);
  }

  private sede(comando: string): SedeId {
    if (!this.sedeId) throw new TransicionInvalida(this.estado, comando);
    return this.sedeId;
  }

  private destino(comando: string): EstadoTramite {
    const destino = this.definicion.transiciones[comando]?.[this.estado];
    if (!destino) throw new TransicionInvalida(this.estado, comando);
    return destino;
  }

  private transicionar(comando: string, contexto: ContextoOperacion, evento: EventoNuevo): void {
    this.datos.fase = this.destino(comando);
    this.anotar(contexto, evento);
  }

  private anotar(contexto: ContextoOperacion, ...eventos: EventoNuevo[]): void {
    this.datos.version++;
    for (const [indice, evento] of eventos.entries()) {
      this.pendientes.push({
        ...evento, ...contexto, tramiteId: this.id, hiloId: this.hiloId, version: this.version,
        idempotencyKey: eventos.length === 1 ? contexto.idempotencyKey : contexto.idempotencyKey + ':' + (indice + 1),
      });
    }
  }
}
