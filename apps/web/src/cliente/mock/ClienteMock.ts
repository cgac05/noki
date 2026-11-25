import { ComandoRequestSchema, CuerpoErrorSchema, ESQUEMAS_EVENTOS_SOCKET, RUTAS_CONSULTAS, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema } from '@noki/contracts';
import type { CitaVista, ComandoRequest, DatosEventoSocket, MensajeBot, NombreEventoSocket, SolicitudMensajeWa, TramiteVista } from '@noki/contracts';
import { CONTACTO_BETO_DEMO, CONTACTO_DEMO, type ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { esConsultaCompartida, validarConsulta } from '../consultas.ts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from '../consultas.ts';
import { COMANDOS_WEB_ESPERADOS, DATOS_WEB, TRAMITE_WEB_ID } from './datosWeb.ts';
import { GUION_FLUJO_A, IDS } from './guionFlujoA.ts';
import type { PasoFixture } from './guionFlujoA.ts';
import { GUION_FLUJO_C, IDS_FLUJO_C } from './guionFlujoC.ts';
import { IdGuionSchema } from '../demo.ts';
import type { IdGuion } from '../demo.ts';

type TramiteWeb = TramiteVista & { pacienteId?: string };

type Guiones = Record<IdGuion, { pasos: PasoFixture[]; ids: NonNullable<ClienteApi['demo']>['ids'] }>;

const pacienteBetoId = '019aff10-0000-7000-8000-000000000012';
const citaBeto: CitaVista = {
  tramite: {
    id: '019aff10-0000-7000-8000-000000000003', hiloId: '019aff10-0000-7000-8000-000000000004',
    tipo: 'AGENDAR', estado: 'CONFIRMADA', version: 1, servicioId: IDS.servicio, sedeId: IDS.sede,
  },
  servicio: 'Ultrasonido abdominal', sede: 'Tepic', zonaHoraria: 'America/Mazatlan',
  inicio: '2026-12-03T16:15:00.000Z', tokenQr: 'demo.qr.beto',
};

export class ClienteMock implements ClienteApi {
  readonly modo = 'mock';
  private indice = 0;
  private readonly hilosLlamada = new Map<string, string>();
  private readonly citasPorClave = new Map<string, ReturnType<ClienteMock['comandoWeb']>>();
  private indiceWeb = 0;
  private secuenciaWeb = 0;
  private readonly tramitesWeb = new Map<string, TramiteWeb>();
  private readonly telefonosWeb = new Map<string, string>();
  private readonly codigosWeb = new Set<string>();
  readonly sesionWebDemoHabilitada: boolean;
  private indiceComando = 0;
  private ayuda: MensajeBot[] = [];
  private revision = 0;
  private readonly latencia: number;
  private readonly cambios = new Set<() => void>();
  private readonly oyentes = new Map<NombreEventoSocket, Set<(dato: unknown) => void>>();
  private readonly guiones: Guiones;
  private guionActivo: IdGuion;
  readonly demo: NonNullable<ClienteApi['demo']>;

  constructor(opciones: { latenciaMs?: number; guiones?: Guiones; guionActivo?: IdGuion; sesionWebDemo?: boolean } = {}) {
    this.sesionWebDemoHabilitada = opciones.sesionWebDemo ?? false;
    this.latencia = opciones.latenciaMs ?? 150;
    this.guiones = opciones.guiones ?? {
      flujoA: { pasos: GUION_FLUJO_A, ids: { hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede, tramiteWebId: TRAMITE_WEB_ID } },
      flujoC: { pasos: GUION_FLUJO_C, ids: IDS_FLUJO_C },
    };
    this.guionActivo = opciones.guionActivo ?? 'flujoA';
    const ids = () => this.guiones[this.guionActivo].ids;
    this.demo = {
      get ids() { return ids(); },
      guion: () => this.guionActivo,
      elegirGuion: id => { this.guionActivo = validar(IdGuionSchema, id); this.demo.reiniciar(); },
      revision: () => this.revision,
      paso: () => this.actual().paso,
      reiniciar: () => { this.revision++; this.indice = 0; this.indiceWeb = 0; this.tramitesWeb.clear(); this.hilosLlamada.clear(); this.citasPorClave.clear(); this.telefonosWeb.clear(); this.codigosWeb.clear(); this.indiceComando = 0; this.ayuda = []; this.avisar(); },
      alCambiar: (recibir: () => void) => { this.cambios.add(recibir); return () => { this.cambios.delete(recibir); }; },
    };
  }

  async enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }) {
    void opciones;
    const entrada = validar(ComandoRequestSchema, comando);
    const revision = this.revision;
    await this.esperar();
    this.comprobarRevision(revision);
    if (entrada.canal === 'callcenter' && entrada.actor.startsWith('asesor:')
        && entrada.tipo === 'IniciarTramite' && entrada.payload.contacto) {
      const { contacto, nuevo } = entrada.payload;
      const ficha = this.actual().lecturas.fichaHilo;
      const previo: TramiteWeb | undefined = ficha.tramites.find(t => t.estado === 'COTIZADO'
        && t.tipo === entrada.payload.tipoTramite && ficha.telefonoEnmascarado === '\u2022\u2022\u2022\u2022 ' + contacto.slice(-4)
        && contacto.slice(-10) === CONTACTO_DEMO.slice(-10));
      if (nuevo) {
        const clave = opciones?.idempotencyKey;
        const repetida = clave ? this.citasPorClave.get(clave) : undefined;
        if (repetida) return repetida;
        const respuesta = this.comandoWeb(entrada, previo?.pacienteId);
        this.hilosLlamada.set(respuesta.tramite.hiloId, respuesta.tramite.id);
        if (clave) this.citasPorClave.set(clave, respuesta);
        return respuesta;
      }
      if (previo) return { ...this.actual().respuesta, tramite: previo, eventos: [] };
    }
    if (entrada.canal === 'callcenter' && entrada.tramiteId
        && [...this.hilosLlamada.values()].includes(entrada.tramiteId)) return this.comandoWeb(entrada);
    if (entrada.canal === 'web' && this.sesionWebDemoHabilitada) return this.comandoWeb(entrada);
    if (entrada.canal === 'web') {
      const esperado = COMANDOS_WEB_ESPERADOS[this.indiceWeb];
      if (!esperado || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, esperado))) {
        throw new ErrorCliente('NO_DISPONIBLE', 'Esta acción no está incluida en la cotización de demostración.');
      }
      this.indiceWeb++;
      this.avisar();
      return validar(RespuestaComandoSchema, DATOS_WEB[this.indiceWeb]!.respuesta);
    }
    const siguiente = this.guiones[this.guionActivo].pasos[this.indice + 1];
    if (siguiente?.espera?.tipo === 'comandos') {
      const esperado = siguiente.espera.comandos[this.indiceComando];
      if (!esperado || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, esperado))) {
        throw new ErrorCliente('NO_DISPONIBLE', this.actual().ayuda);
      }
      this.indiceComando++;
      if (this.indiceComando < siguiente.espera.comandos.length) return validar(RespuestaComandoSchema, siguiente.espera.intermedia);
      this.indiceComando = 0;
      this.avanzar();
      return this.responderComando();
    }
    if (siguiente?.espera?.tipo !== 'comando' || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, siguiente.espera.comando))) {
      throw new ErrorCliente('NO_DISPONIBLE', this.actual().ayuda);
    }
    this.avanzar();
    return this.responderComando();
  }

  async enviarMensajeWa(mensaje: SolicitudMensajeWa, opciones?: { idempotencyKey?: string }) {
    void opciones;
    const entrada = validar(SolicitudMensajeWaSchema, mensaje);
    const revision = this.revision;
    await this.esperar();
    this.comprobarRevision(revision);
    const siguiente = this.guiones[this.guionActivo].pasos[this.indice + 1];
    const esperado = siguiente?.espera?.tipo === 'wa' ? siguiente.espera.mensaje : undefined;
    const flow = this.actual().mensajes.find(mensaje => mensaje.tipo === 'flow');
    const flowCompleto = esperado?.flowResponse && flow?.tipo === 'flow' && entrada.flowResponse !== undefined && flow.campos.filter(campo => campo.requerido).every(campo => Boolean(entrada.flowResponse?.[campo.id]?.trim()));
    const coincide = esperado && entrada.waId === esperado.waId && (flowCompleto ||
      (entrada.payloadBoton !== undefined && entrada.payloadBoton === esperado.payloadBoton) ||
      (entrada.texto !== undefined && (entrada.texto === esperado.texto || siguiente!.entradasWa?.includes(entrada.texto.trim())))
    );
    if (!coincide) {
      this.ayuda = [{ tipo: 'texto', texto: this.actual().ayuda }];
      this.avisar();
      return validar(RespuestaMensajeWaSchema, { mensajes: this.ayuda });
    }
    this.avanzar();
    return validar(RespuestaMensajeWaSchema, { mensajes: this.actual().mensajes });
  }

  async consultar<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N>): Promise<RespuestaConsultaCliente<N>> {
    if (esConsultaCompartida(nombre)) validar(RUTAS_CONSULTAS[nombre].parametros, parametros);
    await this.esperar();
    if (nombre === 'sesionWebDemo') {
      const { telefono } = validar(RUTAS_CONSULTAS.sesionWebDemo.parametros, parametros);
      if (!this.sesionWebDemoHabilitada) throw new ErrorCliente('NO_DISPONIBLE', 'La sesión solo está disponible en modo demo.');
      const numero = telefono.slice(-10);
      const esAna = numero === CONTACTO_DEMO.slice(-10);
      const esBeto = numero === CONTACTO_BETO_DEMO.slice(-10);
      const delGuion = esAna ? this.actual().lecturas.tramitesAbiertos : [];
      const propios = [...this.tramitesWeb.values()].filter(t => this.telefonosWeb.get(t.id) === numero);
      const tramitesEnProceso = [...delGuion, ...propios].filter(t => t.tipo === 'AGENDAR' &&
        (t.estado === 'BORRADOR' || t.estado === 'COTIZADO' || t.estado === 'LISTO_PARA_RESERVAR' || t.estado === 'HORARIO_RESERVADO'));
      if (!esAna && !esBeto && !tramitesEnProceso.length) throw new ErrorCliente('API', 'Sin registro.', 'NO_ENCONTRADO');
      return validarConsulta(nombre, {
        pacienteId: esAna ? this.demo.ids.pacienteId : esBeto ? pacienteBetoId : null,
        nombreVisible: esAna ? 'Ana P.' : esBeto ? 'Beto R.' : null,
        tramitesEnProceso,
      });
    }
    const lecturas = this.actual().lecturas;
    if (this.sesionWebDemoHabilitada && nombre === 'citasPaciente') {
      const { pacienteId } = validar(RUTAS_CONSULTAS.citasPaciente.parametros, parametros);
      if (pacienteId === pacienteBetoId) {
        const adelantada = this.actual().paso.id === 'C_ADELANTADA';
        return validarConsulta(nombre, [{ ...citaBeto, inicio: adelantada ? '2026-11-26T16:15:00.000Z' : citaBeto.inicio }]);
      }
      return validarConsulta(nombre, pacienteId === this.demo.ids.pacienteId ? lecturas.citasPaciente : []);
    }
    if (this.sesionWebDemoHabilitada && nombre === 'tramitesAbiertos') {
      const { pacienteId } = validar(RUTAS_CONSULTAS.tramitesAbiertos.parametros, parametros);
      const delGuion = pacienteId === this.demo.ids.pacienteId ? lecturas.tramitesAbiertos : [];
      return validarConsulta(nombre, [...delGuion, ...[...this.tramitesWeb.values()].filter(t => t.pacienteId === pacienteId)]);
    }
    if (nombre === 'fechaNacimientoLlamada') {
      const { hiloId } = validar(RUTAS_CONSULTAS.fechaNacimientoLlamada.parametros, parametros);
      const id = this.hilosLlamada.get(hiloId);
      const tramite: TramiteWeb | undefined = id ? this.tramitesWeb.get(id)
        : lecturas.fichaHilo.hiloId === hiloId ? lecturas.fichaHilo.tramites[0] : undefined;
      return validarConsulta(nombre, { fechaNacimiento: tramite?.pacienteId === IDS.paciente ? '1990-01-01' : null });
    }
    if (nombre === 'fichaHilo') {
      const { hiloId } = validar(RUTAS_CONSULTAS.fichaHilo.parametros, parametros);
      const id = this.hilosLlamada.get(hiloId);
      const tramite = id && this.tramitesWeb.get(id);
      if (tramite) return validarConsulta(nombre, {
        hiloId, nombrePila: tramite.pacienteId ? lecturas.fichaHilo.nombrePila : null,
        telefonoEnmascarado: '\u2022\u2022\u2022\u2022 ' + this.telefonosWeb.get(tramite.id)?.slice(-4),
        tramites: [tramite], lineaTiempo: [], soloLectura: false,
        oferta: lecturas.catalogo.find(o => o.servicioId === tramite.servicioId && o.sedeId === tramite.sedeId) ?? null,
        codigoContinuacion: this.codigosWeb.has(hiloId) ? 'CONTINUAR ' + IDS.tokenContinuacion : null,
      });
    }
    if (this.sesionWebDemoHabilitada && nombre === 'fichaHilo') {
      const { hiloId } = validar(RUTAS_CONSULTAS.fichaHilo.parametros, parametros);
      if (this.codigosWeb.has(hiloId)) return validarConsulta(nombre, {
        ...lecturas.fichaHilo, hiloId,
        tramites: [...lecturas.tramitesAbiertos, ...this.tramitesWeb.values()].filter(t => t.hiloId === hiloId),
        codigoContinuacion: DATOS_WEB[2]?.vista.cotizacion?.codigoContinuacion ?? null,
      });
    }
    return validarConsulta(nombre, nombre === 'web' ? DATOS_WEB[this.indiceWeb]!.vista : lecturas[nombre as keyof typeof lecturas]);
  }

  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void {
    const validarYRecibir = (dato: unknown) => {
      const esquema = ESQUEMAS_EVENTOS_SOCKET[nombre];
      recibir(validar(esquema, dato) as DatosEventoSocket[N]);
    };
    const oyentes = this.oyentes.get(nombre) ?? new Set();
    oyentes.add(validarYRecibir);
    this.oyentes.set(nombre, oyentes);
    return () => { oyentes.delete(validarYRecibir); };
  }

  unirse(sala: string): () => void { void sala; return () => {}; }

  private comandoWeb(comando: ComandoRequest, pacienteId?: string) {
    const previo = comando.tramiteId && (this.tramitesWeb.get(comando.tramiteId)
      ?? this.actual().lecturas.tramitesAbiertos.find(t => t.id === comando.tramiteId));
    let tramite: TramiteWeb;
    if (comando.tipo === 'IniciarTramite') {
      const sufijo = (++this.secuenciaWeb).toString().padStart(12, '0');
      tramite = { id: '019aff30-0000-7000-8000-' + sufijo, hiloId: '019aff30-0001-7000-8000-' + sufijo,
        tipo: comando.payload.tipoTramite, estado: 'BORRADOR', version: 1, ...(pacienteId ? { pacienteId } : {}) };
      if (comando.payload.contacto) this.telefonosWeb.set(tramite.id, comando.payload.contacto.slice(-10));
    } else {
      if (!previo) throw new ErrorCliente('API', 'No encontramos el trámite.', 'NO_ENCONTRADO');
      tramite = { ...previo, version: previo.version + 1 };
      switch (comando.tipo) {
        case 'AsignarPaciente': tramite.pacienteId = comando.payload.pacienteId; break;
        case 'SeleccionarServicio': tramite.servicioId = comando.payload.servicioId; break;
        case 'SeleccionarSede':
          tramite.sedeId = comando.payload.sedeId;
          tramite.estado = 'COTIZADO';
          break;
        case 'SolicitarContinuacion': this.codigosWeb.add(tramite.hiloId); break;
        default: throw new ErrorCliente('NO_DISPONIBLE', 'Esta acción no está disponible en la sesión web de demo.');
      }
    }
    if (!previo || this.tramitesWeb.has(tramite.id)) this.tramitesWeb.set(tramite.id, tramite);
    this.avisar();
    const eventos = comando.canal === 'callcenter' && comando.tipo === 'IniciarTramite'
      ? [
          { id: tramite.id, tipo: 'TramiteIniciado', canal: 'callcenter', ts: '2026-11-24T15:00:00.000Z' },
          ...(pacienteId ? [{ id: tramite.hiloId, tipo: 'PacienteAsignado', canal: 'callcenter', ts: '2026-11-24T15:00:00.000Z' }] : []),
        ] : [];
    return validar(RespuestaComandoSchema, { tramite, siguientePregunta: { tipo: 'COMPLETO' }, eventos });
  }

  private actual() { return this.guiones[this.guionActivo].pasos[this.indice]!; }
  private responderComando() {
    const rechazo = this.actual().rechazo;
    if (rechazo) {
      const { error } = validar(CuerpoErrorSchema, { error: rechazo });
      throw new ErrorCliente('API', error.mensaje, error.codigo);
    }
    return validar(RespuestaComandoSchema, this.actual().respuesta);
  }
  private comprobarRevision(revision: number) {
    if (revision !== this.revision) throw new ErrorCliente('NO_DISPONIBLE', 'El guion se reinició. Vuelve a elegir una acción.');
  }
  private avisar() { this.cambios.forEach(recibir => recibir()); }
  private async esperar() { if (this.latencia > 0) await new Promise<void>(resolver => setTimeout(resolver, this.latencia)); }
  private avanzar() {
    this.indice++;
    this.ayuda = [];
    for (const evento of this.actual().eventosSocket) {
      const dato = validar(ESQUEMAS_EVENTOS_SOCKET[evento.nombre], evento.datos);
      this.oyentes.get(evento.nombre)?.forEach(recibir => recibir(dato));
    }
    this.avisar();
  }
}
