import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CANALES, ESTADOS_TRAMITE, CASILLAS, TIPOS_TRAMITE, CODIGOS_ERROR_DOMINIO,
  ENTIDADES_NACIMIENTO, PASOS_IDENTIFICACION, crearRegistroTiposTramite, siguientePregunta, Tramite,
  type HiloId, type PacienteId, type TramiteId,
  type Canal, type EstadoTramite, type Casilla, type TipoTramite, type CodigoErrorDominio,
} from '@noki/domain';
import {
  ENTIDADES_NACIMIENTO as ENTIDADES_CONTRATO, PASOS_IDENTIFICACION as PASOS_CONTRATO, SiguientePreguntaSchema,
  CanalSchema, EstadoTramiteSchema, CasillaSchema, TipoTramiteSchema, CodigoErrorDominioSchema, CodigoErrorSchema,
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
    expect(MAPEO_ERRORES_HTTP).toEqual({ REGLA_VIOLADA: 422, STEP_UP_REQUERIDO: 403, CONFLICTO_VERSION: 409, NO_ENCONTRADO: 404, TRANSICION_INVALIDA: 409, VALIDACION: 400, INTERNO: 500 });
    expectTypeOf<keyof typeof MAPEO_ERRORES_HTTP>().toEqualTypeOf<CodigoErrorDominio | 'VALIDACION' | 'INTERNO'>();
    expect(Object.keys(MAPEO_ERRORES_HTTP)).toEqual(CodigoErrorSchema.options);
  });
});

it('mantiene las entidades y los pasos y valida cada pista de identificación real', () => {
  expect(ENTIDADES_CONTRATO).toEqual(ENTIDADES_NACIMIENTO);
  expect(PASOS_CONTRATO).toEqual(PASOS_IDENTIFICACION);
  expectTypeOf<typeof ENTIDADES_CONTRATO[number]>().toEqualTypeOf<typeof ENTIDADES_NACIMIENTO[number]>();
  expectTypeOf<typeof PASOS_CONTRATO[number]>().toEqualTypeOf<typeof PASOS_IDENTIFICACION[number]>();

  const registro = crearRegistroTiposTramite();
  const contexto = {
    canal: 'callcenter', actor: 'asesor:demo', nivelAuth: 0,
    idempotencyKey: 'demo', correlationId: 'demo', ts: '2026-11-24T12:00:00Z',
  } as const;
  const tramite = Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId, 'AGENDAR', registro, contexto);
  const validar = (paso: typeof PASOS_CONTRATO[number]) => {
    const pregunta = siguientePregunta(tramite, contexto.canal, registro);
    expect(SiguientePreguntaSchema.parse(pregunta)).toEqual(pregunta);
    expect(pregunta).toMatchObject({ casilla: 'paciente', pista: { paso } });
  };

  validar('DESTINATARIO');
  tramite.declararDestinatario('TITULAR', [
    { pacienteId: 'paciente' as PacienteId, ref: 'ref', nombreVisible: 'Ana P.' },
  ], contexto);
  validar('CONFIRMAR');
  tramite.elegirCandidato(null);
  validar('FECHA_NAC');
  tramite.guardarFechaNac('1990-02-28');
  validar('CURP');
  tramite.marcarSinCurp();
  validar('DATOS');
});
