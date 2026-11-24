import { expect, it } from 'vitest';
import { crearRegistroTiposTramite } from '../../../packages/domain/src/index.ts';

it('registra las dependencias, los órdenes y las transiciones de agendar', () => {
  const agendar = crearRegistroTiposTramite().obtener('AGENDAR');
  const remoto = ['servicio', 'sede', 'horario', 'requisitos', 'paciente', 'elegibilidad'];
  expect(agendar.ordenPorCanal).toEqual({
    web: remoto,
    whatsapp: remoto,
    app: remoto,
    callcenter: ['paciente', 'servicio', 'sede', 'horario', 'requisitos', 'elegibilidad'],
    clinica: ['paciente', 'servicio', 'sede', 'requisitos', 'horario', 'elegibilidad'],
  });
  expect(agendar.dependencias).toEqual({
    servicio: [], sede: [], paciente: [], horario: ['servicio', 'sede'],
    requisitos: ['servicio'], elegibilidad: ['servicio', 'paciente'],
  });
  expect(agendar.transiciones['apartar']).toEqual({ LISTO_PARA_RESERVAR: 'HORARIO_RESERVADO' });
  expect(agendar.transiciones['confirmar']).toEqual({ HORARIO_RESERVADO: 'CONFIRMADA' });
  expect(() => crearRegistroTiposTramite().obtener('FACTURA')).toThrow(
    expect.objectContaining({ regla: 'TIPO_TRAMITE_NO_REGISTRADO' }),
  );
});
