import { TramiteVistaSchema } from '@noki/contracts';
import type { Tramite } from '@noki/domain';

export function vistaTramite(tramite: Tramite) {
  const horario = tramite.horario;
  return TramiteVistaSchema.parse({
    id: tramite.id, hiloId: tramite.hiloId, tipo: tramite.tipo, estado: tramite.estado,
    version: tramite.version, servicioId: tramite.servicioId, sedeId: tramite.sedeId,
    ...(horario ? { horario: {
      reservaId: horario.reservaId, inicio: horario.inicio,
      ...(tramite.estado === 'HORARIO_RESERVADO' ? { expiraEn: horario.expiraEn } : {}),
    } } : {}),
  });
}
