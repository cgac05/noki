import { z } from 'zod';
import {
  ComandoRequestSchema, CuerpoErrorSchema, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema,
} from '@noki/contracts';
import type { ComandoRequest, DatosEventoSocket, NombreEventoSocket, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa } from '@noki/contracts';
import type { ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { validarConsulta } from '../provisional.ts';
import type { ConsultasProvisionales, ParametrosConsulta } from '../provisional.ts';

export class ClienteReal implements ClienteApi {
  readonly modo = 'real';
  private readonly url: string;
  private readonly peticion: typeof fetch;

  constructor(opciones: { url?: string; fetch?: typeof fetch } = {}) {
    this.url = (opciones.url ?? 'http://localhost:4000').replace(/\/$/, '');
    this.peticion = opciones.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async enviarComando(comando: ComandoRequest, opciones: { idempotencyKey?: string } = {}): Promise<RespuestaComando> {
    const cuerpo = validar(ComandoRequestSchema, comando);
    const clave = validar(z.uuid(), opciones.idempotencyKey ?? crypto.randomUUID());
    return validar(RespuestaComandoSchema, await this.solicitar('/api/comandos', cuerpo, clave));
  }

  async enviarMensajeWa(mensaje: SolicitudMensajeWa): Promise<RespuestaMensajeWa> {
    const cuerpo = validar(SolicitudMensajeWaSchema, mensaje);
    return validar(RespuestaMensajeWaSchema, await this.solicitar('/api/canales/wa/mensajes', cuerpo, crypto.randomUUID()));
  }

  async consultar<K extends keyof ConsultasProvisionales>(nombre: K, parametros: ParametrosConsulta[K]): Promise<ConsultasProvisionales[K]> {
    let ruta: string;
    if (nombre === 'lineaTiempo') {
      const { hiloId } = validar(z.object({ hiloId: z.uuidv7() }), parametros);
      ruta = `/api/hilos/${hiloId}/linea-tiempo`;
    } else if (nombre === 'metricas') {
      ruta = '/api/admin/kpis';
    } else {
      throw new ErrorCliente('NO_DISPONIBLE', 'Esta consulta aún no está disponible en la API. Usa el modo mock para recorrer la demo.');
    }
    return validarConsulta(nombre, await this.solicitar(ruta));
  }

  suscribir<N extends NombreEventoSocket>(nombre: N, recibir: (dato: DatosEventoSocket[N]) => void): () => void {
    void nombre;
    void recibir;
    // La conexión Socket.IO real corresponde al cambio api-comandos.
    return () => {};
  }

  private async solicitar(ruta: string, cuerpo?: unknown, clave?: string): Promise<unknown> {
    const opciones: RequestInit = cuerpo === undefined
      ? { method: 'GET' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': clave! }, body: JSON.stringify(cuerpo) };
    let respuesta: Response | undefined;
    for (let intento = 0; intento < 2; intento++) {
      try {
        respuesta = await this.peticion(`${this.url}${ruta}`, opciones);
        break;
      } catch {
        if (intento === 1) throw new ErrorCliente('RED', 'No pudimos conectar con la API. Comprueba que esté encendida e intenta de nuevo.');
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
