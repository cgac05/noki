import { expect, it } from 'vitest';
import {
  crearRegistroTiposTramite, siguientePregunta, Tramite,
  type Casilla, type HiloId, type TramiteId,
} from '../../../packages/domain/src/index.ts';

const registro = crearRegistroTiposTramite();
const tramite = (casillas: Casilla[]) => ({
  tipo: 'AGENDAR' as const,
  casillaLlena: (casilla: Casilla) => casillas.includes(casilla),
});

it('siguientePregunta respeta dependencias y orden en los cinco canales', () => {
  for (const canal of ['whatsapp', 'web', 'app'] as const) {
    expect(siguientePregunta(tramite([]), canal, registro)).toMatchObject({ casilla: 'servicio' });
    expect(siguientePregunta(tramite(['servicio']), canal, registro)).toMatchObject({ casilla: 'sede' });
    expect(siguientePregunta(tramite(['paciente', 'servicio', 'sede']), canal, registro)).toMatchObject({ casilla: 'horario' });
  }
  for (const canal of ['callcenter', 'clinica'] as const) {
    expect(siguientePregunta(tramite([]), canal, registro)).toMatchObject({ casilla: 'paciente' });
    expect(siguientePregunta(tramite(['paciente']), canal, registro)).toMatchObject({ casilla: 'servicio' });
  }
  expect(siguientePregunta(tramite([...registro.obtener('AGENDAR').casillas]), 'web', registro)).toEqual({ tipo: 'COMPLETO' });
});

it('captura todos los datos del paciente como sensibles y sin valores iniciales', () => {
  const pregunta = siguientePregunta(tramite([]), 'callcenter', registro);
  expect(pregunta).toMatchObject({ casilla: 'paciente', pista: { entrada: 'FLOW' } });
  if (pregunta.tipo !== 'PREGUNTA') throw new Error('Se esperaba una pregunta.');
  expect(pregunta.pista.campos).toHaveLength(4);
  for (const campo of pregunta.pista.campos ?? []) {
    expect(campo.captura).toBe('sensitive');
    expect(campo).not.toHaveProperty('valorInicial');
  }
});

it('permite extender el registro sin tocar el núcleo', () => {
  const orden = ['paciente'] as const;
  registro.registrar('FACTURA', {
    casillas: orden,
    ordenPorCanal: { web: orden, whatsapp: orden, app: orden, callcenter: orden, clinica: orden },
    dependencias: {},
    pistas: { paciente: { entrada: 'FLOW' } },
    transiciones: { expirarPorInactividad: { BORRADOR: 'EXPIRADO' } },
    hitos: () => 'BORRADOR',
  });
  const contexto = {
    canal: 'web', actor: 'paciente', nivelAuth: 0,
    idempotencyKey: 'inicio', correlationId: 'demo', ts: '2026-11-24T12:00:00Z',
  } as const;
  const factura = Tramite.iniciar('factura' as TramiteId, 'hilo' as HiloId, 'FACTURA', registro, contexto);
  expect(siguientePregunta(factura, 'web', registro)).toMatchObject({ casilla: 'paciente' });
  factura.expirarPorInactividad({ ...contexto, idempotencyKey: 'expirar' });
  expect(factura.estado).toBe('EXPIRADO');
});
