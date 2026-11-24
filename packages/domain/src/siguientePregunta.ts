import type { PistaDominio, RegistroTiposTramite } from './RegistroTiposTramite.ts';
import type { Canal, Casilla, TipoTramite } from './vocabulario.ts';

export type SiguientePreguntaDominio =
  | { tipo: 'COMPLETO' }
  | { tipo: 'PREGUNTA'; casilla: Casilla; pista: PistaDominio };

export function siguientePregunta(
  tramite: { tipo: TipoTramite; casillaLlena(casilla: Casilla): boolean },
  canal: Canal,
  registro: RegistroTiposTramite,
): SiguientePreguntaDominio {
  const definicion = registro.obtener(tramite.tipo);
  for (const casilla of definicion.ordenPorCanal[canal]) {
    if (!tramite.casillaLlena(casilla) &&
        (definicion.dependencias[casilla] ?? []).every((dependencia) => tramite.casillaLlena(dependencia))) {
      return { tipo: 'PREGUNTA', casilla, pista: structuredClone(definicion.pistas[casilla] ?? { entrada: 'NINGUNA' }) };
    }
  }
  return { tipo: 'COMPLETO' };
}
