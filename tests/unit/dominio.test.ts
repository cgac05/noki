import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RiesgoEstimado } from '../../packages/domain/src/prediccion/nivel.ts';
import {
  ESTADOS_TRAMITE, CASILLAS, TIPOS_TRAMITE, EVENTOS_DOMINIO,
  ReglaViolada, StepUpRequerido, ConflictoVersion, NoEncontrado, TransicionInvalida,
  type EventoDominio, type TramiteRegistro,
} from '../../packages/domain/src/index.ts';

const eventosHuecos = [
  'HuecoLiberado', 'HuecoAsignado', 'HuecoDesierto', 'OfertaEnviada', 'OfertaAceptada',
  'OfertaRechazada', 'OfertaExpirada', 'OfertaPerdida', 'CitaAdelantada',
  'InteresAdelantoRegistrado', 'InteresAdelantoCancelado',
] as const;

describe('vocabulario y eventos de dominio', () => {
  it('declara exactamente los estados vigentes y ninguna fase obsoleta', () => {
    expect(ESTADOS_TRAMITE).toEqual(['BORRADOR', 'COTIZADO', 'LISTO_PARA_RESERVAR', 'HORARIO_RESERVADO', 'CONFIRMADA', 'EN_CLINICA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'EXPIRADO']);
    for (const estado of ['SUSPENDIDO', 'SERVICIO_SELECCIONADO', 'REQUISITOS_PENDIENTES', 'UBICACION_SELECCIONADA']) expect(ESTADOS_TRAMITE).not.toContain(estado);
    expect(CASILLAS).toEqual(['servicio', 'sede', 'paciente', 'requisitos', 'elegibilidad', 'horario']);
    expect(TIPOS_TRAMITE).toEqual(['AGENDAR', 'ADELANTO', 'FACTURA']);
    expect(EVENTOS_DOMINIO).toHaveLength(41);
    expect(EVENTOS_DOMINIO).toEqual(expect.arrayContaining([...eventosHuecos, 'RiesgoEstimado']));
    expectTypeOf<(typeof EVENTOS_DOMINIO)[number]>().toEqualTypeOf<EventoDominio['tipo']>();
  });

  it('exige el nivel de riesgo y rechaza el payload de un hueco', () => {
    type PayloadRiesgo = Extract<EventoDominio, { tipo: 'RiesgoEstimado' }>['payload'];
    expectTypeOf<PayloadRiesgo>().toEqualTypeOf<Pick<RiesgoEstimado, 'nivel' | 'probabilidad' | 'origen' | 'versionModelo'>>();
    // @ts-expect-error: RiesgoEstimado exige nivel
    const sinNivel: PayloadRiesgo = { probabilidad: 0.4, origen: 'REGLAS', versionModelo: 'reglas@1' };
    expect(sinNivel).not.toHaveProperty('nivel');
    const hueco = {} as Extract<EventoDominio, { tipo: 'HuecoLiberado' }>['payload'];
    // @ts-expect-error: RiesgoEstimado no recibe el payload de HuecoLiberado
    const payloadHueco: PayloadRiesgo = hueco;
    expect(payloadHueco).not.toHaveProperty('nivel');
  });

  it('no referencia a quien liberó el horario en eventos del candidato', () => {
    type EventoCandidato = Extract<EventoDominio, { tipo: Exclude<(typeof eventosHuecos)[number], 'HuecoLiberado' | 'HuecoAsignado' | 'HuecoDesierto'> }>;
    type Claves<T> = T extends unknown ? keyof T : never;
    type ClavesOrigen = Extract<Claves<EventoCandidato['payload']>, 'pacienteId' | 'tramiteId' | 'origenReservaId'>;
    expectTypeOf<ClavesOrigen>().toEqualTypeOf<never>();
  });

  it('mantiene las tablas de eventos tipados del documento iguales al catálogo', () => {
    const documento = readFileSync(new URL('../../docs/eventos.md', import.meta.url), 'utf8');
    const tablas = documento.split(/^## /m).filter(seccion => seccion.split(/\r?\n/)[0]?.endsWith(': eventos tipados'));
    const nombres = tablas.flatMap(tabla => [...tabla.matchAll(/^\| `([A-Za-z]+)` \|/gm)].map(coincidencia => coincidencia[1]));
    expect(nombres.sort()).toEqual([...EVENTOS_DOMINIO].sort());
  });

  it('no reserva los once eventos de huecos ni el de predicción', () => {
    const documento = readFileSync(new URL('../../docs/eventos.md', import.meta.url), 'utf8');
    const reservadas = documento.split('## Familias reservadas')[1];
    expect(reservadas).toBeDefined();
    for (const tipo of [...eventosHuecos, 'RiesgoEstimado']) expect(reservadas).not.toContain(`\`${tipo}\``);
  });

  it('exige el tipo de trámite y vincula el payload al evento', () => {
    const baseSinTipo = {} as Omit<TramiteRegistro, 'tipo'>;
    // @ts-expect-error: un registro sin tipo no es un trámite válido
    const sinTipo: TramiteRegistro = baseSinTipo;
    expect(sinTipo).not.toHaveProperty('tipo');
    expectTypeOf<Extract<EventoDominio, { tipo: 'CitaConfirmada' }>['payload']>().toEqualTypeOf<{ folio: string }>();
    // @ts-expect-error: CitaConfirmada no recibe el payload de ServicioSeleccionado
    const payload: Extract<EventoDominio, { tipo: 'CitaConfirmada' }>['payload'] = { servicioId: 'otro' };
    expect(payload).not.toHaveProperty('folio');
  });

  it('detecta una rama de evento omitida y payloads con claves sensibles', () => {
    const verificarNunca = (valor: never): never => valor;
    const incompleto = (evento: EventoDominio): never => {
      switch (evento.tipo) {
        case 'TramiteIniciado': throw new Error('rama cubierta');
      }
      // @ts-expect-error: los demás eventos deben cubrirse antes de tratarlo como never
      return verificarNunca(evento);
    };
    expect(incompleto).toBeTypeOf('function');
    type Claves<T> = T extends unknown ? keyof T : never;
    type Sensibles = Extract<Claves<EventoDominio['payload']>, 'fechaNac' | 'email' | 'telefono' | 'rfc' | 'pin' | 'curp'>;
    expectTypeOf<Sensibles>().toEqualTypeOf<never>();
  });

  it('conserva código y datos de los errores y todos son Error', () => {
    const errores = [
      new ReglaViolada('SERVICIO_NO_DISPONIBLE_EN_SEDE', { sedeId: 'sede' }),
      new StepUpRequerido(3, ['PIN']), new ConflictoVersion(1, 2),
      new NoEncontrado('tramite', 'id'), new TransicionInvalida('BORRADOR', 'ConfirmarCita'),
    ];
    expect(errores.map(e => e.codigo)).toEqual(['REGLA_VIOLADA', 'STEP_UP_REQUERIDO', 'CONFLICTO_VERSION', 'NO_ENCONTRADO', 'TRANSICION_INVALIDA']);
    for (const error of errores) { expect(error).toBeInstanceOf(Error); expect(error.datos).toBeTypeOf('object'); }
    expect(errores[0]?.datos).toEqual({ regla: 'SERVICIO_NO_DISPONIBLE_EN_SEDE', sedeId: 'sede' });
  });
});
