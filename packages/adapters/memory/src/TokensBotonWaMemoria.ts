import { PREFIJO_BOTON_WA, type DatosBotonWa, type RegistroTokensUsados, type Reloj, type TokensBotonWa } from '@noki/application';

export class TokensBotonWaMemoria implements TokensBotonWa {
  private readonly emitidos = new Map<string, DatosBotonWa>();
  private secuencia = 0;

  constructor(private readonly reloj: Reloj, private readonly usados: RegistroTokensUsados, private readonly demo: boolean) {}

  async emitir(datos: DatosBotonWa): Promise<string | null> {
    if (!this.demo) return null;
    const token = PREFIJO_BOTON_WA + ++this.secuencia;
    this.emitidos.set(token, { ...datos });
    return token;
  }

  async consumir(token: string, contactoId: string, uso?: DatosBotonWa['uso']): Promise<DatosBotonWa | null> {
    if (!this.demo) return null;
    const datos = this.emitidos.get(token);
    if (datos?.contactoId !== contactoId || (uso && datos.uso !== uso) || !(Date.parse(datos.expiraEn) > this.reloj.ahora().getTime())) return null;
    return await this.usados.consumir(datos.jti, datos.expiraEn) ? { ...datos } : null;
  }
}
