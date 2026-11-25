import { describe, expect, it } from 'vitest';
import { RegistroTiposTramite, type DefinicionTipoTramite } from '../../../packages/domain/src/index.ts';

const definicion: DefinicionTipoTramite = {
  inactividadHoras: 24,
  casillas: ['servicio', 'sede'],
  dependencias: { sede: ['servicio'] },
  ordenPorCanal: {
    web: ['servicio', 'sede'],
    whatsapp: ['servicio', 'sede'],
    app: ['servicio', 'sede'],
    callcenter: ['servicio', 'sede'],
    clinica: ['servicio', 'sede'],
  },
  pistas: {},
  transiciones: {},
  hitos: () => 'BORRADOR',
};

describe('Registro de tipos de trámite', () => {
  it.each([['servicio'], ['servicio', 'servicio']] as const)(
    'rechaza un orden incompleto o repetido (%j)',
    (...orden) => {
      const registro = new RegistroTiposTramite();
      expect(() => registro.registrar('FACTURA', {
        ...definicion,
        ordenPorCanal: { ...definicion.ordenPorCanal, web: orden },
      })).toThrow();
    },
  );

  it('rechaza dependencias cíclicas al registrar', () => {
    const registro = new RegistroTiposTramite();
    expect(() => registro.registrar('FACTURA', {
      ...definicion,
      dependencias: { sede: ['servicio'], servicio: ['sede'] },
    })).toThrow();
  });

  it('resuelve un tipo registrado y rechaza un tipo no registrado', () => {
    const registro = new RegistroTiposTramite();
    registro.registrar('FACTURA', definicion);
    expect(registro.obtener('FACTURA')).toEqual(definicion);
    expect(() => registro.obtener('ADELANTO')).toThrow(
      expect.objectContaining({ regla: 'TIPO_TRAMITE_NO_REGISTRADO' }),
    );
  });
});
