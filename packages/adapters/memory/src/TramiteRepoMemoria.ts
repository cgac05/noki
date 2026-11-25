import { ConflictoVersion, type EventoDominio, type HiloId, type PacienteId, type SedeId, type Tramite, type TramiteId } from '@noki/domain';
import type { TramiteRepo } from '@noki/application';
import { formatInTimeZone } from 'date-fns-tz';

export class TramiteRepoMemoria implements TramiteRepo {
  private readonly tramites = new Map<TramiteId, Tramite>();
  private readonly guardados: EventoDominio[] = [];

  private readonly zonas = new Map<SedeId, string>();

  registrarZonaSede(id: SedeId, zona: string): void {
    this.zonas.set(id, zona);
  }

  zonaSede(id: SedeId): string | null {
    return this.zonas.get(id) ?? null;
  }

  citasSede(id: SedeId, ts: string): Tramite[] {
    const zona = this.zonaSede(id);
    if (!zona) return [];
    const dia = formatInTimeZone(ts, zona, 'yyyy-MM-dd');
    return this.todos().flatMap(tramite => {
      const inicio = tramite.horario?.inicio;
      return tramite.sedeId === id && inicio && ['CONFIRMADA', 'EN_CLINICA'].includes(tramite.estado)
        && formatInTimeZone(inicio, zona, 'yyyy-MM-dd') >= dia ? [{ tramite, inicio }] : [];
    }).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.tramite.id.localeCompare(b.tramite.id))
      .slice(0, 50).map(({ tramite }) => tramite);
  }

  async filaSede(id: SedeId, ts: string): Promise<TramiteId[]> {
    const llegadas = new Map<TramiteId, number>();
    for (const evento of this.guardados) {
      if (evento.tipo !== 'PacienteLlego' || !evento.tramiteId) continue;
      const instante = Date.parse(evento.ts);
      llegadas.set(evento.tramiteId, Math.min(instante, llegadas.get(evento.tramiteId) ?? instante));
    }
    return this.citasSede(id, ts).filter(tramite => tramite.estado === 'EN_CLINICA' && llegadas.has(tramite.id))
      .map(tramite => tramite.id)
      .sort((a, b) => llegadas.get(a)! - llegadas.get(b)! || a.localeCompare(b));
  }

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
