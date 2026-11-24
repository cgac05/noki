import { ComandoRequestSchema, ESQUEMAS_EVENTOS_SOCKET, RUTAS_CONSULTAS, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema } from '@noki/contracts';
import type { ComandoRequest, DatosEventoSocket, MensajeBot, NombreEventoSocket, SolicitudMensajeWa } from '@noki/contracts';
import type { ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { esConsultaCompartida, validarConsulta } from '../consultas.ts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from '../consultas.ts';
import { COMANDOS_WEB_ESPERADOS, DATOS_WEB, TRAMITE_WEB_ID } from './datosWeb.ts';
import { GUION_FLUJO_A, IDS } from './guionFlujoA.ts';

export class ClienteMock implements ClienteApi {
  readonly modo = 'mock';
  private indice = 0;
  private indiceWeb = 0;
  private indiceComando = 0;
  private ayuda: MensajeBot[] = [];
  private revision = 0;
  private readonly latencia: number;
  private readonly cambios = new Set<() => void>();
  private readonly oyentes = new Map<NombreEventoSocket, Set<(dato: unknown) => void>>();

  constructor(opciones: { latenciaMs?: number } = {}) { this.latencia = opciones.latenciaMs ?? 150; }

  readonly demo = {
    ids: { hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede, tramiteWebId: TRAMITE_WEB_ID },
    paso: () => this.actual().paso,
    reiniciar: () => { this.revision++; this.indice = 0; this.indiceWeb = 0; this.indiceComando = 0; this.ayuda = []; this.avisar(); },
    alCambiar: (recibir: () => void) => { this.cambios.add(recibir); return () => { this.cambios.delete(recibir); }; },
  };

  async enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }) {
    void opciones;
    const entrada = validar(ComandoRequestSchema, comando);
    const revision = this.revision;
    await this.esperar();
    this.comprobarRevision(revision);
    if (entrada.canal === 'web') {
      const esperado = COMANDOS_WEB_ESPERADOS[this.indiceWeb];
      if (!esperado || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, esperado))) {
        throw new ErrorCliente('NO_DISPONIBLE', 'Esta acción no está incluida en la cotización de demostración.');
      }
      this.indiceWeb++;
      this.avisar();
      return validar(RespuestaComandoSchema, DATOS_WEB[this.indiceWeb]!.respuesta);
    }
    const siguiente = GUION_FLUJO_A[this.indice + 1];
    if (siguiente?.espera?.tipo === 'comandos') {
      const esperado = siguiente.espera.comandos[this.indiceComando];
      if (!esperado || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, esperado))) {
        throw new ErrorCliente('NO_DISPONIBLE', this.actual().ayuda);
      }
      this.indiceComando++;
      if (this.indiceComando < siguiente.espera.comandos.length) return validar(RespuestaComandoSchema, siguiente.espera.intermedia);
      this.indiceComando = 0;
      this.avanzar();
      return validar(RespuestaComandoSchema, this.actual().respuesta);
    }
    if (siguiente?.espera?.tipo !== 'comando' || JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, siguiente.espera.comando))) {
      throw new ErrorCliente('NO_DISPONIBLE', this.actual().ayuda);
    }
    this.avanzar();
    return validar(RespuestaComandoSchema, this.actual().respuesta);
  }

  async enviarMensajeWa(mensaje: SolicitudMensajeWa) {
    const entrada = validar(SolicitudMensajeWaSchema, mensaje);
    const revision = this.revision;
    await this.esperar();
    this.comprobarRevision(revision);
    const siguiente = GUION_FLUJO_A[this.indice + 1];
    const esperado = siguiente?.espera?.tipo === 'wa' ? siguiente.espera.mensaje : undefined;
    const coincide = esperado && entrada.waId === esperado.waId && (
      (entrada.payloadBoton !== undefined && entrada.payloadBoton === esperado.payloadBoton) ||
      (entrada.texto !== undefined && siguiente!.entradasWa?.includes(entrada.texto.trim()))
    );
    if (!coincide) {
      this.ayuda = [{ tipo: 'texto', texto: this.actual().ayuda }];
      this.avisar();
      return validar(RespuestaMensajeWaSchema, { mensajes: this.ayuda });
    }
    this.avanzar();
    return validar(RespuestaMensajeWaSchema, { mensajes: this.actual().lecturas.conversacion.mensajes });
  }

  async consultar<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N>): Promise<RespuestaConsultaCliente<N>> {
    if (esConsultaCompartida(nombre)) validar(RUTAS_CONSULTAS[nombre].parametros, parametros);
    await this.esperar();
    if (nombre === 'conversacion') return validarConsulta(nombre, { ...this.actual().lecturas.conversacion, mensajes: [...this.actual().lecturas.conversacion.mensajes, ...this.ayuda] });
    return validarConsulta(nombre, nombre === 'web' ? DATOS_WEB[this.indiceWeb]!.vista : this.actual().lecturas[nombre]);
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

  private actual() { return GUION_FLUJO_A[this.indice]!; }
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
