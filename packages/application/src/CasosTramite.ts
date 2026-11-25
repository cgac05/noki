import {
  ConflictoVersion, HiloAtencion, NoEncontrado, ReglaViolada, StepUpRequerido, TransicionInvalida, siguientePregunta,
  coincideNombreCurp, curpBase, enmascararNombre, normalizarTelefono, validarCurp, VIGENCIA_VINCULO_DIAS,
  type EntidadNacimiento, type MetodoVinculo,
  type ContextoIdentidad, type ContextoOperacion, type Cotizacion, type DatosElegibilidad,
  type EventoDominio, type HiloId, type PacienteId, type PerfilServicio, type PoliticaIdentidad,
  type RecursoId, type RegistroTiposTramite, type ReservaId, type SedeId, type ServicioId,
  type SiguientePreguntaDominio, type TipoTramite, Tramite, type TramiteId,
} from '@noki/domain';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { Reloj } from './ports/Reloj.ts';
import type {
  AgendaExternaPort, AgendaPort, CatalogoPort, Contacto, ContactosPort, DatosRegistroPaciente, HiloRepo, PacientesPort, RegistroIntentos, TramiteRepo, VerificadorTokens,
} from './ports/nucleo.ts';
import type { EntradaContinuidad, ResolvedorContinuidad, ResultadoContinuidad } from './ResolvedorContinuidad.ts';

export interface ContextoComando extends ContextoIdentidad {
  pacienteId?: PacienteId;
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
  agendaExterna: AgendaExternaPort;
  solicitarAprobacion?: (tramite: Tramite) => Promise<void>;
  registrarError?: (datos: { correlation_id: string; codigo: string }) => void;
  reloj: Reloj;
  ids: GeneradorId;
  politica: PoliticaIdentidad;
  registro: RegistroTiposTramite;
  resolvedor: ResolvedorContinuidad;
  intentos: RegistroIntentos;
  curpFlexible?: boolean;
}

type DatosIdentificacion = {
  paso: 'DATOS';
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | undefined;
  fechaNac?: string | undefined;
  sexo?: DatosElegibilidad['sexo'] | undefined;
  entidadNacimiento?: EntidadNacimiento | undefined;
};

export type IdentificarPacientePayload =
  | { paso: 'DESTINATARIO'; para: 'MI' | 'OTRA_PERSONA' }
  | { paso: 'CONFIRMAR'; candidato: string | null }
  | { paso: 'FECHA_NAC'; fechaNac: string }
  | { paso: 'CURP'; curp: string | null }
  | DatosIdentificacion
  | { paso: 'REINICIAR' };

export class CasosTramite {
  constructor(private readonly puertos: Dependencias) {}

  async iniciar(tipo: TipoTramite, valorContacto: string, comando: ContextoComando): Promise<ResultadoComando> {
    this.puertos.politica.exigir('agendar', comando);
    this.puertos.registro.obtener(tipo);
    const contexto = this.contexto(comando);
    const contacto = await this.contacto(valorContacto, contexto);
    if (contexto.canal === 'callcenter' && contexto.actor.startsWith('asesor:') && /^\+?\d{10,15}$/u.test(valorContacto)) {
      const enProceso = await (await this.tramitesEnProcesoPorTelefono(valorContacto, tipo))[0];
      if (enProceso) {
        return this.retomarEnProceso(enProceso, contexto, 'LLAMADA_CC');
      }
    }
    const hilo = await this.puertos.hilos.obtener(contacto.hiloId);
    const tramite = Tramite.iniciar(this.puertos.ids.nuevo() as TramiteId, contacto.hiloId,
      tipo, this.puertos.registro, contexto);
    const resultado = await this.guardar(tramite, contexto);
    if (hilo && hilo.ultimoCanal !== contexto.canal) {
      hilo.atenderEn(contexto.canal);
      await this.puertos.hilos.guardar(hilo);
    }
    return resultado;
  }

