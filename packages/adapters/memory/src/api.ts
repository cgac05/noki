import type {
  BandejaPort, ConversacionesWa, DatosEmisionToken, EmisorTokens, MensajeBandejaInterno, RegistroComandos, RegistroTokensUsados,
  ResultadoReservaComando,
} from '@noki/application';
import { VIGENCIA_COMANDO_MS } from '@noki/application';

interface Comando {
  huella: string;
  desde: number;
  resultado?: Extract<ResultadoReservaComando, { estado: 'COMPLETADA' }>;
}

export class RegistroComandosMemoria implements RegistroComandos {
  private readonly comandos = new Map<string, Comando>();

  async reservar(clave: string, huella: string, ts: string): Promise<ResultadoReservaComando> {
    const previo = this.comandos.get(clave);
    const desde = Date.parse(ts);
    if (previo) {
      if (previo.huella !== huella) return { estado: 'HUELLA_DISTINTA' };
      if (previo.resultado) return structuredClone(previo.resultado);
      if (desde - previo.desde <= VIGENCIA_COMANDO_MS) return { estado: 'EN_CURSO' };
    }
    this.comandos.set(clave, { huella, desde });
    return { estado: 'NUEVA' };
  }

  async completar(clave: string, codigo: number, respuesta: unknown): Promise<void> {
    const actual = this.comandos.get(clave);
    if (actual && !actual.resultado) actual.resultado = { estado: 'COMPLETADA', codigo, respuesta: structuredClone(respuesta) };
  }

  async soltar(clave: string): Promise<void> {
    if (!this.comandos.get(clave)?.resultado) this.comandos.delete(clave);
  }
}

export class ConversacionesWaMemoria implements ConversacionesWa {
  private readonly conversaciones = new Map<string, object>();

  async obtener(contactoId: string): Promise<unknown> {
    return structuredClone(this.conversaciones.get(contactoId) ?? null);
  }

  async guardar(contactoId: string, estado: object): Promise<void> {
    this.conversaciones.set(contactoId, structuredClone(estado));
  }
}

export class BandejaMemoria implements BandejaPort {
  private readonly mensajes = new Map<string, MensajeBandejaInterno>();

  async agregar(mensaje: MensajeBandejaInterno): Promise<void> {
    if (!this.mensajes.has(mensaje.id)) this.mensajes.set(mensaje.id, { ...mensaje });
  }

  async listar(): Promise<MensajeBandejaInterno[]> {
    return structuredClone([...this.mensajes.values()].sort((a, b) => b.ts.localeCompare(a.ts) || a.id.localeCompare(b.id)));
  }
}

export class RegistroTokensUsadosMemoria implements RegistroTokensUsados {
  private readonly tokens = new Set<string>();

  async consumir(jti: string): Promise<boolean> {
    if (this.tokens.has(jti)) return false;
    this.tokens.add(jti);
    return true;
  }

  async usado(jti: string): Promise<boolean> {
    return this.tokens.has(jti);
  }
}

export class EmisorTokensMemoria implements EmisorTokens {
  private readonly porContenido = new Map<string, string>();
  private secuencia = 0;

  async emitir(datos: DatosEmisionToken): Promise<string> {
    const contenido = JSON.stringify(datos);
    const previo = this.porContenido.get(contenido);
    if (previo) return previo;
    const token = 'token-api:' + ++this.secuencia;
    this.porContenido.set(contenido, token);
    return token;
  }
}
