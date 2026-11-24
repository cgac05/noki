import type { HiloId, TramiteId } from './identificadores.ts';
import type { EstadoTramite, TipoTramite } from './vocabulario.ts';

export interface TramiteRegistro {
  id: TramiteId;
  hiloId: HiloId;
  tipo: TipoTramite;
  estado: EstadoTramite;
  version: number;
}