  async tramitesEnProcesoPorTelefono(numero: string, tipo: TipoTramite = 'AGENDAR'): Promise<Tramite[]> {
    const hilos = await this.puertos.contactos.hilosPorTelefono(numero.slice(-10));
    const abiertos = await Promise.all(hilos.map(id => this.puertos.tramites.abiertosPorHilo(id)));
    return abiertos.flat()
      .filter(tramite => tramite.tipo === tipo && (
        tramite.estado === 'BORRADOR' || tramite.estado === 'COTIZADO'
        || tramite.estado === 'LISTO_PARA_RESERVAR' || tramite.estado === 'HORARIO_RESERVADO'
      ))
      .sort((a, b) => Number(a.estado === 'BORRADOR') - Number(b.estado === 'BORRADOR')
        || Date.parse(b.ultimaActividad) - Date.parse(a.ultimaActividad) || b.id.localeCompare(a.id));
  }

  async retomarPorTelefono(numero: string, comando: ContextoComando): Promise<ResultadoRetomar | null> {
    const contexto = this.contexto({ ...comando, nivel: 1 });
    const contacto = await this.contacto(numero, contexto);
    const hasta = await this.puertos.intentos.bloqueo(contacto.id, contexto.ts);
    if (hasta) return { tipo: 'BLOQUEADO', hasta };
    const [tramite] = await this.tramitesEnProcesoPorTelefono(numero);
    if (!tramite) return null;
    const operacion = await this.retomarEnProceso(tramite, contexto, 'MISMO_NUMERO');
    await this.puertos.intentos.reiniciar(contacto.id);
    return { tipo: 'RETOMADO', nivel: 1, operacion };
  }

  private async retomarEnProceso(tramite: Tramite, contexto: ContextoOperacion,
    metodo: 'LLAMADA_CC' | 'MISMO_NUMERO'): Promise<ResultadoComando> {
    const hilo = await this.puertos.hilos.obtener(tramite.hiloId);
    if (!hilo) throw new NoEncontrado('hilo', tramite.hiloId);
    tramite.retomar(contexto, metodo);
    const resultado = await this.guardar(tramite, contexto);
    if (hilo.ultimoCanal !== contexto.canal) {
      hilo.atenderEn(contexto.canal);
      await this.puertos.hilos.guardar(hilo);
    }
    return resultado;
  }

  async solicitarContinuacion(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    const esAsesor = comando.canal === 'callcenter' && comando.actor.startsWith('asesor:');
    const esPacienteWeb = comando.canal === 'web' && comando.actor === 'paciente';
    if (!esAsesor && !esPacienteWeb) {
      throw new ReglaViolada('CONTINUACION_SOLO_ASESOR');
    }
    return this.modificar(id, comando, (tramite, contexto) =>
      tramite.consentirContactoWa(this.puertos.ids.nuevo(), contexto));
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
    if (comando.actor === 'paciente') throw new ReglaViolada('ASIGNACION_SOLO_PERSONAL');
    return this.modificar(id, comando, async (tramite, contexto) => {
      const datos = await this.datosElegibilidad(pacienteId, tramite.perfil);
      tramite.asignarPaciente(pacienteId, contexto, datos);
    });
  }

