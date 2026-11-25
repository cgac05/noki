import { describe, expect, it } from 'vitest';
import { SiguientePreguntaSchema } from '@noki/contracts';
import pistas from '../pruebas/pistasIdentificacion.json';
import { armarIdentificacion } from './identificacion.ts';
import { IDS } from './mock/guionFlujoA.ts';

const pista = (nombre: keyof typeof pistas) => {
  const pregunta = SiguientePreguntaSchema.parse({ tipo: 'PREGUNTA', casilla: 'paciente', pista: pistas[nombre] });
  if (pregunta.tipo !== 'PREGUNTA') throw new Error('Pregunta de prueba inválida');
  return pregunta.pista;
};
describe('Payload guiado por las pistas reales del núcleo', () => {
  it.each([
    ['DESTINATARIO', { opcion: 'MI' }, { paso: 'DESTINATARIO', para: 'MI' }],
    ['DESTINATARIO', { opcion: 'OTRA_PERSONA' }, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }],
    ['CONFIRMAR', { opcion: 'referencia-opaca-demo' }, { paso: 'CONFIRMAR', candidato: 'referencia-opaca-demo' }],
    ['CONFIRMAR', { opcion: 'NINGUNO' }, { paso: 'CONFIRMAR', candidato: null }],
    ['FECHA_NAC', { valores: { fechaNac: ' 2000-01-02 ' } }, { paso: 'FECHA_NAC', fechaNac: '2000-01-02' }],
    ['CURP', { opcion: 'SIN_CURP' }, { paso: 'CURP', curp: null }],
    ['CURP', { valores: { curp: ' pema000102mntxxx00 ' } }, { paso: 'CURP', curp: 'PEMA000102MNTXXX00' }],
    ['DATOS_CON_CURP', { valores: { nombre: ' Ana ', apellidoPaterno: ' Prueba ', apellidoMaterno: ' ' } }, { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Prueba' }],
    ['DATOS', { valores: { nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: '2000-01-02', sexo: 'f', entidadNacimiento: 'nt' } }, { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: '2000-01-02', sexo: 'F', entidadNacimiento: 'NT' }],
    ['DATOS_CON_FECHA', { valores: { nombre: 'Ana', apellidoPaterno: 'Prueba', sexo: 'x', entidadNacimiento: 'ne' } }, { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Prueba', sexo: 'X', entidadNacimiento: 'NE' }],
  ] as const)('traduce %s sin copiar reglas de identidad', (nombre, respuesta, payload) => {
    const resultado = armarIdentificacion(IDS.tramite, pista(nombre), respuesta);
    expect(resultado).toEqual({ valido: true, comando: { tipo: 'IdentificarPaciente', tramiteId: IDS.tramite, canal: 'callcenter', actor: 'asesor:asesor1', payload } });
  });
  it('reinicia con un comando propio sin datos capturados', () => {
    expect(armarIdentificacion(IDS.tramite, pista('CURP'), { reiniciar: true })).toMatchObject({ valido: true, comando: { payload: { paso: 'REINICIAR' } } });
  });
  it('devuelve solo ids al fallar el formato, sin conservar el valor', () => {
    const resultado = armarIdentificacion(IDS.tramite, pista('CURP'), { valores: { curp: 'valor-invalido' } });
    expect(resultado).toEqual({ valido: false, campos: ['curp'] });
    expect(JSON.stringify(resultado)).not.toContain('valor-invalido');
  });
  it('rechaza opciones ajenas y pasos desconocidos', () => {
    expect(() => armarIdentificacion(IDS.tramite, pista('DESTINATARIO'), { opcion: 'AJENA' })).toThrow();
    expect(() => armarIdentificacion(IDS.tramite, { entrada: 'BOTONES', paso: 'DESCONOCIDO' } as unknown as ReturnType<typeof pista>, {})).toThrow();
  });
});
