import { expect, it } from 'vitest';
import { EventosSinTramiteMemoria, TramiteRepoMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { Tramite, crearRegistroTiposTramite, type HiloId, type SedeId, type TramiteId } from '../../../packages/domain/src/index.ts';

const contexto = {
  canal: 'callcenter', actor: 'asesor:demo', nivelAuth: 1,
  correlationId: 'correlacion', idempotencyKey: 'clave', ts: '2026-11-25T12:00:00Z',
} as const;
const hiloId = 'hilo' as HiloId;
const iniciar = () => Tramite.iniciar('tramite' as TramiteId, hiloId, 'AGENDAR', crearRegistroTiposTramite(), contexto);

it('rechaza una clave repetida y conserva la versión guardada y los pendientes', async () => {
  const repo = new TramiteRepoMemoria({ claveUnica: true });
  const tramite = iniciar();
  await repo.guardar(tramite);
  const version = tramite.version;
  tramite.seleccionarSede('sede' as SedeId, null, contexto);
  const pendientes = tramite.eventosPendientes();
  await expect(repo.guardar(tramite)).rejects.toThrow(/clave de idempotencia repetida/i);
  expect((await repo.obtener(tramite.id))?.version).toBe(version);
  expect(repo.eventos()).toHaveLength(1);
  expect(tramite.eventosPendientes()).toEqual(pendientes);
});

it('rechaza duplicados en un lote y comparte las claves entre los dos adaptadores', async () => {
  const opciones = { claveUnica: true, claves: new Set<string>() } as const;
  const repo = new TramiteRepoMemoria(opciones);
  const sinTramite = new EventosSinTramiteMemoria(opciones);
  const fallo = {
    ...contexto, tipo: 'IntentoVerificacionFallido', payload: { metodo: 'TELEFONO_FECHA_NAC', intentos: 1 },
    hiloId, tramiteId: null, version: 0,
  } as const;
  await expect(sinTramite.agregar([fallo, fallo])).rejects.toThrow(/clave de idempotencia repetida/i);
  expect(sinTramite.eventos()).toEqual([]);
  const tramite = iniciar();
  await repo.guardar(tramite);
  await expect(sinTramite.agregar([fallo])).rejects.toThrow(/clave de idempotencia repetida/i);
  const claveNueva = 'otra-clave';
  await sinTramite.agregar([{ ...fallo, idempotencyKey: claveNueva }]);
  tramite.seleccionarSede('sede' as SedeId, null, { ...contexto, idempotencyKey: claveNueva });
  await expect(repo.guardar(tramite)).rejects.toThrow(/clave de idempotencia repetida/i);
  expect(repo.eventos()).toHaveLength(1);
  expect(sinTramite.eventos()).toHaveLength(1);
});
