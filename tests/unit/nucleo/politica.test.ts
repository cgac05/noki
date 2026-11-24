import { expect, it } from 'vitest';
import { PoliticaIdentidad, StepUpRequerido, type Factor, type AccionProtegida, type ContextoIdentidad } from '../../../packages/domain/src/index.ts';

const politica = new PoliticaIdentidad();
const anonimo: ContextoIdentidad = {
  actor: 'paciente', canal: 'web', nivel: 0, vinculado: false, factores: new Set(),
};
const verificado: ContextoIdentidad = {
  ...anonimo, nivel: 1, vinculado: true,
  factores: new Set(['PIN', 'ENLACE_MAGICO', 'OTP', 'OTP_CONTACTO_ANTERIOR', 'TOKEN', 'FOLIO']),
};

it.each<AccionProtegida>(['cotizar', 'verPreparacion', 'agendar'])('permite %s sin verificación', (accion) => {
  expect(() => politica.exigir(accion, anonimo)).not.toThrow();
});

it.each<[AccionProtegida, Factor[]]>([
  ['retomar', ['FOLIO_FECHA_NAC']],
  ['cancelar', ['VINCULO', 'OTP', 'BOTON_APROBACION']],
  ['reprogramar', ['VINCULO', 'OTP', 'BOTON_APROBACION']],
  ['verResultados', ['PIN', 'ENLACE_MAGICO']],
  ['cambiarTelefono', ['OTP_CONTACTO_ANTERIOR', 'PIN']],
  ['cambiarCorreo', ['OTP_CONTACTO_ANTERIOR', 'PIN']],
  ['aceptarOfertaHueco', ['VINCULO', 'TOKEN']],
  ['responderRecordatorio', ['TOKEN']],
  ['solicitarFactura', ['VINCULO', 'FOLIO']],
])('valida los factores de %s', (accion, factores) => {
  expect(() => politica.exigir(accion, verificado)).not.toThrow();
  expect(() => politica.exigir(accion, anonimo)).toThrow(StepUpRequerido);
  expect(() => politica.exigir(accion, anonimo)).toThrow(expect.objectContaining({ factores }));
});

it('rechaza ver resultados sin PIN, incluso con enlace mágico', () => {
  expect(() => politica.exigir('verResultados', { ...verificado, factores: new Set(['ENLACE_MAGICO']) }))
    .toThrow(expect.objectContaining({ factores: ['PIN'] }));
});

it('permite al asesor operar en nombre del paciente', () => {
  expect(() => politica.exigir('retomar', { ...anonimo, actor: 'asesor:demo' })).not.toThrow();
});

it('rechaza un factor desconocido por tipos', () => {
  // @ts-expect-error Un factor ajeno al catálogo no se puede tratar como verificado.
  const invalido: Factor = 'DESCONOCIDO';
  expect(invalido).toBe('DESCONOCIDO');
});
