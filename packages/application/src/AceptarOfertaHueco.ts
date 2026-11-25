import {
  PoliticaIdentidad, ReglaViolada, type ContextoOperacion, type Hueco, type ReservaId, type Tramite,
} from '@noki/domain';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { Reloj } from './ports/Reloj.ts';
import type { AgendaExternaPort, AgendaPort } from './ports/nucleo.ts';

interface CitaParaAdelantar {
  hueco: Hueco;
  tramite: Tramite;
  contactoId: string;
}

interface DependenciasAceptacion {
  demo: boolean;
  ids: GeneradorId;
  reloj: Reloj;
  agenda: Pick<AgendaPort, 'apartar' | 'confirmar' | 'liberar'>;
  agendaExterna: Pick<AgendaExternaPort, 'registrarCita' | 'cancelarCita'>;
  buscar(ofertaId: string): Promise<CitaParaAdelantar | null>;
  guardar(hueco: Hueco, tramite: Tramite): Promise<boolean>;
  expirar(ofertaId: string, correlationId: string): Promise<void>;
  perder(ofertaId: string, correlationId: string): Promise<void>;
  registrarError?: (datos: { correlation_id: string; codigo: string }) => void;
}

export class AceptarOfertaHueco {
  private readonly politica = new PoliticaIdentidad();

  constructor(private readonly deps: DependenciasAceptacion) {}

  async ejecutar(ofertaId: string, contactoId: string, operacion: ContextoOperacion):
  Promise<'ACEPTADA' | 'PERDIDA' | 'EXPIRADA' | null> {
    const { demo, agenda, agendaExterna, reloj, ids, buscar, guardar, expirar, perder } = this.deps;
    if (!demo) return null;
    const cita = await buscar(ofertaId);
    if (cita?.contactoId !== contactoId || cita.tramite.estado !== 'CONFIRMADA') return null;
    this.politica.exigir('aceptarOfertaHueco', {
      actor: 'paciente', canal: 'whatsapp', nivel: operacion.nivelAuth, vinculado: true, factores: new Set(['TOKEN']),
    });
    const { hueco, tramite } = cita;
    const { sedeId, recursoId, servicioId, inicio } = hueco.instantanea();
    const oferta = hueco.ofertas.find(o => o.id === ofertaId && o.tramiteId === tramite.id && o.contactoId === contactoId);
    if (oferta?.estado === 'PERDIDA') return 'PERDIDA';
    const anterior = tramite.horario;
    const folioAnterior = tramite.folio;
    const ts = reloj.ahora().toISOString();
    const contexto = { ...operacion, ts };
    if (oferta?.estado !== 'OFRECIDA' || !anterior || !folioAnterior || Date.parse(ts) >= Date.parse(oferta.expiraEn)
      || Date.parse(inicio) >= Date.parse(anterior.inicio)) return null;

    const reservaId = ids.nuevo() as ReservaId;
    const solicitud = { reservaId, sedeId, recursoId, servicioId, tramiteId: tramite.id, inicio, ts, ttlReservaMin: 5 };
    let reserva: Awaited<ReturnType<AgendaPort['apartar']>>;
    try {
      reserva = await agenda.apartar(solicitud);
    } catch (error) {
      if (!(error instanceof ReglaViolada) || error.regla !== 'HORARIO_NO_DISPONIBLE') throw error;
      await perder(ofertaId, contexto.correlationId);
      return 'PERDIDA';
    }

    let folio: string | undefined;
    try {
      folio = await agendaExterna.registrarCita(solicitud, contexto.correlationId);
      contexto.ts = reloj.ahora().toISOString();
      await agenda.confirmar(reserva.reservaId, folio, contexto.ts);
      tramite.adelantar({ ...reserva, inicio, sedeId }, folio, contexto);
      hueco.asignar(ofertaId, contexto);
      if (!await guardar(hueco, tramite)) throw new ReglaViolada('OFERTA_HUECO_INVALIDA');
    } catch {
      await this.liberar(reserva.reservaId, folio, contexto.correlationId);
      await expirar(ofertaId, contexto.correlationId);
      return 'EXPIRADA';
    }
    await this.liberar(anterior.reservaId, folioAnterior, contexto.correlationId);
    return 'ACEPTADA';
  }

  private async liberar(reservaId: ReservaId, folio: string | undefined, correlationId: string): Promise<void> {
    const { agenda, agendaExterna, registrarError } = this.deps;
    const resultados = await Promise.allSettled([
      agenda.liberar(reservaId),
      ...(folio ? [agendaExterna.cancelarCita(folio, correlationId)] : []),
    ]);
    if (resultados.some(r => r.status === 'rejected')) {
      registrarError?.({ correlation_id: correlationId, codigo: 'COMPENSACION_AGENDA_FALLIDA' });
    }
  }
}