  async identificarPaciente(id: TramiteId, payload: IdentificarPacientePayload, valorContacto: string,
    comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, async (tramite, contexto) => {
      if (payload.paso === 'REINICIAR') {
        tramite.reiniciarIdentificacion();
        return;
      }
      tramite.exigirPasoIdentificacion(payload.paso);
      switch (payload.paso) {
        case 'DESTINATARIO': {
          const numero = payload.para === 'MI' ? normalizarTelefono(valorContacto) : undefined;
          const desde = Date.parse(contexto.ts) - VIGENCIA_VINCULO_DIAS * 86_400_000;
          const pacientes = numero ? await this.puertos.contactos.pacientesPorTelefono(numero, desde) : [];
          tramite.declararDestinatario(payload.para === 'MI' ? 'TITULAR' : 'FAMILIAR',
            pacientes.slice(0, 9).map(({ pacienteId, nombre, apellidoPaterno }) => ({
              ref: this.puertos.ids.nuevo(), pacienteId, nombreVisible: enmascararNombre(nombre, apellidoPaterno),
            })), contexto);
          return;
        }
        case 'CONFIRMAR':
          tramite.elegirCandidato(payload.candidato);
          return;
        case 'FECHA_NAC':
          return this.identificarFecha(tramite, payload.fechaNac, valorContacto, contexto);
        case 'CURP':
          return this.identificarCurp(tramite, payload.curp, valorContacto, contexto);
        case 'DATOS':
          return this.identificarDatos(tramite, payload, valorContacto, contexto);
      }
    });
  }

  private async identificarFecha(tramite: Tramite, fecha: string, valor: string, contexto: ContextoOperacion): Promise<void> {
    const estado = tramite.identificacion;
    const elegido = estado?.candidatos?.find(({ ref }) => ref === estado.elegido);
    if (!elegido) {
      tramite.guardarFechaNac(fecha);
      return;
    }
    const contacto = await this.contacto(valor, contexto);
    const hasta = await this.puertos.intentos.bloqueo(contacto.id, contexto.ts);
    if (hasta) throw new ReglaViolada('IDENTIFICACION_BLOQUEADA', { hasta });
    if (!(await this.puertos.pacientes.coincideFechaNac(elegido.pacienteId, fecha))) {
      const { intentos } = await this.puertos.intentos.fallar(contacto.id, contexto.ts);
      tramite.rechazarFechaCandidato(intentos, contexto);
      return;
    }
    await this.asignarIdentificado(tramite, elegido.pacienteId, contacto, contexto, 'TELEFONO_FECHA_NAC');
    await this.puertos.intentos.reiniciar(contacto.id);
  }

  private async identificarCurp(tramite: Tramite, curp: string | null, valor: string,
    contexto: ContextoOperacion): Promise<void> {
    if (curp === null) {
      tramite.marcarSinCurp();
      return;
    }
    const datos = validarCurp(curp);
    const fechaDeclarada = tramite.identificacion?.fechaNac;
    if (!datos || (fechaDeclarada && fechaDeclarada !== datos.fechaNac)) {
      if (!this.puertos.curpFlexible) throw new ReglaViolada(datos ? 'CURP_NO_COINCIDE' : 'CURP_INVALIDA');
      tramite.marcarSinCurp();
      return;
    }
    const pacientes = this.puertos.pacientes;
    let pacienteId = await pacientes.buscarPorCurp(curp);
    if (!pacienteId) {
      const encontrados = await pacientes.buscarPorCurpBase(curp.slice(0, 16));
      if (encontrados.length > 1) throw new ReglaViolada('IDENTIDAD_AMBIGUA');
      const porBase = encontrados[0];
      if (porBase) {
        pacienteId = await pacientes.completarCurp(porBase, curp) ? porBase : await pacientes.buscarPorCurp(curp);
        if (!pacienteId) throw new ReglaViolada('IDENTIDAD_AMBIGUA');
      }
    }
    if (!pacienteId) {
      tramite.guardarCurp(curp);
      return;
    }
    await this.asignarIdentificado(tramite, pacienteId, await this.contacto(valor, contexto), contexto, 'FLOW_DECLARADO');
  }

  private async identificarDatos(tramite: Tramite, payload: DatosIdentificacion, valor: string,
    contexto: ContextoOperacion): Promise<void> {
    const { nombre, apellidoPaterno, apellidoMaterno } = payload;
    const nombres = { nombre, apellidoPaterno, ...(apellidoMaterno ? { apellidoMaterno } : {}) };
    const estado = tramite.identificacion;
    let curp = estado?.curp;
    const nacimiento = curp ? validarCurp(curp) : {
      fechaNac: estado?.fechaNac ?? payload.fechaNac, sexo: payload.sexo, entidadNacimiento: payload.entidadNacimiento,
    };
    if (!nacimiento?.fechaNac || !nacimiento.sexo || !nacimiento.entidadNacimiento) {
      throw new ReglaViolada('DATOS_IDENTIFICACION_INCOMPLETOS');
    }
    if (curp && !coincideNombreCurp(curp, nombres)) {
      if (!this.puertos.curpFlexible) throw new ReglaViolada('CURP_NO_COINCIDE');
      curp = undefined;
    }
    const datos = { ...nombres, fechaNac: nacimiento.fechaNac, sexo: nacimiento.sexo,
      entidadNacimiento: nacimiento.entidadNacimiento };
    const base = curpBase(datos);
    const registro: DatosRegistroPaciente = { ...datos, ...(curp ? { curp } : {}), ...(base ? { curpBase: base } : {}) };
    const pacientes = this.puertos.pacientes;
    const coincidencias = await pacientes.buscarPorDatos(datos);
    if (coincidencias.length > 1) throw new ReglaViolada('IDENTIDAD_AMBIGUA');
    let pacienteId = coincidencias[0];
    if (pacienteId) {
      const baseExistente = await pacientes.baseDe(pacienteId);
      if (baseExistente && baseExistente !== base) pacienteId = undefined;
    }
    let registrado = false;
    if (!pacienteId) {
      pacienteId = this.puertos.ids.nuevo() as PacienteId;
      registrado = await pacientes.registrar(pacienteId, registro);
      if (!registrado) {
        pacienteId = curp ? await pacientes.buscarPorCurp(curp) : undefined;
        if (!pacienteId) throw new ReglaViolada('IDENTIDAD_AMBIGUA');
      }
    }
    await this.asignarIdentificado(tramite, pacienteId, await this.contacto(valor, contexto), contexto,
      'FLOW_DECLARADO', registrado);
  }

  private async asignarIdentificado(tramite: Tramite, pacienteId: PacienteId, contacto: Contacto,
    contexto: ContextoOperacion, metodo: Extract<MetodoVinculo, 'FLOW_DECLARADO' | 'TELEFONO_FECHA_NAC'>,
    registrado = false): Promise<void> {
    const relacion = tramite.identificacion?.relacion ?? 'TITULAR';
    const nivel = metodo === 'TELEFONO_FECHA_NAC' ? 1 : 0;
    const datos = await this.datosElegibilidad(pacienteId, tramite.perfil);
    const evento = registrado ? { tipo: 'PacienteRegistrado', payload: { pacienteId } } as const
      : nivel === 1 ? { tipo: 'IdentidadComprobada', payload: { pacienteId, metodo } } as const : undefined;
    tramite.asignarPaciente(pacienteId, { ...contexto, nivelAuth: nivel }, datos, evento);
    await this.puertos.contactos.vincular(contacto.id, { pacienteId, relacion, metodo, nivel, ultimoUso: contexto.ts });
  }

  async cumplirRequisito(id: TramiteId, requisito: PerfilServicio['requisitos'][number]['tipo'],
    comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, (tramite, contexto) => tramite.cumplirRequisito(requisito, contexto));
  }

  async aceptarPreparacion(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, (tramite, contexto) => tramite.aceptarPreparacion(contexto));
  }

  async reconocerElegibilidad(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    return this.modificar(id, comando, (tramite, contexto) => tramite.reconocerElegibilidad(contexto));
  }

  async reservar(id: TramiteId, inicio: string, comando: ContextoComando, recursoId?: RecursoId): Promise<ResultadoComando> {
    this.puertos.politica.exigir('agendar', comando);
    const contexto = this.contexto(comando);
    const tramite = await this.cargar(id);
    tramite.validarApartar();
    const { sedeId, servicioId, perfil } = tramite;
    if (!sedeId || !servicioId || !perfil) throw new TransicionInvalida(tramite.estado, 'apartar');
    const reserva = await this.puertos.agenda.apartar({
      inicio, sedeId, servicioId, tramiteId: id, ts: contexto.ts, ttlReservaMin: perfil.ttlReservaMin,
      reservaId: this.puertos.ids.nuevo() as ReservaId,
      ...(recursoId ? { recursoId } : {}),
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
    this.puertos.politica.exigir('agendar', comando);
    const contexto = this.contexto(comando);
    const tramite = await this.cargar(id);
    const { horario, sedeId, servicioId } = tramite;
    if (tramite.estado !== 'HORARIO_RESERVADO' || !horario || !sedeId || !servicioId) {
      throw new TransicionInvalida(tramite.estado, 'confirmar');
    }
    const { reservaId, inicio, expiraEn } = horario;
    if (Date.parse(expiraEn) <= Date.parse(contexto.ts)) {
      tramite.expirarHold(contexto);
      await this.guardar(tramite, contexto);
      await this.compensar(contexto, () => this.puertos.agenda.liberar(reservaId));
      throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
    }
    const folio = await this.puertos.agendaExterna.registrarCita({ reservaId, sedeId, servicioId, inicio }, contexto.correlationId);
    try {
      await this.puertos.agenda.confirmar(reservaId, folio, this.puertos.reloj.ahora().toISOString());
    } catch (error) {
      await this.compensar(contexto, () => this.puertos.agendaExterna.cancelarCita(folio, contexto.correlationId));
      throw error;
    }
    try {
      tramite.confirmar(folio, contexto);
      return await this.guardar(tramite, contexto);
    } catch (error) {
      if (error instanceof ConflictoVersion) {
        await this.compensar(contexto, async () => {
          const actual = await this.puertos.tramites.obtener(id);
          if (actual?.estado === 'CONFIRMADA' && actual.folio === folio) return;
          await this.compensar(contexto, () => this.puertos.agendaExterna.cancelarCita(folio, contexto.correlationId));
          await this.puertos.agenda.liberar(reservaId);
        });
      }
      throw error;
    }
  }

  private async compensar(contexto: ContextoOperacion, operacion: () => Promise<void>): Promise<void> {
    try { await operacion(); }
    catch { this.puertos.registrarError?.({ correlation_id: contexto.correlationId, codigo: 'COMPENSACION_AGENDA_FALLIDA' }); }
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
        pacienteId, metodo, relacion: 'TITULAR', nivel: resultado.nivel, ultimoUso: operacion.ts,
      });
    }
    return { tipo: 'RETOMADO', nivel: resultado.nivel, operacion: guardado };
  }

  async registrarLlegada(token: string, comando: ContextoComando, esperado?: TramiteId): Promise<ResultadoComando> {
    const contexto = this.contexto(comando);
    if (contexto.canal !== 'clinica' || !contexto.actor.startsWith('recepcion:')) {
      throw new ReglaViolada('TOKEN_INVALIDO');
    }
    const credencial = await this.puertos.tokens.verificar(token, 'LLEGADA');
    if (!credencial || (esperado && credencial.tramiteId !== esperado)) throw new ReglaViolada('TOKEN_INVALIDO');
    const tramite = await this.cargar(credencial.tramiteId);
    if (tramite.hiloId !== credencial.hiloId ||
        (credencial.pacienteId && tramite.pacienteId !== credencial.pacienteId)) {
      throw new ReglaViolada('TOKEN_INVALIDO');
    }
    tramite.registrarLlegada(contexto);
    return this.guardar(tramite, contexto);
  }

  async cerrarAtencion(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    const contexto = this.contexto(comando);
    if (contexto.canal !== 'clinica' || !contexto.actor.startsWith('recepcion:')) {
      throw new ReglaViolada('SOLO_RECEPCION');
    }
    const tramite = await this.cargar(id);
    const fila = tramite.estado === 'EN_CLINICA' && tramite.sedeId
      ? await this.puertos.tramites.filaSede(tramite.sedeId, contexto.ts)
      : [];
    tramite.cerrarAtencion(contexto);
    const resultado = await this.guardar(tramite, contexto);
    const indice = fila.indexOf(id);
    if (indice < 0) return resultado;
    for (const [desplazamiento, siguiente] of fila.slice(indice + 1).entries()) {
      try {
        const pendiente = await this.cargar(siguiente);
        pendiente.actualizarTurno(indice + desplazamiento + 1, {
          ...contexto, idempotencyKey: this.puertos.ids.nuevo(),
        });
        await this.puertos.tramites.guardar(pendiente);
      } catch {
        this.puertos.registrarError?.({ codigo: 'TURNO_NO_ACTUALIZADO', correlation_id: contexto.correlationId });
      }
    }
    return resultado;
  }

  async cancelar(id: TramiteId, comando: ContextoComando): Promise<ResultadoComando> {
    try {
      this.puertos.politica.exigir('cancelar', comando);
    } catch (error) {
      const solicitar = this.puertos.solicitarAprobacion;
      if (!solicitar || !(error instanceof StepUpRequerido) || !error.factores.includes('BOTON_APROBACION')) throw error;
      const tramite = await this.puertos.tramites.obtener(id);
      if (tramite) await solicitar(tramite);
      throw new StepUpRequerido(0, ['BOTON_APROBACION']);
    }
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
