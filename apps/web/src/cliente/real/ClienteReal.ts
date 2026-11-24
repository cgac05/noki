import { z } from 'zod';
import {
  ComandoRequestSchema, CuerpoErrorSchema, RUTAS_CONSULTAS, rutaConsulta, RespuestaComandoSchema, RespuestaMensajeWaSchema, SolicitudMensajeWaSchema,
} from '@noki/contracts';
import type { ComandoRequest, DatosEventoSocket, NombreConsulta, NombreEventoSocket, RespuestaComando, SolicitudMensajeWa, RespuestaMensajeWa } from '@noki/contracts';
import type { ClienteApi } from '../ClienteApi.ts';
import { ErrorCliente, validar } from '../errores.ts';
import { esConsultaCompartida, validarConsulta } from '../consultas.ts';
import type { NombreConsultaCliente, ParametrosConsultaCliente, RespuestaConsultaCliente } from '../consultas.ts';

export class ClienteReal implements ClienteApi {
  readonly modo = 'real';
  private readonly url: string;
  private readonly peticion: typeof fetch;
  private readonly demoHabilitada: boolean;

  constructor(opciones: { url?: string; fetch?: typeof fetch; demo?: boolean } = {}) {
    this.url = (opciones.url ?? 'http://localhost:4000').replace(/\/$/, '');
    this.peticion = opciones.fetch ?? globalThis.fetch.bind(globalThis);
    this.demoHabilitada = opciones.demo ?? false;
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
      throw new ErrorCliente('NO_DISPONIBLE', 'La bandeja solo está disponible con VITE_DEMO=true.');
    }
    // Convierte un parámetro inválido en el mismo error público de contrato, antes de acceder a la red.
    const parametrosValidados = validar(definicion.parametros, parametros);
    const ruta = rutaConsulta<NombreConsulta>(nombre, parametrosValidados);
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
