import { z } from 'zod';
import { io } from 'socket.io-client';
import {
  AdelantarRelojSchema, RespuestaRelojSchema, RUTA_RELOJ_DEMO, ComandoRequestSchema, CuerpoErrorSchema, RUTAS_CONSULTAS, rutaConsulta, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema, SalaSchema, EVENTOS_CLIENTE_SOCKET, ESQUEMAS_EVENTOS_SOCKET,
} from '@noki/contracts';
import type { ComandoRequest, DatosEventoSocket, NombreConsulta, NombreEventoSocket, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa } from '@noki/contracts';
import type { ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { esConsultaCompartida, validarConsulta } from '../consultas.ts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from '../consultas.ts';

export interface SocketCliente {
  readonly connected: boolean;
  on(nombre: string, recibir: (dato?: unknown) => void): unknown;
  off(nombre: string, recibir: (dato?: unknown) => void): unknown;
  emit(nombre: string, dato: string): unknown;
  connect(): unknown;
  disconnect(): unknown;
}
type FabricaSocket = (url: string, opciones: { transports: ['websocket']; autoConnect: false }) => SocketCliente;

export class ClienteReal implements ClienteApi {
  readonly modo = 'real';
  readonly relojDemo?: NonNullable<ClienteApi['relojDemo']>;
  private readonly url: string;
  private readonly peticion: typeof fetch;
  private readonly demoHabilitada: boolean;
  get sesionWebDemoHabilitada() { return this.demoHabilitada; }
  private readonly fabricaSocket: FabricaSocket;
  private socket: SocketCliente | undefined;
  private readonly salas = new Map<string, number>();
  private suscripciones = 0;
  private readonly reunir = () => {
    for (const sala of this.salas.keys()) this.socket?.emit(EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, sala);
  };

  constructor(opciones: { url?: string; fetch?: typeof fetch; demo?: boolean; fabricaSocket?: FabricaSocket } = {}) {
    this.url = (opciones.url ?? 'http://localhost:4000').replace(/\/$/, '');
    this.peticion = opciones.fetch ?? globalThis.fetch.bind(globalThis);
    this.demoHabilitada = opciones.demo ?? false;
    if (this.demoHabilitada) this.relojDemo = { adelantar: async minutos => {
      const cuerpo = validar(AdelantarRelojSchema, { adelantarMinutos: minutos });
      return validar(RespuestaRelojSchema, await this.solicitar(RUTA_RELOJ_DEMO.ruta, cuerpo, undefined, false));
    } };
    this.fabricaSocket = opciones.fabricaSocket ?? io;
  }

  async enviarComando(comando: ComandoRequest, opciones: { idempotencyKey?: string } = {}): Promise<RespuestaComando> {
    const cuerpo = validar(ComandoRequestSchema, comando);
    const clave = validar(z.uuid(), opciones.idempotencyKey ?? crypto.randomUUID());
    return validar(RespuestaComandoSchema, await this.solicitar('/api/comandos', cuerpo, clave));
  }

  async enviarMensajeWa(mensaje: SolicitudMensajeWa, opciones: { idempotencyKey?: string } = {}): Promise<RespuestaMensajeWa> {
    const cuerpo = validar(SolicitudMensajeWaSchema, mensaje);
    const clave = validar(z.uuid(), opciones.idempotencyKey ?? crypto.randomUUID());
    return validar(RespuestaMensajeWaSchema, await this.solicitar('/api/canales/wa/mensajes', cuerpo, clave));
  }

  async consultar<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N>): Promise<RespuestaConsultaCliente<N>> {
    if (!esConsultaCompartida(nombre)) {
      throw new ErrorCliente('NO_DISPONIBLE', 'Esta consulta aún no está disponible en la API. Usa el modo mock para recorrer la demo.');
    }
    const definicion = RUTAS_CONSULTAS[nombre];
    if ('soloDemo' in definicion && definicion.soloDemo && !this.demoHabilitada) {
      throw new ErrorCliente('NO_DISPONIBLE', 'Esta consulta solo está disponible con VITE_DEMO=true.');
    }
    // Convierte un parámetro inválido en el mismo error público de contrato, antes de acceder a la red.
    const parametrosValidados = validar(definicion.parametros, parametros);
    const ruta = rutaConsulta<NombreConsulta>(nombre, parametrosValidados);
    return validarConsulta(nombre, await this.solicitar(ruta));
  }

  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void {
    const socket = this.conectar();
    const validarYRecibir = (dato: unknown) => {
      const resultado = ESQUEMAS_EVENTOS_SOCKET[nombre].safeParse(dato);
      if (resultado.success) recibir(resultado.data as DatosEventoSocket[N]);
    };
    socket.on(nombre, validarYRecibir);
    this.suscripciones++;
    let activa = true;
    return () => {
      if (!activa) return;
      activa = false; socket.off(nombre, validarYRecibir); this.suscripciones--; this.liberar();
    };
  }

  unirse(sala: string): () => void {
    const valida = validar(SalaSchema, sala);
    const referencias = this.salas.get(valida) ?? 0;
    this.salas.set(valida, referencias + 1);
    const existente = this.socket;
    const socket = this.conectar();
    if (referencias === 0 && existente?.connected) socket.emit(EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, valida);
    let activa = true;
    return () => {
      if (!activa) return;
      activa = false;
      const restantes = this.salas.get(valida)! - 1;
      if (restantes > 0) this.salas.set(valida, restantes);
      else {
        this.salas.delete(valida);
        if (socket.connected) socket.emit(EVENTOS_CLIENTE_SOCKET.SALA_SALIR, valida);
      }
      this.liberar();
    };
  }

  private conectar(): SocketCliente {
    if (!this.socket) {
      this.socket = this.fabricaSocket(this.url, { transports: ['websocket'], autoConnect: false });
      this.socket.on('connect', this.reunir);
      this.socket.connect();
    }
    return this.socket;
  }

  private liberar() {
    if (this.salas.size === 0 && this.suscripciones === 0 && this.socket) {
      this.socket.off('connect', this.reunir); this.socket.disconnect(); this.socket = undefined;
    }
  }

  private async solicitar(ruta: string, cuerpo?: unknown, clave?: string, reintentar = true): Promise<unknown> {
    const opciones: RequestInit = cuerpo === undefined
      ? { method: 'GET' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', ...(clave ? { 'Idempotency-Key': clave } : {}) }, body: JSON.stringify(cuerpo) };
    let respuesta: Response | undefined;
    const intentos = reintentar ? 2 : 1;
    for (let intento = 0; intento < intentos; intento++) {
      try {
        respuesta = await this.peticion(`${this.url}${ruta}`, opciones);
        break;
      } catch {
        if (intento === intentos - 1) throw new ErrorCliente('RED', 'No pudimos conectar con la API. Comprueba que esté encendida e intenta de nuevo.');
      }
    }
    let dato: unknown;
    try { dato = await respuesta!.json(); } catch {
      throw new ErrorCliente('CONTRATO', 'La API devolvió una respuesta que no podemos leer. Intenta de nuevo.');
    }
    if (!respuesta!.ok) {
      const { error } = validar(CuerpoErrorSchema, dato);
      throw new ErrorCliente('API', error.mensaje, error.codigo);
    }
    return dato;
  }
}
