import { expect, expectTypeOf, it } from 'vitest';
import { EVENTOS_DOMINIO } from '../../../packages/domain/src/eventos.ts';
import type { PayloadsEvento } from '../../../packages/domain/src/eventos.ts';
import type { HiloId, PacienteId, TramiteId } from '../../../packages/domain/src/identificadores.ts';
import { enmascararNombre } from '../../../packages/domain/src/identidad/nombre.ts';
import { normalizarTelefono, VIGENCIA_VINCULO_DIAS } from '../../../packages/domain/src/identidad/telefono.ts';
import type { MetodoVinculo } from '../../../packages/domain/src/vocabulario.ts';
import { Tramite, type ContextoOperacion } from '../../../packages/domain/src/Tramite.ts';
import { crearRegistroTiposTramite } from '../../../packages/domain/src/tipos/agendar.ts';

const registro = crearRegistroTiposTramite();
const contexto: ContextoOperacion = {
  canal: 'callcenter', actor: 'asesor:demo', nivelAuth: 0,
  ts: '2026-11-24T12:00:00Z', correlationId: 'demo', idempotencyKey: 'demo',
};

it('normaliza un teléfono sin admitir números de menos de diez dígitos', () => {
  expect(normalizarTelefono('+52 1 (000) 000-0001')).toBe('0000000001');
  expect(normalizarTelefono('123')).toBeUndefined();
  expect(VIGENCIA_VINCULO_DIAS).toBe(180);
});

it('muestra solo el primer nombre y la inicial paterna', () => {
  expect(enmascararNombre('  ANA MARÍA ', ' pérez luna ')).toBe('Ana P.');
});

it('tipa y registra los eventos de identidad', () => {
  expect(EVENTOS_DOMINIO).toContain('DestinatarioDeclarado');
  expect(EVENTOS_DOMINIO).toContain('PacienteRegistrado');
  expectTypeOf<PayloadsEvento['PacienteRegistrado']>().toEqualTypeOf<{ pacienteId: PacienteId }>();
  expectTypeOf<'TELEFONO_FECHA_NAC'>().toExtend<MetodoVinculo>();
});

it('avanza los pasos del titular y conserva las respuestas al rehidratar', () => {
  const tramite = Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId, 'AGENDAR', registro, contexto);
  expect(tramite.pasoIdentificacion()).toBe('DESTINATARIO');
  const version = tramite.version;
  expect(() => tramite.marcarSinCurp()).toThrow(expect.objectContaining({ regla: 'PASO_IDENTIFICACION_INVALIDO', datos: expect.objectContaining({ esperado: 'DESTINATARIO' }) }));
  expect(tramite.version).toBe(version);
  tramite.declararDestinatario('TITULAR', [], contexto);
  expect(tramite.pasoIdentificacion()).toBe('FECHA_NAC');
  tramite.guardarFechaNac('1990-02-28');
  expect(tramite.pasoIdentificacion()).toBe('CURP');
  const restaurado = Tramite.rehidratar(tramite.instantanea(), registro);
  restaurado.guardarCurp('PELA900228XNTRNN04');
  expect(restaurado.pasoIdentificacion()).toBe('DATOS');
  restaurado.asignarPaciente('paciente' as PacienteId, contexto);
  expect(restaurado.identificacion).toEqual({ relacion: 'TITULAR' });
});

it('rechaza referencias ajenas y conserva la versión si ya está reiniciado', () => {
  const tramite = Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId, 'AGENDAR', registro, contexto);
  const versionInicial = tramite.version;
  tramite.reiniciarIdentificacion();
  expect(tramite.version).toBe(versionInicial);
  tramite.declararDestinatario('TITULAR', [{ ref: 'opaca', pacienteId: 'paciente' as PacienteId, nombreVisible: 'Ana P.' }], contexto);
  const version = tramite.version;
  expect(tramite.pasoIdentificacion()).toBe('CONFIRMAR');
  expect(() => tramite.elegirCandidato('otra')).toThrow(expect.objectContaining({ regla: 'PASO_IDENTIFICACION_INVALIDO' }));
  expect(tramite.version).toBe(version);
  tramite.elegirCandidato(null);
  expect(tramite.pasoIdentificacion()).toBe('FECHA_NAC');
  tramite.reiniciarIdentificacion();
  expect(tramite.identificacion).toBeUndefined();
  expect(tramite.pasoIdentificacion()).toBe('DESTINATARIO');
  tramite.declararDestinatario('FAMILIAR', [], contexto);
  expect(tramite.pasoIdentificacion()).toBe('CURP');
  expect(tramite.eventosPendientes().at(-1)).toMatchObject({ tipo: 'DestinatarioDeclarado', payload: { relacion: 'FAMILIAR' } });
  tramite.marcarSinCurp();
  expect(tramite.pasoIdentificacion()).toBe('DATOS');
});
