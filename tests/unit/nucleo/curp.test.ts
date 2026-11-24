import { describe, expect, it } from 'vitest';
import { coincideNombreCurp, curpBase, validarCurp } from '../../../packages/domain/src/identidad/curp.ts';

const datos = {
  nombre: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: 'Luna',
  fechaNac: '1990-02-28', sexo: 'F', entidadNacimiento: 'NT',
} as const;

describe('CURP', () => {
  it.each([
    [{ apellidoPaterno: 'De la Peña' }, 'PELA900228MNTXNN'],
    [{ nombre: 'José Luis' }, 'PELL900228MNTRNS'],
    [{ nombre: 'María Ana' }, 'PELA900228MNTRNN'],
    [{ apellidoPaterno: 'Ñúñez' }, 'XULA900228MNTXNN'],
    [{ apellidoMaterno: '' }, 'PEXA900228MNTRXN'],
    [{ apellidoPaterno: 'Baca', apellidoMaterno: 'Cano' }, 'BXCA900228MNTCNN'],
  ])('calcula la base para %j', (cambios, esperada) => {
    expect(curpBase({ ...datos, ...cambios })).toBe(esperada);
  });

  it('CURP con sexo X', () => {
    const curp = 'PELA900228XNTRNN04';
    expect(validarCurp(curp)).toMatchObject({ sexo: 'X', fechaNac: datos.fechaNac, entidadNacimiento: 'NT' });
    expect(coincideNombreCurp(curp, datos)).toBe(true);
    expect(coincideNombreCurp(curp, { ...datos, apellidoPaterno: 'García' })).toBe(false);
    expect(curpBase({ ...datos, sexo: 'X' })).toBeUndefined();
  });

  it('rechaza el dígito verificador alterado y la fecha inexistente', () => {
    expect(validarCurp('PELA900228XNTRNN05')).toBeUndefined();
    expect(validarCurp('PELA900230XNTRNN06')).toBeUndefined();
  });
});
