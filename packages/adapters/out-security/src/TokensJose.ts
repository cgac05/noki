import { jwtVerify, SignJWT } from 'jose';
import type {
  DatosEmisionToken, EmisorTokens, RegistroTokensUsados, Reloj, TokenVerificado, UsoToken, VerificadorTokens,
} from '@noki/application';
import { CANALES, type HiloId, type PacienteId, type TramiteId } from '@noki/domain';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class TokensJose implements EmisorTokens, VerificadorTokens {
  private readonly clave: Uint8Array;

  constructor(secreto: string, private readonly reloj: Reloj, private readonly usados: RegistroTokensUsados) {
    this.clave = new TextEncoder().encode(secreto);
    if (this.clave.byteLength < 32) throw new Error('TOKEN_SECRET debe tener al menos 32 bytes.');
  }

  emitir(datos: DatosEmisionToken): Promise<string> {
    return new SignJWT({
      uso: datos.uso, tid: datos.tramiteId, hid: datos.hiloId, pid: datos.pacienteId,
      niv: datos.nivel, can: datos.canalOrigen, met: datos.metodo,
    }).setProtectedHeader({ alg: 'HS256' })
      .setJti(datos.jti)
      .setIssuedAt(Math.floor(Date.parse(datos.emitidoEn) / 1000))
      .setExpirationTime(Math.floor(Date.parse(datos.expiraEn) / 1000))
      .sign(this.clave);
  }

  async verificar(token: string, uso: UsoToken = 'CONTINUIDAD'): Promise<TokenVerificado | null> {
    try {
      const { payload: { jti, exp, uso: usoFirmado, tid, hid, pid, niv, can, met } } = await jwtVerify(token, this.clave, {
        algorithms: ['HS256'], requiredClaims: ['jti', 'iat', 'exp'], currentDate: this.reloj.ahora(),
      });
      if (usoFirmado !== uso || typeof exp !== 'number' || !jti || !uuid.test(jti) ||
          typeof tid !== 'string' || !uuid.test(tid) || typeof hid !== 'string' || !uuid.test(hid) ||
          (pid !== undefined && (typeof pid !== 'string' || !uuid.test(pid))) ||
          (niv !== 0 && niv !== 1 && niv !== 2 && niv !== 3) || (met !== 'TOKEN_CC' && met !== 'TOKEN_WEB')) return null;
      const canalOrigen = CANALES.find(canal => canal === can);
      if (!canalOrigen) return null;
      if (uso !== 'CONTEXTO' && !(await this.usados.consumir(jti, new Date(exp * 1000).toISOString()))) return null;
      return {
        tramiteId: tid as TramiteId, hiloId: hid as HiloId, nivel: niv, canalOrigen, metodo: met,
        ...(typeof pid === 'string' ? { pacienteId: pid as PacienteId } : {}),
      };
    } catch {
      return null;
    }
  }
}
