import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ESTADOS_TRAMITE, CASILLAS, TIPOS_TRAMITE, EVENTOS_DOMINIO,
  ReglaViolada, StepUpRequerido, ConflictoVersion, NoEncontrado, TransicionInvalida,
  type EventoDominio, type TramiteRegistro,
} from '../../packages/domain/src/index.ts';

describe('vocabulario y eventos de dominio', () => {
  it('declara exactamente los estados vigentes y ninguna fase obsoleta', () => {
    expect(ESTADOS_TRAMITE).toEqual(['BORRADOR', 'COTIZADO', 'LISTO_PARA_RESERVAR', 'HORARIO_RESERVADO', 'CONFIRMADA', 'EN_CLINICA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'EXPIRADO']);
    for (const estado of ['SUSPENDIDO', 'SERVICIO_SELECCIONADO', 'REQUISITOS_PENDIENTES', 'UBICACION_SELECCIONADA']) expect(ESTADOS_TRAMITE).not.toContain(estado);
    expect(CASILLAS).toEqual(['servicio', 'sede', 'paciente', 'requisitos', 'elegibilidad', 'horario']);
    expect(TIPOS_TRAMITE).toEqual(['AGENDAR', 'ADELANTO', 'FACTURA']);
    expect(EVENTOS_DOMINIO).toHaveLength(40);
    expect(EVENTOS_DOMINIO).toEqual(expect.arrayContaining([
      'HuecoLiberado', 'HuecoAsignado', 'HuecoDesierto', 'OfertaEnviada', 'OfertaAceptada',
      'OfertaRechazada', 'OfertaExpirada', 'OfertaPerdida', 'CitaAdelantada',
      'InteresAdelantoRegistrado', 'InteresAdelantoCancelado',
    ]));
    expectTypeOf<(typeof EVENTOS_DOMINIO)[number]>().toEqualTypeOf<EventoDominio['tipo']>();
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
