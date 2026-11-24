import { v7 } from 'uuid';
import { ConversacionWa } from '@noki/adapter-in-http';
import { CasosTramite, ResolvedorContinuidad } from '@noki/application';
import { crearRegistroTiposTramite, PoliticaIdentidad } from '@noki/domain';
import {
  abrirPostgres, AgendaPostgres, BandejaPostgres, CatalogoPostgres, ContactosPostgres, ConversacionesWaPostgres, EventosSinTramitePostgres,
  HiloRepoPostgres, LecturasComandosPostgres, PacientesPostgres, RegistroComandosPostgres,
  RegistroIntentosPostgres, RegistroProcesadosPostgres, RegistroTokensUsadosPostgres, TramiteRepoPostgres,
} from '@noki/adapter-out-postgres';
import { AgendaExternaSd } from '@noki/adapter-out-sd';
import { TokensJose } from '@noki/adapter-out-security';
import { RelojSistema } from './sistema/RelojSistema.ts';

export function componerComandos(opciones: { databaseUrl: string; sdMockUrl: string; tokenSecret: string; demo: boolean },
  avisar: (datos: { correlation_id: string; codigo: string }) => void) {
  const ids = { nuevo: v7 };
  const reloj = new RelojSistema();
  const db = abrirPostgres(opciones.databaseUrl);
  const registro = crearRegistroTiposTramite();
  const tramites = new TramiteRepoPostgres(db, registro, ids);
  const hilos = new HiloRepoPostgres(db);
  const contactos = new ContactosPostgres(db);
  const pacientes = new PacientesPostgres(db);
  const intentos = new RegistroIntentosPostgres(db);
  const tokens = new TokensJose(opciones.tokenSecret, reloj, new RegistroTokensUsadosPostgres(db));
  const lecturas = new LecturasComandosPostgres(db, tramites);
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes, intentos,
    new EventosSinTramitePostgres(db, ids));
  const agendaExterna = new AgendaExternaSd(opciones.sdMockUrl, avisar);
  const casos = new CasosTramite({
    ids, reloj, registro, tramites, hilos, contactos, pacientes, intentos, tokens, resolvedor,
    agenda: new AgendaPostgres(db), agendaExterna,
    catalogo: new CatalogoPostgres(db), politica: new PoliticaIdentidad(), registrarError: avisar,
  });
  const idempotencia = {
    reloj, registro: new RegistroComandosPostgres(db),
    tieneEventos: async (clave: string) => (await lecturas.eventosPorClave(clave)).length > 0,
  };
  const consultas = { lecturas, reloj, emisor: tokens, bandeja: new BandejaPostgres(db), demo: opciones.demo,
    codigoContinuacion: async (id: Parameters<typeof lecturas.datosContinuacion>[0]) => {
      const datos = await lecturas.datosContinuacion(id, reloj.ahora().toISOString());
      return datos ? tokens.emitir(datos) : null;
    },
  };
  const whatsapp = { idempotencia, motor: new ConversacionWa({
    casos, contactos, lecturas, reloj, ids, registro, agendaExterna, conversaciones: new ConversacionesWaPostgres(db),
  }) };
  return { casos, tokens, lecturas, ids, consultas, whatsapp, reloj, procesados: new RegistroProcesadosPostgres(db), solicitarContinuacion: casos.solicitarContinuacion.bind(casos), demo: opciones.demo, idempotencia, cerrar: () => db.destroy() };
}
