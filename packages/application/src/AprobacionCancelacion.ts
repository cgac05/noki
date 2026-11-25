import type { PacienteId, Tramite, TramiteId } from '@noki/domain';
import type { ContextoComando } from './CasosTramite.ts';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { NotificadorWa } from './ports/NotificadorWa.ts';
import type { Reloj } from './ports/Reloj.ts';
import type { BotonWa, TokensBotonWa } from './ports/TokensBotonWa.ts';
import type { CitaLeida } from './ports/lecturas.ts';
import type { Contacto } from './ports/nucleo.ts';

interface DependenciasAprobacion {
  demo: boolean;
  reloj: Reloj;
  ids: GeneradorId;
  tokens: TokensBotonWa;
  contactoVigente(pacienteId: PacienteId, ts: string): Promise<Contacto | null>;
  buscarContacto(waId: string): Promise<Contacto | null>;
  leerCita(pacienteId: PacienteId, tramiteId: TramiteId): Promise<CitaLeida | null>;
  cancelar(tramiteId: TramiteId, contexto: ContextoComando): Promise<unknown>;
  notificador: NotificadorWa;
  mensaje(cita: CitaLeida): string;
}

export class AprobacionCancelacion {
  constructor(private readonly deps: DependenciasAprobacion) {}

  async solicitar(tramite: Tramite): Promise<void> {
    const { demo, reloj, contactoVigente, leerCita, ids, tokens, mensaje, notificador } = this.deps;
    if (!demo || tramite.estado !== 'CONFIRMADA' || !tramite.pacienteId) return;
    const ahora = reloj.ahora();
    const contacto = await contactoVigente(tramite.pacienteId, ahora.toISOString());
    if (!contacto) return;
    const cita = await leerCita(tramite.pacienteId, tramite.id);
    if (!cita) return;
    const jti = ids.nuevo();
    const vencimiento = structuredClone(ahora);
    vencimiento.setTime(ahora.getTime() + 600_000);
    const expiraEn = vencimiento.toISOString();
    const datos = { uso: 'APROBACION', tramiteId: tramite.id, contactoId: contacto.id, jti, expiraEn } as const;
    const cancelar = await tokens.emitir({ ...datos, accion: 'CANCELAR' });
    const conservar = await tokens.emitir({ ...datos, accion: 'CONSERVAR' });
    if (!cancelar || !conservar) return;
    await notificador.enviar(contacto.valor, [{ texto: mensaje(cita), botones: [
      { titulo: 'Sí, cancelar', payload: cancelar }, { titulo: 'No, conservarla', payload: conservar },
    ] }]);
  }

  async responder(waId: string, token: string, idempotencyKey: string, correlationId: string):
  Promise<'CANCELADA' | 'CONSERVADA' | null> {
    const { demo, buscarContacto, tokens } = this.deps;
    if (!demo) return null;
    const contacto = await buscarContacto(waId);
    if (!contacto) return null;
    const boton = await tokens.consumir(token, contacto.id, 'APROBACION');
    if (boton?.uso !== 'APROBACION') return null;
    return this.aplicar(boton, idempotencyKey, correlationId);
  }

  private async aplicar(boton: Extract<BotonWa, { uso: 'APROBACION' }>, idempotencyKey: string, correlationId: string) {
    if (boton.accion === 'CONSERVAR') return 'CONSERVADA';
    await this.deps.cancelar(boton.tramiteId as TramiteId, {
      canal: 'whatsapp', actor: 'paciente', nivel: 0, vinculado: true,
      factores: new Set(['BOTON_APROBACION']), idempotencyKey, correlationId,
    });
    return 'CANCELADA';
  }
}
