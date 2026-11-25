import type { ContextoOperacion } from '../Tramite.ts';
import { ReglaViolada } from '../errores.ts';
import type { EventoDominio, PayloadsEvento } from '../eventos.ts';
import type { HiloId, RecursoId, ReservaId, SedeId, ServicioId, TramiteId } from '../identificadores.ts';
import { elegirEstrategia, type EstrategiaHueco } from './candidatos.ts';

interface ReferenciaCita { tramiteId: TramiteId; hiloId: HiloId }

export interface OrigenHueco extends ReferenciaCita {
  id: string;
  sedeId: SedeId;
  recursoId: RecursoId;
  servicioId: ServicioId;
  origenReservaId: ReservaId;
  inicio: string;
}

export interface NuevaOferta extends ReferenciaCita {
  id: string;
  interesId: string;
  tokenJti: string;
  contactoId: string;
  expiraEn: string;
}

export interface OfertaHueco extends NuevaOferta {
  estado: 'OFRECIDA' | 'ACEPTADA' | 'RECHAZADA' | 'EXPIRADA' | 'PERDIDA';
  enviadaEn: string;
}

export interface HuecoInstantanea extends OrigenHueco {
  estado: 'DETECTADO' | 'OFRECIDO' | 'ASIGNADO' | 'DESIERTO';
  estrategia: EstrategiaHueco;
  creadoEn: string;
  version: number;
  ofertas: OfertaHueco[];
}

type TipoEvento = 'HuecoLiberado' | 'HuecoAsignado' | 'HuecoDesierto' | 'OfertaEnviada'
  | 'OfertaAceptada' | 'OfertaRechazada' | 'OfertaExpirada' | 'OfertaPerdida';
type EventoHueco = {
  [T in TipoEvento]: { tipo: T; payload: PayloadsEvento[T] };
}[TipoEvento];

export class Hueco {
  private readonly pendientes: EventoDominio[] = [];
  readonly versionCargada: number;

  private constructor(private readonly datos: HuecoInstantanea) {
    this.versionCargada = datos.version;
  }

  static detectar(origen: OrigenHueco, contexto: ContextoOperacion): Hueco {
    const estrategia = elegirEstrategia(origen.inicio, contexto.ts);
    const agregado = new Hueco({ ...origen, estrategia, creadoEn: contexto.ts, version: 0, estado: 'DETECTADO', ofertas: [] });
    const { id, sedeId, recursoId, servicioId, inicio } = origen;
    agregado.anotar(origen, contexto, { tipo: 'HuecoLiberado', payload: { huecoId: id, sedeId, recursoId, servicioId, inicio, estrategia } });
    return agregado;
  }

  static rehidratar(datos: HuecoInstantanea): Hueco { return new Hueco(structuredClone(datos)); }
  instantanea(): HuecoInstantanea { return structuredClone(this.datos); }
  eventosPendientes(): readonly EventoDominio[] { return structuredClone(this.pendientes); }
  get estado() { return this.datos.estado; }
  get ofertas(): readonly OfertaHueco[] { return structuredClone(this.datos.ofertas); }

  ofrecer(nueva: NuevaOferta, contexto: ContextoOperacion): void {
    this.exigirAbierto();
    const limite = this.datos.estrategia === 'OLEADA' ? 5 : 1;
    if (this.datos.ofertas.filter(o => o.estado === 'OFRECIDA').length >= limite
      || this.datos.ofertas.some(o => o.id === nueva.id || o.interesId === nueva.interesId)
      || !(Date.parse(nueva.expiraEn) > Date.parse(contexto.ts))) {
      throw new ReglaViolada('OFERTA_HUECO_INVALIDA');
    }
    this.datos.estado = 'OFRECIDO';
    this.datos.ofertas.push({ ...nueva, estado: 'OFRECIDA', enviadaEn: contexto.ts });
    this.anotar(nueva, contexto, { tipo: 'OfertaEnviada',
      payload: { huecoId: this.datos.id, ofertaId: nueva.id, expiraEn: nueva.expiraEn } });
  }

  cerrarOferta(id: string, estado: 'RECHAZADA' | 'EXPIRADA' | 'PERDIDA', contexto: ContextoOperacion): void {
    this.exigirAbierto();
    const oferta = this.vigente(id);
    const tipos = { RECHAZADA: 'OfertaRechazada', EXPIRADA: 'OfertaExpirada', PERDIDA: 'OfertaPerdida' } as const;
    oferta.estado = estado;
    this.anotar(oferta, contexto, { tipo: tipos[estado], payload: { huecoId: this.datos.id, ofertaId: id } });
  }

  asignar(ofertaId: string, contexto: ContextoOperacion): void {
    this.exigirAbierto();
    const ganadora = this.vigente(ofertaId);
    if (!(Date.parse(contexto.ts) < Date.parse(ganadora.expiraEn))) throw new ReglaViolada('OFERTA_HUECO_INVALIDA');
    ganadora.estado = 'ACEPTADA';
    this.anotar(ganadora, contexto, { tipo: 'OfertaAceptada', payload: { huecoId: this.datos.id, ofertaId } });
    for (const oferta of this.datos.ofertas.filter(o => o.estado === 'OFRECIDA')) {
      this.cerrarOferta(oferta.id, 'PERDIDA', contexto);
    }
    this.datos.estado = 'ASIGNADO';
    this.anotar(this.datos, contexto, { tipo: 'HuecoAsignado', payload: { huecoId: this.datos.id, ofertaId } });
  }

  declararDesierto(contexto: ContextoOperacion): void {
    this.exigirAbierto();
    if (this.datos.ofertas.some(o => o.estado === 'OFRECIDA')) throw new ReglaViolada('HUECO_CON_OFERTAS');
    this.datos.estado = 'DESIERTO';
    this.anotar(this.datos, contexto, { tipo: 'HuecoDesierto', payload: { huecoId: this.datos.id } });
  }

  private exigirAbierto(): void {
    if (this.estado === 'ASIGNADO' || this.estado === 'DESIERTO') throw new ReglaViolada('HUECO_CERRADO');
  }

  private vigente(id: string): OfertaHueco {
    const oferta = this.datos.ofertas.find(o => o.id === id && o.estado === 'OFRECIDA');
    if (!oferta) throw new ReglaViolada('OFERTA_HUECO_INVALIDA');
    return oferta;
  }

  private anotar({ tramiteId, hiloId }: ReferenciaCita, contexto: ContextoOperacion, evento: EventoHueco): void {
    const version = ++this.datos.version;
    this.pendientes.push({ ...evento, ...contexto, tramiteId, hiloId, version,
      idempotencyKey: contexto.idempotencyKey.split(':')[0] + ':' + version });
  }
}
