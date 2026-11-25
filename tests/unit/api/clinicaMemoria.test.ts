import { expect, it } from 'vitest';
import { crearTiempoReal } from '../../../apps/api/src/tiempoReal.ts';
import { clienteTiempoReal, crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { comprobarClinica } from './bateriaClinica.ts';
import type { PacienteId, SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

it('calcula posiciones por orden de llegada y limita alertas en memoria', async () => {
  const deps = crearApiPruebas();
  const { app, catalogo, ids, lecturas, pacientes, sinTramite } = deps;
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  const pacienteId = ids.nuevo() as PacienteId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false,
    requisitos: [{ tipo: 'ACEPTAR_PREPARACION', texto: 'Preparación' }],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  await pacientes.registrar(pacienteId, { nombre: 'Paciente', apellidoPaterno: 'Demo', fechaNac: '1990-01-01', sexo: 'F' });
  const tiempoReal = crearTiempoReal(app.server, 'https://demo.example', lecturas, deps.reloj);
  const endpoint = await app.listen({ host: '127.0.0.1', port: 0 });
  const socket = clienteTiempoReal(endpoint, { transports: ['websocket'], autoConnect: false });
  try {
    const { a, b } = await comprobarClinica(deps, sinTramite, { sedeId, servicioId, pacienteId });
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    const fila: unknown[] = [];
    socket.on('sede:fila', (valor: unknown) => fila.push(valor));
    const unida: unknown = await socket.timeout(1000).emitWithAck('sala:unirse', 'sede:' + sedeId);
    expect(unida).toBe(true);
    const llegada = deps.tramites.eventos().find(evento => evento.tipo === 'PacienteLlego' && evento.tramiteId === a.id);
    if (!llegada) throw new Error('Falta el evento de llegada.');
    await tiempoReal.manejar(llegada);
    await expect.poll(() => fila).toEqual([{ tramiteId: a.id, posicion: 1 }]);
    await deps.casos.cerrarAtencion(a.id, {
      canal: 'clinica', actor: 'recepcion:demo', nivel: 0, vinculado: false, factores: new Set(),
      idempotencyKey: ids.nuevo(), correlationId: ids.nuevo(),
    });
    for (const evento of deps.tramites.eventos()) {
      if (evento.tipo === 'AtencionCerrada' || evento.tipo === 'TurnoActualizado') await tiempoReal.manejar(evento);
    }
    await expect.poll(() => fila).toEqual([
      { tramiteId: a.id, posicion: 1 }, { tramiteId: a.id, posicion: 0 }, { tramiteId: b.id, posicion: 1 },
    ]);
  } finally {
    socket.close();
    await tiempoReal.cerrar();
    await app.close();
  }
});
