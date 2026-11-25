import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { PREFIJO_BOTON_WA, type BotonWa, type DatosBotonWa, type RegistroTokensUsados, type Reloj, type TokensBotonWa } from '@noki/application';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const formato = 'noki-boton-wa+jwt';

function leerBoton(payload: JWTPayload): BotonWa | null {
  const { uso, accion, tramiteId, ofertaId } = payload;
  if (uso === 'APROBACION' && (accion === 'CANCELAR' || accion === 'CONSERVAR')
    && typeof tramiteId === 'string' && uuid.test(tramiteId)) return { uso, accion, tramiteId };
  if (uso === 'OFERTA' && (accion === 'ACEPTAR' || accion === 'RECHAZAR')
    && typeof ofertaId === 'string' && uuid.test(ofertaId)) return { uso, accion, ofertaId };
  return null;
}

export class TokensBotonWaJose implements TokensBotonWa {
  private readonly clave: Uint8Array;

  constructor(secreto: string, private readonly reloj: Reloj,
    private readonly usados: RegistroTokensUsados, private readonly demo: boolean) {
    this.clave = new TextEncoder().encode(secreto);
    if (this.clave.byteLength < 32) throw new Error('TOKEN_SECRET debe tener al menos 32 bytes.');
  }

  async emitir({ jti, expiraEn, ...boton }: DatosBotonWa): Promise<string | null> {
    if (!this.demo) return null;
    return PREFIJO_BOTON_WA + await new SignJWT(boton).setProtectedHeader({ alg: 'HS256', typ: formato })
      .setJti(jti).setIssuedAt(Math.floor(this.reloj.ahora().getTime() / 1000))
      .setExpirationTime(Math.floor(Date.parse(expiraEn) / 1000)).sign(this.clave);
  }

  async consumir(token: string, contactoId: string, uso?: DatosBotonWa['uso']): Promise<DatosBotonWa | null> {
    if (!this.demo || !token.startsWith(PREFIJO_BOTON_WA)) return null;
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token.slice(PREFIJO_BOTON_WA.length), this.clave, {
        algorithms: ['HS256'], typ: formato, requiredClaims: ['jti', 'iat', 'exp'], currentDate: this.reloj.ahora(),
      }));
    } catch {
      return null;
    }
    const { jti, exp } = payload;
    if (payload.contactoId !== contactoId || !uuid.test(contactoId) || !jti || !uuid.test(jti) || typeof exp !== 'number') return null;
    const boton = leerBoton(payload);
    if (!boton || (uso && boton.uso !== uso)) return null;
    const expiraEn = new Date(exp * 1000).toISOString();
    return await this.usados.consumir(jti, expiraEn) ? { ...boton, contactoId, jti, expiraEn } : null;
  }
}
