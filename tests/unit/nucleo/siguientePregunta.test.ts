import { expect, it } from 'vitest';
import {
  crearRegistroTiposTramite, siguientePregunta, Tramite,
  type Casilla, type HiloId, type PacienteId, type TramiteId,
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

it('ofrece el destinatario como primer paso del paciente', () => {
  expect(siguientePregunta(tramite([]), 'callcenter', registro)).toMatchObject({
    casilla: 'paciente',
    pista: { entrada: 'BOTONES', paso: 'DESTINATARIO', opciones: [
      { payload: 'MI' }, { payload: 'OTRA_PERSONA' },
    ] },
  });
});

it('confirma candidatos con nombres enmascarados y referencias opacas', () => {
  const entidad = iniciarIdentificacion();
  entidad.declararDestinatario('TITULAR', [
    { ref: 'opaca1', pacienteId: 'privado1' as PacienteId, nombreVisible: 'Ana P.' },
    { ref: 'opaca2', pacienteId: 'privado2' as PacienteId, nombreVisible: 'Beto L.' },
  ], contextoIdentificacion);
  const pregunta = siguientePregunta(entidad, 'callcenter', registro);
  expect(pregunta).toMatchObject({
    casilla: 'paciente',
    pista: { paso: 'CONFIRMAR', entrada: 'LISTA', opciones: [
      { titulo: 'Soy Ana P.', payload: 'opaca1' },
      { titulo: 'Soy Beto L.', payload: 'opaca2' },
      { titulo: 'No soy ninguno', payload: 'NINGUNO' },
    ] },
  });
  expect(JSON.stringify(pregunta)).not.toContain('privado');
});

it('captura todos los datos del paciente como sensibles y sin valores iniciales', () => {
  const entidad = iniciarIdentificacion();
  entidad.declararDestinatario('TITULAR', [], contextoIdentificacion);
  const fecha = siguientePregunta(entidad, 'callcenter', registro);
  entidad.guardarFechaNac('1990-02-28');
  const curp = siguientePregunta(entidad, 'callcenter', registro);
  entidad.guardarCurp('PELA900228XNTRNN04');
  const datos = siguientePregunta(entidad, 'callcenter', registro);
  expect([fecha, curp, datos]).toMatchObject([
    { pista: { paso: 'FECHA_NAC', entrada: 'FLOW', campos: [{ id: 'fechaNac' }] } },
    { pista: { paso: 'CURP', entrada: 'FLOW', opciones: [{ payload: 'SIN_CURP' }] } },
    { pista: { paso: 'DATOS', entrada: 'FLOW', campos: [
      { id: 'nombre' }, { id: 'apellidoPaterno' }, { id: 'apellidoMaterno' },
    ] } },
  ]);
  for (const pregunta of [fecha, curp, datos]) {
    if (pregunta.tipo !== 'PREGUNTA') throw new Error('Se esperaba una pregunta.');
    for (const campo of pregunta.pista.campos ?? []) {
      expect(campo.captura).toBe('sensitive');
      expect(campo).not.toHaveProperty('valorInicial');
    }
  }
});

const contextoIdentificacion = {
  canal: 'callcenter', actor: 'asesor:demo', nivelAuth: 0,
  idempotencyKey: 'inicio', correlationId: 'demo', ts: '2026-11-24T12:00:00Z',
} as const;
const iniciarIdentificacion = () => Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId,
  'AGENDAR', registro, contextoIdentificacion);

it('permite extender el registro sin tocar el núcleo', () => {
  const orden = ['paciente'] as const;
  registro.registrar('FACTURA', {
      inactividadHoras: 24,
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
