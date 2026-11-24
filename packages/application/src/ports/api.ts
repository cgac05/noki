import type { TokenVerificado, UsoToken } from './nucleo.ts';

export type ResultadoReservaComando =
  | { estado: 'NUEVA' | 'EN_CURSO' | 'HUELLA_DISTINTA' }
  | { estado: 'COMPLETADA'; codigo: number; respuesta: unknown };

export interface RegistroComandos {
  reservar(clave: string, huella: string, ts: string): Promise<ResultadoReservaComando>;
  completar(clave: string, codigo: number, respuesta: unknown): Promise<void>;
  soltar(clave: string): Promise<void>;
}

export interface ConversacionesWa {
  obtener(contactoId: string): Promise<unknown>;
  guardar(contactoId: string, estado: object, ts: string): Promise<void>;
}

export interface MensajeBandejaInterno {
  id: string;
  canal: 'sms' | 'email';
  asunto: string;
  cuerpo: string;
  ts: string;
}

export interface BandejaPort {
  agregar(mensaje: MensajeBandejaInterno): Promise<void>;
  listar(): Promise<MensajeBandejaInterno[]>;
}

export interface DatosEmisionToken extends TokenVerificado {
  jti: string;
  uso: UsoToken;
  emitidoEn: string;
  expiraEn: string;
}

export interface EmisorTokens {
  emitir(datos: DatosEmisionToken): Promise<string>;
}

export interface RegistroTokensUsados {
  consumir(jti: string, expiraEn: string): Promise<boolean>;
  usado(jti: string): Promise<boolean>;
}

export const VIGENCIA_COMANDO_MS = 60_000;
