import {
  HiloAtencion, NoEncontrado, ReglaViolada, TransicionInvalida, siguientePregunta,
  type ContextoIdentidad, type ContextoOperacion, type Cotizacion, type DatosElegibilidad,
  type EventoDominio, type HiloId, type PacienteId, type PerfilServicio, type PoliticaIdentidad,
  type RegistroTiposTramite, type ReservaId, type SedeId, type ServicioId,
  type SiguientePreguntaDominio, type TipoTramite, Tramite, type TramiteId,
} from '@noki/domain';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { Reloj } from './ports/Reloj.ts';
import type {
  AgendaPort, CatalogoPort, Contacto, ContactosPort, HiloRepo, PacientesPort, TramiteRepo, VerificadorTokens,
} from './ports/nucleo.ts';
import type { EntradaContinuidad, ResolvedorContinuidad, ResultadoContinuidad } from './ResolvedorContinuidad.ts';

export interface ContextoComando extends ContextoIdentidad {
  correlationId: string;
  idempotencyKey: string;
}

export interface ResultadoComando {
  tramite: Tramite;
  siguientePregunta: SiguientePreguntaDominio;
  eventos: readonly EventoDominio[];
}

export type ResultadoRetomar = Exclude<ResultadoContinuidad, { tipo: 'RETOMADO' }>
  | { tipo: 'RETOMADO'; nivel: ContextoOperacion['nivelAuth']; operacion: ResultadoComando };

interface Dependencias {
  tramites: TramiteRepo;
  hilos: HiloRepo;
  contactos: ContactosPort;
  tokens: VerificadorTokens;
  pacientes: PacientesPort;
  catalogo: CatalogoPort;
  agenda: AgendaPort;
  reloj: Reloj;
  ids: GeneradorId;
  politica: PoliticaIdentidad;
  registro: RegistroTiposTramite;
  resolvedor: ResolvedorContinuidad;
}

export class CasosTramite {
  constructor(private readonly puertos: Dependencias) {}

  async iniciar(tipo: TipoTramite, valorContacto: string, comando: ContextoComando): Promise<ResultadoComando> {
    this.puertos.politica.exigir('agendar', comando);
    this.puertos.registro.obtener(tipo);
    const contexto = this.contexto(comando);
    const contacto = await this.contacto(valorContacto, contexto);
    const tramite = Tramite.iniciar(this.puertos.ids.nuevo() as TramiteId, contacto.hiloId,
      tipo, this.puertos.registro, contexto);
    return this.guardar(tramite, contexto);
  }

