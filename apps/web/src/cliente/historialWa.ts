import { z } from 'zod';
import { MensajeBotSchema, SolicitudMensajeWaSchema } from '@noki/contracts';
import type { MensajeBot, SolicitudMensajeWa } from '@noki/contracts';
import type { ClienteApi } from './ClienteApi.ts';
import { ErrorCliente, validar } from './errores.ts';

const EntradaSchema = z.object({
  id: z.string(), origen: z.enum(['usuario', 'bot']), tipo: z.enum(['texto', 'opcion', 'flow-resumen', 'mensaje-bot']),
  texto: z.string().optional(), mensaje: MensajeBotSchema.optional(),
  estado: z.enum(['enviando', 'enviado', 'error']).optional(), error: z.string().optional(),
});
export type EntradaHistorial = z.infer<typeof EntradaSchema>;
export type ResumenWa = { tipo: 'texto' | 'opcion' | 'flow-resumen'; texto: string };
export type ConversacionWa = { entradas: EntradaHistorial[]; enviando: boolean };
type Almacenamiento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Pendiente = { solicitud: SolicitudMensajeWa; clave: string };
type Conversacion = { vista: ConversacionWa; pendientes: Map<string, Pendiente>; codigos: Set<string>; revision: number };

// También elimina valores iniciales del Flow antes de que un mensaje entre al historial.
function redactar<T>(dato: T, secretos: string[] = []): T {
  return JSON.parse(JSON.stringify(dato, (clave, valor: unknown) => {
    if (clave === 'valorInicial') return undefined;
    if (typeof valor !== 'string') return valor;
    let texto = valor.replace(/\bCONTINUAR\s+\S+/g, 'CONTINUAR ••••');
    for (const secreto of secretos) if (secreto) texto = texto.replaceAll(secreto, '••••');
    return texto;
  })) as T;
}

export class HistorialWa {
  readonly #conversaciones = new Map<string, Conversacion>();
  readonly #oyentes = new Map<string, Set<() => void>>();
  readonly #almacenamiento: Almacenamiento | undefined;
  #activo: string | undefined;

