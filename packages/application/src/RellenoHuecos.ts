import {
  candidatoCompatible, Hueco, ordenarCandidatos, type ContextoOperacion, type EventoDominio, type OfertaHueco,
} from '@noki/domain';
import type { GeneradorId } from './ports/GeneradorId.ts';
import type { Reloj } from './ports/Reloj.ts';
import type { NotificadorWa } from './ports/NotificadorWa.ts';
import type { TokensBotonWa } from './ports/TokensBotonWa.ts';
import type { CandidatoParaOferta, DatosHuecoLiberado, HuecosRepo, LecturasHuecos } from './ports/huecos.ts';

interface DependenciasRelleno {
  demo: boolean;
  ids: GeneradorId;
  reloj: Reloj;
  huecos: HuecosRepo;
  lecturas: LecturasHuecos;
  tokens: TokensBotonWa;
  notificador: NotificadorWa;
  horaLocal(ts: string, zona: string): number;
  textoOferta(datos: DatosHuecoLiberado): string;
  programar(oferta: OfertaHueco, ts: string): Promise<void>;
}

export class RellenoHuecos {
  constructor(private readonly deps: DependenciasRelleno) {}

  async detectar(evento: EventoDominio): Promise<void> {
    if (evento.tipo !== 'CitaCancelada' && evento.tipo !== 'CitaAdelantada') return;
    const { lecturas, huecos, ids } = this.deps;
    const datos = await lecturas.liberada(evento);
    const contexto = this.contexto(evento.correlationId);
    if (!datos || Date.parse(datos.inicio) <= Date.parse(contexto.ts) || await huecos.porOrigen(datos.origenReservaId)) return;
    const { origenReservaId, inicio, sedeId, recursoId, servicioId, tramiteId, hiloId } = datos;
    const hueco = Hueco.detectar({ id: ids.nuevo(), origenReservaId, inicio, sedeId, recursoId, servicioId, tramiteId, hiloId }, contexto);
    await this.ofrecer(hueco, datos, contexto);
  }

  async vencer(ofertaId: string, correlationId: string): Promise<void> {
    await this.cerrar(ofertaId, 'EXPIRADA', correlationId, true);
  }

  async compensar(ofertaId: string, correlationId: string): Promise<void> {
    await this.cerrar(ofertaId, 'EXPIRADA', correlationId);
  }

  async rechazar(ofertaId: string, correlationId: string): Promise<void> {
    if (this.deps.demo) await this.cerrar(ofertaId, 'RECHAZADA', correlationId);
  }

  async perder(ofertaId: string, correlationId: string): Promise<void> {
    await this.cerrar(ofertaId, 'PERDIDA', correlationId);
  }

  async reenviar(oferta: OfertaHueco, datos: DatosHuecoLiberado, contacto: { id: string; valor: string }): Promise<void> {
    if (!this.deps.demo || oferta.estado !== 'OFRECIDA' || oferta.contactoId !== contacto.id
      || Date.parse(oferta.expiraEn) <= this.deps.reloj.ahora().getTime()) return;
    await this.enviar({ contactoId: contacto.id, waId: contacto.valor }, oferta, datos);
  }

  private async cerrar(ofertaId: string, estado: 'EXPIRADA' | 'RECHAZADA' | 'PERDIDA', correlationId: string, exigirVencimiento = false): Promise<void> {
    const hueco = await this.deps.huecos.porOferta(ofertaId);
    const oferta = hueco?.ofertas.find(o => o.id === ofertaId && o.estado === 'OFRECIDA');
    const contexto = this.contexto(correlationId);
    if (!hueco || !oferta || (exigirVencimiento && Date.parse(oferta.expiraEn) > Date.parse(contexto.ts))) return;
    const datos = await this.deps.lecturas.datos(hueco.instantanea().origenReservaId);
    if (!datos) return;
    hueco.cerrarOferta(ofertaId, estado, contexto);
    await this.ofrecer(hueco, datos, contexto);
  }

  private async ofrecer(hueco: Hueco, datos: DatosHuecoLiberado, contexto: ContextoOperacion): Promise<void> {
    const { ids, demo, huecos, lecturas, horaLocal } = this.deps;
    const { ts } = contexto;
    const activas = hueco.ofertas.filter(o => o.estado === 'OFRECIDA');
    const limite = hueco.instantanea().estrategia === 'SECUENCIAL' ? 1 : 5;
    const envios: { candidato: CandidatoParaOferta; ofertaId: string }[] = [];
    if (demo && activas.length === 0) {
      const ofertados = new Set(hueco.ofertas.map(o => o.interesId));
      const hora = horaLocal(ts, datos.zonaHoraria);
      const candidatos = ordenarCandidatos(await lecturas.candidatos(datos, ts)).filter(interes =>
        !ofertados.has(interes.interesId) && candidatoCompatible(datos, interes, datos, ts, {
          horaLocal: hora, enviadasEn: interes.enviadasEn,
        }));
      const vencimiento = structuredClone(this.deps.reloj.ahora());
      vencimiento.setTime(Math.min(Date.parse(datos.inicio), Date.parse(ts) + 900_000));
      const expiraEn = vencimiento.toISOString();
      for (const candidato of candidatos.slice(0, limite)) {
        const { interesId, tramiteId, hiloId } = candidato;
        const ofertaId = ids.nuevo();
        hueco.ofrecer({ id: ofertaId, interesId, tramiteId, hiloId, expiraEn, contactoId: candidato.contactoId, tokenJti: ids.nuevo() }, contexto);
        envios.push({ candidato, ofertaId });
      }
    }
    if (!envios.length && !activas.length) hueco.declararDesierto(contexto);
    if (!await huecos.guardar(hueco)) return;
    const ofertas = hueco.ofertas;
    for (const { candidato, ofertaId } of envios) {
      const oferta = ofertas.find(o => o.id === ofertaId);
      if (!oferta) continue;
      await this.deps.programar(oferta, ts);
      await this.enviar(candidato, oferta, datos);
    }
  }

  private async enviar(candidato: Pick<CandidatoParaOferta, 'contactoId' | 'waId'>, oferta: OfertaHueco, datos: DatosHuecoLiberado): Promise<void> {
    const { tokens, notificador, textoOferta } = this.deps;
    const base = { uso: 'OFERTA', ofertaId: oferta.id, jti: oferta.tokenJti,
      contactoId: candidato.contactoId, expiraEn: oferta.expiraEn } as const;
    const aceptar = await tokens.emitir({ ...base, accion: 'ACEPTAR' });
    const rechazar = await tokens.emitir({ ...base, accion: 'RECHAZAR' });
    if (!aceptar || !rechazar) return;
    await notificador.enviar(candidato.waId, [{ texto: textoOferta(datos), botones: [
      { titulo: 'Sí, adelantar', payload: aceptar }, { titulo: 'No, gracias', payload: rechazar },
    ] }]);
  }

  private contexto(correlationId: string): ContextoOperacion {
    return {
      correlationId, idempotencyKey: this.deps.ids.nuevo(), ts: this.deps.reloj.ahora().toISOString(),
      actor: 'sistema', canal: 'whatsapp', nivelAuth: 0,
    };
  }
}
