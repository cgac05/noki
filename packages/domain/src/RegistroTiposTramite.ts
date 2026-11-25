import { ReglaViolada } from './errores.ts';
import { CANALES, type Canal, type Casilla, type EstadoTramite, type TipoTramite } from './vocabulario.ts';

import type { IdentificacionPendiente, PasoIdentificacion } from './identidad/identificacion.ts';

export interface PistaDominio {
  paso?: PasoIdentificacion;
  opciones?: { id: string; titulo: string; payload: string }[];
  entrada: 'TEXTO' | 'BOTONES' | 'LISTA' | 'FLOW' | 'NINGUNA';
  campos?: { id: string; etiqueta: string; captura: 'texto' | 'fecha' | 'sensitive' | 'passcode'; requerido?: boolean }[];
}

export interface DefinicionTipoTramite {
  inactividadHoras: number;
  casillas: readonly Casilla[];
  dependencias: Partial<Record<Casilla, readonly Casilla[]>>;
  ordenPorCanal: Record<Canal, readonly Casilla[]>;
  pistas: Partial<Record<Casilla, PistaDominio>>;
  pistaPaciente?: (paso: PasoIdentificacion, identificacion?: IdentificacionPendiente) => PistaDominio;
  transiciones: Readonly<Record<string, Partial<Record<EstadoTramite, EstadoTramite>>>>;
  hitos: (casillaLlena: (casilla: Casilla) => boolean) => EstadoTramite;
}

export class RegistroTiposTramite {
  private readonly definiciones = new Map<TipoTramite, DefinicionTipoTramite>();

  registrar(tipo: TipoTramite, definicion: DefinicionTipoTramite): void {
    const casillas = new Set(definicion.casillas);
    if (casillas.size !== definicion.casillas.length) {
      throw new Error('La definición contiene casillas repetidas.');
    }
    for (const canal of CANALES) {
      const orden = definicion.ordenPorCanal[canal];
      if (orden.length !== casillas.size || new Set(orden).size !== casillas.size ||
          orden.some((casilla) => !casillas.has(casilla))) {
        throw new Error(`El orden de ${canal} debe incluir cada casilla una vez.`);
      }
    }

    const enRuta = new Set<Casilla>();
    const visitadas = new Set<Casilla>();
    const visitar = (casilla: Casilla): void => {
      if (visitadas.has(casilla)) return;
      if (!casillas.has(casilla) || enRuta.has(casilla)) {
        throw new Error('Las dependencias deben ser casillas del tipo y no formar ciclos.');
      }
      enRuta.add(casilla);
      for (const dependencia of definicion.dependencias[casilla] ?? []) visitar(dependencia);
      enRuta.delete(casilla);
      visitadas.add(casilla);
    };
    for (const casilla of definicion.casillas) visitar(casilla);
    this.definiciones.set(tipo, definicion);
  }

  obtener(tipo: TipoTramite): DefinicionTipoTramite {
    const definicion = this.definiciones.get(tipo);
    if (!definicion) throw new ReglaViolada('TIPO_TRAMITE_NO_REGISTRADO', { tipo });
    return definicion;
  }
}