  constructor(private readonly cliente: Pick<ClienteApi, 'enviarMensajeWa'>, opciones: { almacenamiento?: Almacenamiento } = {}) {
    try { this.#almacenamiento = opciones.almacenamiento ?? globalThis.sessionStorage; } catch { this.#almacenamiento = undefined; }
  }

  leer(waId: string): ConversacionWa {
    this.#activo = waId;
    if (!this.#conversaciones.has(waId)) {
      let entradas: EntradaHistorial[] = [];
      try {
        const guardado = this.#almacenamiento?.getItem(`noki:wa:${waId}`);
        if (guardado) entradas = redactar(z.array(EntradaSchema).parse(JSON.parse(guardado)));
      } catch { /* El historial sigue disponible en memoria. */ }
      this.#conversaciones.set(waId, { vista: { entradas, enviando: false }, pendientes: new Map(), codigos: new Set(), revision: 0 });
    }
    return this.#conversaciones.get(waId)!.vista;
  }

  suscribir(waId: string, recibir: () => void) {
    const oyentes = this.#oyentes.get(waId) ?? new Set(); oyentes.add(recibir); this.#oyentes.set(waId, oyentes);
    return () => { oyentes.delete(recibir); };
  }

  async enviar(solicitud: SolicitudMensajeWa, resumen: ResumenWa): Promise<boolean> {
    const entrada = validar(SolicitudMensajeWaSchema, solicitud);
    const conversacion = this.obtener(entrada.waId);
    if (conversacion.vista.enviando) return false;
    const id = crypto.randomUUID();
    const texto = entrada.texto && /^\s*CONTINUAR\s+\S+/i.test(entrada.texto) ? 'CONTINUAR ••••' : entrada.texto ?? resumen.texto;
    const secretos = Object.values(entrada.flowResponse ?? {});
    const burbuja: EntradaHistorial = { id, origen: 'usuario', tipo: resumen.tipo, texto: redactar(texto, secretos), estado: 'enviando' };
    conversacion.pendientes.set(id, { solicitud: entrada, clave: crypto.randomUUID() });
    this.actualizar(entrada.waId, { entradas: [...conversacion.vista.entradas, burbuja], enviando: true });
    return this.ejecutar(entrada.waId, id);
  }

  async continuar(waId: string, codigo: string): Promise<boolean> {
    const conversacion = this.obtener(waId);
    if (!codigo.trim() || conversacion.codigos.has(codigo) || conversacion.vista.enviando) return false;
    conversacion.codigos.add(codigo);
    return this.enviar({ waId, texto: `CONTINUAR ${codigo}` }, { tipo: 'texto', texto: 'CONTINUAR ••••' });
  }

  async reintentar(waId: string, id: string): Promise<boolean> {
    const conversacion = this.obtener(waId);
    if (conversacion.vista.enviando || !conversacion.pendientes.has(id)) return false;
    this.actualizar(waId, { entradas: conversacion.vista.entradas.map(e => e.id === id ? { ...e, estado: 'enviando', error: undefined } : e), enviando: true });
    return this.ejecutar(waId, id);
  }

  descartarPendiente(waId: string, id: string) { this.obtener(waId).pendientes.delete(id); }

  enviarFlow(waId: string, valores: Record<string, string>, texto: string): Promise<boolean> {
    const pendiente = [...this.obtener(waId).pendientes].find(([, dato]) => dato.solicitud.flowResponse !== undefined);
    return pendiente ? this.reintentar(waId, pendiente[0]) : this.enviar({ waId, flowResponse: valores }, { tipo: 'flow-resumen', texto });
  }

  descartarFlow(waId: string) {
    for (const [id, dato] of this.obtener(waId).pendientes) if (dato.solicitud.flowResponse) this.descartarPendiente(waId, id);
  }

  borrar(waId: string) {
    const conversacion = this.obtener(waId); conversacion.revision++; conversacion.pendientes.clear();
    conversacion.vista = { entradas: [], enviando: false };
    try { this.#almacenamiento?.removeItem(`noki:wa:${waId}`); } catch { /* Sin almacenamiento, basta limpiar la memoria. */ }
    this.notificar(waId);
  }

  reiniciar() {
    if (this.#activo) this.borrar(this.#activo);
    for (const conversacion of this.#conversaciones.values()) conversacion.codigos.clear();
  }

  private obtener(waId: string): Conversacion { this.leer(waId); return this.#conversaciones.get(waId)!; }
  private notificar(waId: string) { this.#oyentes.get(waId)?.forEach(recibir => recibir()); }
  private actualizar(waId: string, vista: ConversacionWa) {
    this.obtener(waId).vista = vista;
    // Proyección explícita: nunca se serializan solicitudes, claves ni registros de códigos.
    const entradas = vista.entradas.map(({ id, origen, tipo, texto, mensaje, estado, error }) => ({ id, origen, tipo, ...(texto !== undefined ? { texto } : {}), ...(mensaje ? { mensaje } : {}), ...(estado ? { estado } : {}), ...(error ? { error } : {}) }));
    try { this.#almacenamiento?.setItem(`noki:wa:${waId}`, JSON.stringify(entradas)); } catch { /* Se conserva el historial en memoria. */ }
    this.notificar(waId);
  }

  private async ejecutar(waId: string, id: string): Promise<boolean> {
    const conversacion = this.obtener(waId); const revision = conversacion.revision;
    const pendiente = conversacion.pendientes.get(id)!;
    try {
      const respuesta = await this.cliente.enviarMensajeWa(pendiente.solicitud, { idempotencyKey: pendiente.clave });
      if (revision !== conversacion.revision) return false;
      const codigo = pendiente.solicitud.texto?.match(/^CONTINUAR\s+(.+)$/i)?.[1];
      const secretos = [...Object.values(pendiente.solicitud.flowResponse ?? {}), ...(codigo ? [codigo] : [])];
      const mensajes = respuesta.mensajes.map(mensaje => redactar<MensajeBot>(mensaje, secretos));
      conversacion.pendientes.delete(id);
      this.actualizar(waId, { entradas: [...conversacion.vista.entradas.map(e => e.id === id ? { ...e, estado: 'enviado' as const, error: undefined } : e), ...mensajes.map(mensaje => ({ id: crypto.randomUUID(), origen: 'bot' as const, tipo: 'mensaje-bot' as const, mensaje }))], enviando: false });
      return true;
    } catch (error) {
      if (revision !== conversacion.revision) return false;
      const mensaje = error instanceof ErrorCliente && error.tipo === 'RED' ? error.mensaje : 'No pudimos enviar el mensaje. Intenta de nuevo.';
      this.actualizar(waId, { entradas: conversacion.vista.entradas.map(e => e.id === id ? { ...e, estado: 'error', error: mensaje } : e), enviando: false });
      return false;
    }
  }
}
