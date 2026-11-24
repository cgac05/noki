import { ConflictoVersion, type EventoDominio, type HiloId, type PacienteId, type Tramite, type TramiteId } from '@noki/domain';
import type { TramiteRepo } from '@noki/application';

export class TramiteRepoMemoria implements TramiteRepo {
  private readonly tramites = new Map<TramiteId, Tramite>();
  private readonly guardados: EventoDominio[] = [];

  async obtener(id: TramiteId): Promise<Tramite | null> {
    return this.tramites.get(id)?.copiaPersistida() ?? null;
  }

  async guardar(tramite: Tramite): Promise<void> {
    const actual = this.tramites.get(tramite.id)?.version ?? 0;
    if (actual !== tramite.versionCargada) throw new ConflictoVersion(tramite.versionCargada, actual);
    this.tramites.set(tramite.id, tramite.copiaPersistida());
    this.guardados.push(...tramite.eventosPendientes());
    tramite.marcarGuardado();
  }

  async abiertosPorPaciente(id: PacienteId): Promise<Tramite[]> {
    return this.abiertos((tramite) => tramite.pacienteId === id);
  }

  async abiertosPorHilo(id: HiloId): Promise<Tramite[]> {
    return this.abiertos((tramite) => tramite.hiloId === id);
  }

  async porFolio(folio: string): Promise<Tramite | null> {
    return [...this.tramites.values()].find((tramite) => tramite.folio === folio)?.copiaPersistida() ?? null;
  }

  todos(): Tramite[] {
    return [...this.tramites.values()].map(tramite => tramite.copiaPersistida());
  }

  eventos(): readonly EventoDominio[] {
    return structuredClone(this.guardados);
  }

  private abiertos(filtro: (tramite: Tramite) => boolean): Tramite[] {
    return [...this.tramites.values()]
      .filter((tramite) => filtro(tramite) && !['ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'EXPIRADO'].includes(tramite.estado))
      .map((tramite) => tramite.copiaPersistida());
  }
}
