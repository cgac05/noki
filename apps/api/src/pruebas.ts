import { v7 } from 'uuid';
import type { Writable } from 'node:stream';
import { ConversacionWa, textoAprobacion } from '@noki/adapter-in-http';
import { AprobacionCancelacion, CasosTramite, RelojDemo, ResolvedorContinuidad, TemporizadoresTramite } from '@noki/application';
import { crearRegistroTiposTramite, PoliticaIdentidad } from '@noki/domain';
import {
  AgendaExternaMemoria, AgendaMemoria, BandejaMemoria, CatalogoMemoria, ConversacionesWaMemoria, LecturasMemoria, ContactosMemoria, EventosSinTramiteMemoria,
  HiloRepoMemoria, PacientesMemoria, RegistroComandosMemoria, RegistroIntentosMemoria,
  NotificadorWaMemoria, TokensBotonWaMemoria, ProgramadorMemoria, RegistroTokensUsadosMemoria, RelojFalso, TramiteRepoMemoria,
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
  const opcionesEventos = { claveUnica: true, claves: new Set<string>() };
  const tramites = new TramiteRepoMemoria(opcionesEventos);
  const hilos = new HiloRepoMemoria();
  const pacientes = new PacientesMemoria();
  const contactos = new ContactosMemoria(pacientes);
  const intentos = new RegistroIntentosMemoria();
  const catalogo = new CatalogoMemoria();
  const agenda = new AgendaMemoria();
  const agendaExterna = new AgendaExternaMemoria();
  const sinTramite = new EventosSinTramiteMemoria(opcionesEventos);
  const tokensUsados = new RegistroTokensUsadosMemoria();
  const tokens = new TokensJose(opciones.tokenSecret ?? 'secreto-sintetico-de-pruebas-para-la-api', reloj, tokensUsados);
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes, intentos, sinTramite);
  const lecturas = new LecturasMemoria(tramites, contactos, pacientes, agenda, sinTramite, ids, hilos);
  const demo = opciones.demo ?? true;
  const notificadorWa = new NotificadorWaMemoria();
  const aprobacion = new AprobacionCancelacion({
    demo, reloj, ids, tokens: new TokensBotonWaMemoria(reloj, new RegistroTokensUsadosMemoria(), demo),
    notificador: notificadorWa,
    contactoVigente: contactos.whatsappVigente.bind(contactos),
    buscarContacto: waId => contactos.buscar('whatsapp', waId),
    leerCita: async (pacienteId, tramiteId) =>
      (await lecturas.citasPaciente(pacienteId)).find(cita => cita.tramite.id === tramiteId) ?? null,
    cancelar: (tramiteId, contexto) => casos.cancelar(tramiteId, contexto),
    mensaje: textoAprobacion,
  });
  const casos: CasosTramite = new CasosTramite({
    solicitarAprobacion: tramite => aprobacion.solicitar(tramite),
    ids, reloj, registro, tramites, hilos, contactos, pacientes, intentos, catalogo, agenda, agendaExterna,
    tokens, resolvedor, politica: new PoliticaIdentidad(),
    ...(opciones.registrarError ? { registrarError: opciones.registrarError } : {}),
  });
  const idempotencia = {
    reloj, registro: new RegistroComandosMemoria(),
    tieneEventos: async (clave: string) => (await lecturas.eventosPorClave(clave)).length > 0,
  };
  const codigoContinuacion = async (id: Parameters<typeof lecturas.datosContinuacion>[0], soloAsesor = false) => {
    const datos = await lecturas.datosContinuacion(id, reloj.ahora().toISOString(), tokensUsados, soloAsesor);
    return datos ? tokens.emitir(datos) : null;
  };
  const whatsapp = { idempotencia, motor: new ConversacionWa({
    casos, aprobacion, contactos, lecturas, reloj, ids, registro, agendaExterna, conversaciones: new ConversacionesWaMemoria(),
    codigoContinuacionAsesor: id => codigoContinuacion(id, true),
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
    consultas: { lecturas, reloj, emisor: tokens, bandeja: new BandejaMemoria(), demo: opciones.demo ?? true, codigoContinuacion },
    comandos: { casos, tokens, lecturas, ids, demo: opciones.demo ?? true, idempotencia,
      solicitarContinuacion: casos.solicitarContinuacion.bind(casos) }, whatsapp, relojDemo,
  });
  return { app, casos, tokens, ids, reloj, lecturas, tramites, contactos, pacientes, catalogo, agenda, agendaExterna, temporizadores, sinTramite, notificadorWa };
}
export { io as clienteTiempoReal } from 'socket.io-client';
