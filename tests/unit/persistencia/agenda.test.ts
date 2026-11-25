import { expect, it } from 'vitest';
import { AgendaMemoria } from '../../../packages/adapters/memory/src/index.ts';
import type { ReservaId, SedeId, ServicioId, TramiteId } from '../../../packages/domain/src/index.ts';

it('rechaza un horario ocupado y confirma de forma idempotente con el mismo folio', async () => {
  const agenda = new AgendaMemoria();
  const reservaId = 'reserva' as ReservaId;
  const ts = '2026-11-24T12:00:00Z';
  const solicitud = { reservaId, tramiteId: 'tramite' as TramiteId, sedeId: 'sede' as SedeId,
    servicioId: 'servicio' as ServicioId, ts, inicio: '2026-11-25T12:00:00Z', ttlReservaMin: 10 };
  await agenda.apartar(solicitud);
  await expect(agenda.apartar({ ...solicitud, reservaId: 'otra' as ReservaId })).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  await expect(agenda.confirmar(reservaId, '12345678', ts)).resolves.toBeUndefined();
  await expect(agenda.confirmar(reservaId, '12345678', ts)).resolves.toBeUndefined();
  await expect(agenda.confirmar(reservaId, '12345679', ts)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  await agenda.expirar(reservaId);
  await expect(agenda.confirmar(reservaId, '12345678', ts)).resolves.toBeUndefined();
  const pendiente = 'pendiente' as ReservaId;
  await agenda.apartar({ ...solicitud, inicio: '2026-11-25T13:00:00Z', reservaId: pendiente });
  await agenda.expirar(pendiente);
  await agenda.expirar(pendiente);
  await expect(agenda.confirmar(pendiente, '12345679', ts)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
});
