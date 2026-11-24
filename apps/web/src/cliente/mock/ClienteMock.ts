import { ComandoRequestSchema, ESQUEMAS_EVENTOS_SOCKET, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema } from '@noki/contracts';
import type { ComandoRequest, DatosEventoSocket, MensajeBot, NombreEventoSocket, SolicitudMensajeWa } from '@noki/contracts';
import type { ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { validarConsulta } from '../provisional.ts';
import type { ConsultasProvisionales, ParametrosConsulta } from '../provisional.ts';
import { DATOS_WEB } from './datosWeb.ts';
import { GUION_FLUJO_A } from './guionFlujoA.ts';

export class ClienteMock implements ClienteApi {
  readonly modo = 'mock';
  private indice = 0;
  private indiceWeb = 0;
  private ayuda: MensajeBot[] = [];
  private revision = 0;
  private readonly latencia: number;
  private readonly cambios = new Set<() => void>();
  private readonly oyentes = new Map<NombreEventoSocket, Set<(dato: unknown) => void>>();

  constructor(opciones: { latenciaMs?: number } = {}) { this.latencia = opciones.latenciaMs ?? 150; }

  readonly demo = {
    paso: () => this.actual().paso,
    reiniciar: () => { this.revision++; this.indice = 0; this.indiceWeb = 0; this.ayuda = []; this.avisar(); },
    alCambiar: (recibir: () => void) => { this.cambios.add(recibir); return () => { this.cambios.delete(recibir); }; },
  };

  async enviarComando(comando: ComandoRequest, opciones?: { idempotencyKey?: string }) {
    void opciones;
    const entrada = validar(ComandoRequestSchema, comando);
    const revision = this.revision;
    await this.esperar();
    this.comprobarRevision(revision);
    if (entrada.canal === 'web') {
      const esperado = DATOS_WEB[0]!.vista.acciones[0]!.comando;
      if (JSON.stringify(entrada) !== JSON.stringify(validar(ComandoRequestSchema, esperado))) {
        throw new ErrorCliente('NO_DISPONIBLE', 'Esta acción no está incluida en la cotización de demostración.');
      }
      this.indiceWeb = 1;
      this.avisar();
      return validar(RespuestaComandoSchema, DATOS_WEB[1]!.respuesta);
    }
    const siguiente = GUION_FLUJO_A[this.indice + 1];
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

  async consultar<K extends keyof ConsultasProvisionales>(nombre: K, _parametros: ParametrosConsulta[K]): Promise<ConsultasProvisionales[K]> {
    void _parametros;
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
