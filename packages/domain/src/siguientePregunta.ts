import type { PistaDominio, RegistroTiposTramite } from './RegistroTiposTramite.ts';
import type { Canal, Casilla, TipoTramite } from './vocabulario.ts';

import type { IdentificacionPendiente, PasoIdentificacion } from './identidad/identificacion.ts';

export type SiguientePreguntaDominio =
  | { tipo: 'COMPLETO' }
  | { tipo: 'PREGUNTA'; casilla: Casilla; pista: PistaDominio };

export function siguientePregunta(
  tramite: {
    tipo: TipoTramite;
    casillaLlena(casilla: Casilla): boolean;
    pasoIdentificacion?(): PasoIdentificacion;
    identificacion?: IdentificacionPendiente | undefined;
  },
  canal: Canal,
  registro: RegistroTiposTramite,
): SiguientePreguntaDominio {
  const definicion = registro.obtener(tramite.tipo);
  const paso = tramite.pasoIdentificacion?.() ?? 'DESTINATARIO';
  if (paso !== 'DESTINATARIO' && definicion.pistaPaciente && !tramite.casillaLlena('paciente') &&
      (definicion.dependencias.paciente ?? []).every(casilla => tramite.casillaLlena(casilla))) {
    return { tipo: 'PREGUNTA', casilla: 'paciente', pista: definicion.pistaPaciente(paso, tramite.identificacion) };
  }
  for (const casilla of definicion.ordenPorCanal[canal]) {
    if (!tramite.casillaLlena(casilla) &&
        (definicion.dependencias[casilla] ?? []).every((dependencia) => tramite.casillaLlena(dependencia))) {
      const pista: PistaDominio = casilla === 'paciente' && definicion.pistaPaciente
        ? definicion.pistaPaciente(paso, tramite.identificacion)
        : structuredClone(definicion.pistas[casilla] ?? { entrada: 'NINGUNA' as const });
      return { tipo: 'PREGUNTA', casilla, pista };
    }
  }
  return { tipo: 'COMPLETO' };
}
