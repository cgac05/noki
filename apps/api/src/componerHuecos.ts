import type { Kysely } from 'kysely';
import { formatInTimeZone } from 'date-fns-tz';
import { citaAdelantada, ofertaPerdida, textoOferta } from '@noki/adapter-in-http';
import { HuecosPostgres, LecturasHuecosPostgres, type ContactosPostgres, type TramiteRepoPostgres } from '@noki/adapter-out-postgres';
import {
  AceptarOfertaHueco, RellenoHuecos, type AgendaExternaPort, type AgendaPort, type GeneradorId,
  type NotificadorWa, type ProgramadorTemporizadores, type Reloj, type TokensBotonWa,
} from '@noki/application';

interface OpcionesHuecos {
  db: Kysely<unknown>;
  demo: boolean;
  ids: GeneradorId;
  reloj: Reloj;
  tramites: TramiteRepoPostgres;
  contactos: ContactosPostgres;
  agenda: AgendaPort;
  agendaExterna: AgendaExternaPort;
  tokens: TokensBotonWa;
  notificador: NotificadorWa;
  programador?: ProgramadorTemporizadores | undefined;
  avisar(datos: { correlation_id: string; codigo: string }): void;
}

export function componerHuecos(opciones: OpcionesHuecos) {
  const { db, ids, reloj, tramites, contactos, demo, tokens, notificador, agenda, agendaExterna, programador, avisar } = opciones;
  const huecos = new HuecosPostgres(db, ids, tramites);
  const lecturas = new LecturasHuecosPostgres(db, tramites, contactos);
  const casos = new RellenoHuecos({
    demo, ids, reloj, tokens, notificador, huecos, lecturas, textoOferta,
    horaLocal: (ts, zona) => Number(formatInTimeZone(ts, zona, 'H')),
    programar: async (oferta, ahora) => programador?.programar({ tipo: 'OFERTA', ofertaId: oferta.id, venceEn: oferta.expiraEn }, ahora),
  });
  const aceptar = new AceptarOfertaHueco({
    demo, ids, reloj, agenda, agendaExterna,
    guardar: huecos.guardarAdelanto.bind(huecos), expirar: casos.compensar.bind(casos), perder: casos.perder.bind(casos),
    registrarError: avisar,
    buscar: async ofertaId => {
      const hueco = await huecos.porOferta(ofertaId);
      const oferta = hueco?.ofertas.find(o => o.id === ofertaId);
      if (!hueco || !oferta) return null;
      const tramite = await tramites.obtener(oferta.tramiteId);
      return tramite ? { hueco, tramite, contactoId: oferta.contactoId } : null;
    },
  });

  async function responderOferta(waId: string, token: string, clave: string, correlationId: string): Promise<string | null> {
    if (!demo) return null;
    const contacto = await contactos.buscar('whatsapp', waId);
    if (!contacto) return null;
    const boton = await tokens.consumir(token, contacto.id, 'OFERTA');
    if (boton?.uso !== 'OFERTA') return null;
    return huecos.conOferta(boton.ofertaId, async () => {
      const hueco = await huecos.porOferta(boton.ofertaId);
      const oferta = hueco?.ofertas.find(o => o.id === boton.ofertaId);
      if (!hueco || !oferta || oferta.contactoId !== contacto.id) return null;
      if (oferta.estado === 'PERDIDA') return ofertaPerdida;
      if (oferta.estado !== 'OFRECIDA') return null;
      if (boton.accion === 'RECHAZAR') {
        await casos.rechazar(oferta.id, correlationId);
        return 'Gracias por avisarnos.';
      }
      const contexto = { actor: 'paciente', canal: 'whatsapp', nivelAuth: 1, idempotencyKey: clave,
        correlationId, ts: reloj.ahora().toISOString() } as const;
      const resultado = await aceptar.ejecutar(oferta.id, contacto.id, contexto);
      if (resultado === 'PERDIDA') return ofertaPerdida;
      if (resultado !== 'ACEPTADA') return null;
      const datos = await lecturas.datos(hueco.instantanea().origenReservaId);
      const actualizado = await huecos.porOferta(oferta.id);
      for (const otra of actualizado?.ofertas ?? []) {
        if (otra.estado !== 'PERDIDA') continue;
        const competidor = await contactos.whatsappPorId(otra.contactoId);
        if (competidor) await notificador.enviar(competidor.valor, [{ texto: ofertaPerdida }]);
      }
      return datos && citaAdelantada(datos.inicio, datos.zonaHoraria);
    });
  }

  async function reenviar(waId: string): Promise<void> {
    if (!demo) return;
    const contacto = await contactos.buscar('whatsapp', waId);
    if (!contacto) return;
    for (const { ofertaId, origenReservaId } of await lecturas.pendientes(contacto.id, reloj.ahora().toISOString())) {
      const hueco = await huecos.porOrigen(origenReservaId);
      const oferta = hueco?.ofertas.find(o => o.id === ofertaId);
      const datos = await lecturas.datos(origenReservaId);
      if (oferta && datos) await casos.reenviar(oferta, datos, contacto);
    }
  }

  return { detectar: casos.detectar.bind(casos), responderOferta, reenviar,
    vencer: (ofertaId: string) => huecos.conOferta(ofertaId, () => casos.vencer(ofertaId, ids.nuevo())) };
}