  async seleccionarServicio(id: TramiteId, servicioId: ServicioId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, async (tramite, contexto) => {
      const perfil = await this.puertos.catalogo.perfil(servicioId);
      if (!perfil) throw new NoEncontrado('servicio', servicioId);
      const oferta = tramite.sedeId ? await this.puertos.catalogo.oferta(servicioId, tramite.sedeId) : null;
      const cotizacion = oferta === null ? null : this.cotizacion(oferta, contexto.ts);
      const datos = await this.datosElegibilidad(tramite.pacienteId, perfil);
      tramite.seleccionarServicio(servicioId, perfil, cotizacion, contexto, datos);
    });
  }

  async seleccionarSede(id: TramiteId, sedeId: SedeId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, async (tramite, contexto) => {
      const servicio = tramite.servicioId;
      const precio = servicio ? await this.puertos.catalogo.oferta(servicio, sedeId) : null;
      if (servicio && precio === null) {
        const alternativas = await this.puertos.catalogo.sedesQueOfrecen(servicio);
        throw new ReglaViolada('SERVICIO_NO_DISPONIBLE_EN_SEDE', { alternativas });
      }
      tramite.seleccionarSede(sedeId, precio === null ? null : this.cotizacion(precio, contexto.ts), contexto);
    });
  }

  async asignarPaciente(id: TramiteId, pacienteId: PacienteId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, async (tramite, contexto) => {
      const datos = await this.datosElegibilidad(pacienteId, tramite.perfil);
      tramite.asignarPaciente(pacienteId, contexto, datos);
    });
  }

  async cumplirRequisito(id: TramiteId, requisito: PerfilServicio['requisitos'][number]['tipo'],
    comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, (tramite, contexto) => tramite.cumplirRequisito(requisito, contexto));
  }

  async reconocerElegibilidad(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, (tramite, contexto) => tramite.reconocerElegibilidad(contexto));
  }

  async reservar(id: TramiteId, inicio: string, comando: ContextoComando): Promise<ResultadoComando> {
    this.puertos.politica.exigir('agendar', comando);
    const contexto = this.contexto(comando);
    const tramite = await this.cargar(id);
    tramite.validarApartar();
    const { sedeId, servicioId, perfil } = tramite;
    if (!sedeId || !servicioId || !perfil) throw new TransicionInvalida(tramite.estado, 'apartar');
    const reserva = await this.puertos.agenda.apartar({
      inicio, sedeId, servicioId, tramiteId: id, ts: contexto.ts, ttlReservaMin: perfil.ttlReservaMin,
      reservaId: this.puertos.ids.nuevo() as ReservaId,
    });
    try {
      tramite.apartar({ ...reserva, inicio }, contexto);
      return await this.guardar(tramite, contexto);
    } catch (error) {
      await this.puertos.agenda.liberar(reserva.reservaId);
      throw error;
    }
  }

  async confirmar(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, async (tramite, contexto) => {
      tramite.validarConfirmar(contexto.ts);
      const horario = tramite.horario;
      if (!horario) throw new TransicionInvalida(tramite.estado, 'confirmar');
      const folio = await this.puertos.agenda.confirmar(horario.reservaId, contexto.ts);
      tramite.confirmar(folio, contexto);
    });
  }

  async retomar(entrada: EntradaContinuidad, comando: ContextoComando): Promise<ResultadoRetomar> {
    const contexto = this.contexto(comando);
    const contacto = await this.contacto(entrada.valorContacto, contexto);
    const resultado = await this.puertos.resolvedor.resolver(entrada, contacto, contexto);
    if (resultado.tipo !== 'RETOMADO') return resultado;

    const factor = resultado.fuente === 'TOKEN' ? 'TOKEN' : 'FOLIO_FECHA_NAC';
    this.puertos.politica.exigir('retomar', {
      ...comando, nivel: resultado.nivel, vinculado: resultado.fuente === 'VINCULO',
      factores: resultado.fuente === 'VINCULO' ? new Set() : new Set([factor]),
    });
    const tramite = await this.cargar(resultado.tramiteId);
    if (tramite.pacienteId !== resultado.pacienteId) return { tipo: 'SIN_RESULTADO' };
    const hilo = await this.puertos.hilos.obtener(tramite.hiloId);
    if (!hilo) throw new NoEncontrado('hilo', tramite.hiloId);
    const operacion = { ...contexto, nivelAuth: resultado.nivel };
    const { pacienteId, metodo } = resultado;
    const identidad = !pacienteId ? undefined : resultado.fuente === 'VINCULO'
      ? { tipo: 'PacienteReconocido', payload: { pacienteId } } as const
      : { tipo: 'IdentidadVinculada', payload: { pacienteId, metodo } } as const;

    const cambioHilo = hilo.retomar(operacion.canal, metodo);
    tramite.retomar(operacion, metodo, identidad, cambioHilo);
    const guardado = await this.guardar(tramite, operacion);
    await this.puertos.hilos.guardar(hilo);
    if (pacienteId && resultado.fuente !== 'VINCULO') {
      await this.puertos.contactos.vincular(contacto.id, {
        pacienteId, metodo, relacion: 'TITULAR', nivel: resultado.nivel,
      });
    }
    return { tipo: 'RETOMADO', nivel: resultado.nivel, operacion: guardado };
  }

  async registrarLlegada(token: string, comando: ContextoComando): Promise<ResultadoComando> {
    const contexto = this.contexto(comando);
    if (contexto.canal !== 'clinica' || !contexto.actor.startsWith('recepcion:')) {
      throw new ReglaViolada('TOKEN_INVALIDO');
    }
    const credencial = await this.puertos.tokens.verificar(token, 'LLEGADA');
    if (!credencial) throw new ReglaViolada('TOKEN_INVALIDO');
    const tramite = await this.cargar(credencial.tramiteId);
    if (tramite.hiloId !== credencial.hiloId ||
        (credencial.pacienteId && tramite.pacienteId !== credencial.pacienteId)) {
      throw new ReglaViolada('TOKEN_INVALIDO');
    }
    tramite.registrarLlegada(contexto);
    return this.guardar(tramite, contexto);
  }

  async cancelar(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    this.puertos.politica.exigir('cancelar', comando);
    const contexto = this.contexto(comando);
    const tramite = await this.cargar(id);
    tramite.cancelar(contexto);
    const resultado = await this.guardar(tramite, contexto);
    const reservaId = tramite.horario?.reservaId;
    if (reservaId) await this.puertos.agenda.liberar(reservaId);
    return resultado;
  }

  private async modificar(id: TramiteId, comando: ContextoComando,
    aplicar: (tramite: Tramite, contexto: ContextoOperacion) => void | Promise<void>): Promise<ResultadoComando> {
    this.puertos.politica.exigir('agendar', comando);
    const contexto = this.contexto(comando);
    const tramite = await this.cargar(id);
    await aplicar(tramite, contexto);
    return this.guardar(tramite, contexto);
  }

  private async cargar(id: TramiteId): Promise<Tramite> {
    const tramite = await this.puertos.tramites.obtener(id);
    if (!tramite) throw new NoEncontrado('tramite', id);
    return tramite;
  }

  private async guardar(tramite: Tramite, contexto: ContextoOperacion): Promise<ResultadoComando> {
    const eventos = tramite.eventosPendientes();
    await this.puertos.tramites.guardar(tramite);
    return { tramite, eventos, siguientePregunta: siguientePregunta(tramite, contexto.canal, this.puertos.registro) };
  }

  private contexto(comando: ContextoComando): ContextoOperacion {
    const { actor, canal, nivel, correlationId, idempotencyKey } = comando;
    return { actor, canal, nivelAuth: nivel, correlationId, idempotencyKey, ts: this.puertos.reloj.ahora().toISOString() };
  }

  private async contacto(valor: string, contexto: ContextoOperacion): Promise<Contacto> {
    const contacto = await this.puertos.contactos.buscar(contexto.canal, valor) ?? await this.puertos.contactos.crear({
      id: this.puertos.ids.nuevo(), canal: contexto.canal, valor, hiloId: this.puertos.ids.nuevo() as HiloId,
    });
    if (!(await this.puertos.hilos.obtener(contacto.hiloId))) {
      await this.puertos.hilos.guardar(new HiloAtencion(contacto.hiloId, contacto.id, contexto.canal));
    }
    return contacto;
  }

  private async datosElegibilidad(pacienteId: PacienteId | undefined,
    perfil: PerfilServicio | undefined): Promise<DatosElegibilidad | undefined> {
    if (!pacienteId || !perfil?.elegibilidad) return undefined;
    return this.puertos.pacientes.datosElegibilidad(pacienteId);
  }

  private cotizacion(precioCentavos: number, ts: string): Cotizacion {
    return { precioCentavos, vigenteHasta: new Date(Date.parse(ts) + 86_400_000).toISOString() };
  }
}
