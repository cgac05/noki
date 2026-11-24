import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CANALES, ESTADOS_TRAMITE, CASILLAS, TIPOS_TRAMITE, CODIGOS_ERROR_DOMINIO,
  type Canal, type EstadoTramite, type Casilla, type TipoTramite, type CodigoErrorDominio,
} from '@noki/domain';
import {
  CanalSchema, EstadoTramiteSchema, CasillaSchema, TipoTramiteSchema, CodigoErrorDominioSchema,
} from '@noki/contracts';
import type { z } from 'zod';
import { MAPEO_ERRORES_HTTP } from '../src/index.ts';

describe('coherencia del vocabulario y errores del adaptador HTTP', () => {
  it('mantiene las mismas listas y tipos en dominio y contratos', () => {
    expect(CanalSchema.options).toEqual(CANALES);
    expect(EstadoTramiteSchema.options).toEqual(ESTADOS_TRAMITE);
    expect(CasillaSchema.options).toEqual(CASILLAS);
    expect(TipoTramiteSchema.options).toEqual(TIPOS_TRAMITE);
    expect(CodigoErrorDominioSchema.options).toEqual(CODIGOS_ERROR_DOMINIO);
    expectTypeOf<z.infer<typeof CanalSchema>>().toEqualTypeOf<Canal>();
    expectTypeOf<z.infer<typeof EstadoTramiteSchema>>().toEqualTypeOf<EstadoTramite>();
    expectTypeOf<z.infer<typeof CasillaSchema>>().toEqualTypeOf<Casilla>();
    expectTypeOf<z.infer<typeof TipoTramiteSchema>>().toEqualTypeOf<TipoTramite>();
    expectTypeOf<z.infer<typeof CodigoErrorDominioSchema>>().toEqualTypeOf<CodigoErrorDominio>();
  });

  it('mapea todos los errores al código HTTP especificado', () => {
    expect(MAPEO_ERRORES_HTTP).toEqual({ REGLA_VIOLADA: 422, STEP_UP_REQUERIDO: 403, CONFLICTO_VERSION: 409, NO_ENCONTRADO: 404, TRANSICION_INVALIDA: 409, VALIDACION: 400 });
    expectTypeOf<keyof typeof MAPEO_ERRORES_HTTP>().toEqualTypeOf<CodigoErrorDominio | 'VALIDACION'>();
  });
});
