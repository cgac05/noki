import type { HistorialPrediccion, LecturasPrediccion } from '@noki/application';
import type { PacienteId, SedeId } from '@noki/domain';

type Asistencia = 'atenciones' | 'inasistencias';

export class LecturasPrediccionMemoria implements LecturasPrediccion {
  private readonly zonas = new Map<SedeId, string>();
  private readonly registros = new Map<PacienteId, { tipo: Asistencia; instante: number }[]>();

  registrarZona(sedeId: SedeId, zona: string): void {
    this.zonas.set(sedeId, zona);
  }

  registrarAsistencia(pacienteId: PacienteId, tipo: Asistencia, instante: string): void {
    const registros = this.registros.get(pacienteId) ?? [];
    registros.push({ tipo, instante: Date.parse(instante) });
    this.registros.set(pacienteId, registros);
  }

  async zonaSede(sedeId: SedeId): Promise<string | null> {
    return this.zonas.get(sedeId) ?? null;
  }

  async historial(pacienteId: PacienteId, antesDe: string): Promise<HistorialPrediccion> {
    const corte = Date.parse(antesDe);
    const historial = { atenciones: 0, inasistencias: 0 };
    for (const { tipo, instante } of this.registros.get(pacienteId) ?? []) {
      if (instante < corte) historial[tipo]++;
    }
    return historial;
  }
}
