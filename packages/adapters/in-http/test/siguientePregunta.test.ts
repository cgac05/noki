import { expect, expectTypeOf, it } from 'vitest';
import { SiguientePreguntaSchema, type SiguientePregunta } from '@noki/contracts';
import { CASILLAS, crearRegistroTiposTramite, siguientePregunta, type SiguientePreguntaDominio } from '@noki/domain';

it('valida cada salida de siguientePregunta con el contrato de canales', () => {
  expectTypeOf<SiguientePreguntaDominio>().toMatchTypeOf<SiguientePregunta>();
  const registro = crearRegistroTiposTramite();
  for (const pendiente of [...CASILLAS, undefined]) {
    const salida = siguientePregunta({
      tipo: 'AGENDAR',
      casillaLlena: (casilla) => pendiente !== casilla,
    }, 'web', registro);
    expect(SiguientePreguntaSchema.parse(salida)).toEqual(pendiente
      ? expect.objectContaining({ tipo: 'PREGUNTA', casilla: pendiente })
      : { tipo: 'COMPLETO' });
  }
});
