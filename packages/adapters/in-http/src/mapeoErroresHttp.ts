import type { CodigoErrorDominio } from '@noki/domain';

export const MAPEO_ERRORES_HTTP = {
  REGLA_VIOLADA: 422, STEP_UP_REQUERIDO: 403, CONFLICTO_VERSION: 409,
  NO_ENCONTRADO: 404, TRANSICION_INVALIDA: 409, VALIDACION: 400, INTERNO: 500,
} as const satisfies Record<CodigoErrorDominio | 'VALIDACION' | 'INTERNO', number>;
