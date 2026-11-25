import { v7 } from 'uuid';
import type { Writable } from 'node:stream';
import { ConversacionWa } from '@noki/adapter-in-http';
import { CasosTramite, RelojDemo, ResolvedorContinuidad, TemporizadoresTramite } from '@noki/application';
import { crearRegistroTiposTramite, PoliticaIdentidad } from '@noki/domain';
import {
  AgendaExternaMemoria, AgendaMemoria, BandejaMemoria, CatalogoMemoria, ConversacionesWaMemoria, LecturasMemoria, ContactosMemoria, EventosSinTramiteMemoria,
  HiloRepoMemoria, PacientesMemoria, RegistroComandosMemoria, RegistroIntentosMemoria,
  ProgramadorMemoria, RegistroTokensUsadosMemoria, RelojFalso, TramiteRepoMemoria,
} from '@noki/adapter-memory';
import { TokensJose } from '@noki/adapter-out-security';
import { crearApi } from './crearApi.ts';

export function crearApiPruebas(opciones: {
  demo?: boolean; origen?: string; tokenSecret?: string; salidaLog?: Writable;
  registrarError?: (datos: { correlation_id: string; codigo: string }) => void;
} = {}) {
  const ids = { nuevo: v7 };
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const registro = crearRegistroTiposTramite();
  const tramites = new TramiteRepoMemoria();
  const hilos = new HiloRepoMemoria();
  const pacientes = new PacientesMemoria();
  const contactos = new ContactosMemoria(pacientes);
  const intentos = new RegistroIntentosMemoria();
  const catalogo = new CatalogoMemoria();
  const agenda = new AgendaMemoria();
  const agendaExterna = new AgendaExternaMemoria();
  const sinTramite = new EventosSinTramiteMemoria();
  const tokens = new TokensJose(opciones.tokenSecret ?? 'secreto-sintetico-de-pruebas-para-la-api',
    reloj, new RegistroTokensUsadosMemoria());
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes, intentos, sinTramite);
  const casos = new CasosTramite({
    ids, reloj, registro, tramites, hilos, contactos, pacientes, intentos, catalogo, agenda, agendaExterna,
    tokens, resolvedor, politica: new PoliticaIdentidad(),
    ...(opciones.registrarError ? { registrarError: opciones.registrarError } : {}),
  });
  const lecturas = new LecturasMemoria(tramites, contactos, pacientes, agenda, sinTramite, ids, hilos);
  const idempotencia = {
    reloj, registro: new RegistroComandosMemoria(),
    tieneEventos: async (clave: string) => (await lecturas.eventosPorClave(clave)).length > 0,
  };
  const whatsapp = { idempotencia, motor: new ConversacionWa({
    casos, contactos, lecturas, reloj, ids, registro, agendaExterna, conversaciones: new ConversacionesWaMemoria(),
  }) };
  const programador: ProgramadorMemoria = new ProgramadorMemoria(async trabajo => {
    await temporizadores.ejecutar(trabajo);
  });
  const temporizadores = new TemporizadoresTramite({ ids, reloj, registro, tramites, agenda, programador });
  const relojDemo = new RelojDemo(reloj, programador);
  const app = crearApi({
    databaseUrl: 'postgres://demo:demo@127.0.0.1:1/demo', redisUrl: 'redis://127.0.0.1:1', logger: opciones.salidaLog !== undefined,
    ...(opciones.salidaLog ? { salidaLog: opciones.salidaLog } : {}),
    ...(opciones.origen ? { origen: opciones.origen } : {}),
    consultas: { lecturas, reloj, emisor: tokens, bandeja: new BandejaMemoria(), demo: opciones.demo ?? true },
    comandos: { casos, tokens, lecturas, ids, demo: opciones.demo ?? true, idempotencia,
      solicitarContinuacion: casos.solicitarContinuacion.bind(casos) }, whatsapp, relojDemo,
  });
  return { app, casos, tokens, ids, reloj, lecturas, tramites, contactos, pacientes, catalogo, agenda, agendaExterna, temporizadores };
}
export { io as clienteTiempoReal } from 'socket.io-client';
