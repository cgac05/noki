import type { Server as ServidorHttp } from 'node:http';
import { Server } from 'socket.io';
import {
  ESQUEMAS_EVENTOS_SOCKET, EVENTOS_CLIENTE_SOCKET, EVENTOS_SOCKET, SalaSchema,
  type DatosEventoSocket, type NombreEventoSocket,
} from '@noki/contracts';
import type { LecturasPort, Reloj } from '@noki/application';
import type { EventoDominio } from '@noki/domain';
import { vistaTramite } from '@noki/adapter-in-http';

export function crearTiempoReal(servidor: ServidorHttp, origen: string, lecturas: LecturasPort, reloj: Reloj) {
  const io = new Server(servidor, {
    cors: { origin: origen },
    allowRequest: (peticion, callback) => callback(null, !peticion.headers.origin || peticion.headers.origin === origen),
  });
  io.on('connection', socket => {
    socket.on(EVENTOS_CLIENTE_SOCKET.SALA_UNIRSE, (entrada: unknown, confirmar?: unknown) => {
      const sala = SalaSchema.safeParse(entrada);
      if (sala.success) void socket.join(sala.data);
      if (typeof confirmar === 'function') confirmar(sala.success);
    });
    socket.on(EVENTOS_CLIENTE_SOCKET.SALA_SALIR, (entrada: unknown) => {
      const sala = SalaSchema.safeParse(entrada);
      if (sala.success) void socket.leave(sala.data);
    });
  });

  function emitir<K extends NombreEventoSocket>(salas: string | string[], evento: K, datos: DatosEventoSocket[K]): void {
    io.to(salas).emit(evento, ESQUEMAS_EVENTOS_SOCKET[evento].parse(datos));
  }

  async function manejar(evento: EventoDominio): Promise<void> {
    const hilo = 'hilo:' + evento.hiloId;
    const actual = evento.tramiteId ? await lecturas.tramite(evento.tramiteId) : null;
    if (actual) {
      const salas = ['tramite:' + actual.id, hilo];
      if (actual.pacienteId) salas.push('paciente:' + actual.pacienteId);
      emitir(salas, EVENTOS_SOCKET.TRAMITE_ACTUALIZADO, vistaTramite(actual));
    }
    const linea = await lecturas.lineaTiempo(evento.hiloId);
    if (linea) emitir(hilo, EVENTOS_SOCKET.HILO_LINEA_TIEMPO, { hiloId: evento.hiloId, eventos: linea.slice(-200) });
    emitir('admin', EVENTOS_SOCKET.ADMIN_METRICAS, (await lecturas.metricas()).kpis);
    if (!actual?.sedeId) return;
    const { sedeId, id: tramiteId } = actual;
    if (evento.tipo === 'AtencionCerrada') {
      emitir('sede:' + sedeId, EVENTOS_SOCKET.SEDE_FILA, { tramiteId, posicion: 0 });
    } else if (evento.tipo === 'TurnoActualizado') {
      emitir('sede:' + sedeId, EVENTOS_SOCKET.SEDE_FILA, { tramiteId, posicion: evento.payload.posicion });
    } else if (evento.tipo === 'PacienteLlego') {
      const llegadas = await lecturas.llegadasSede(sedeId, reloj.ahora().toISOString());
      const posicion = llegadas.find(cita => cita.tramite.id === tramiteId)?.posicion;
      if (posicion !== undefined) emitir('sede:' + sedeId, EVENTOS_SOCKET.SEDE_FILA, { tramiteId, posicion });
    }
  }

  return { manejar, emitir, cerrar: () => io.close() };
}
