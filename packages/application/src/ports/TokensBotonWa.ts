export type BotonWa =
  | { uso: 'APROBACION'; accion: 'CANCELAR' | 'CONSERVAR'; tramiteId: string }
  | { uso: 'OFERTA'; accion: 'ACEPTAR' | 'RECHAZAR'; ofertaId: string };

export type DatosBotonWa = BotonWa & { contactoId: string; jti: string; expiraEn: string };

export interface TokensBotonWa {
  emitir(datos: DatosBotonWa): Promise<string | null>;
  consumir(token: string, contactoId: string, uso?: DatosBotonWa['uso']): Promise<DatosBotonWa | null>;
}
export const PREFIJO_BOTON_WA = 'boton-wa:';
