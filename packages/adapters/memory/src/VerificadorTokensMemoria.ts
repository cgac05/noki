import type { TokenVerificado, UsoToken, VerificadorTokens } from '@noki/application';

export class VerificadorTokensMemoria implements VerificadorTokens {
  private readonly tokens = new Map<string, { datos: TokenVerificado; uso: UsoToken }>();
  private secuencia = 0;

  emitir(datos: TokenVerificado, uso: UsoToken = 'CONTINUIDAD'): string {
    const token = 'token:' + ++this.secuencia;
    this.tokens.set(token, { datos: { ...datos }, uso });
    return token;
  }

  async verificar(token: string, uso: UsoToken = 'CONTINUIDAD'): Promise<TokenVerificado | null> {
    const credencial = this.tokens.get(token);
    if (credencial?.uso !== uso) return null;
    this.tokens.delete(token);
    return credencial.datos;
  }
}
