import type { CitaVista, ComandoRequest, DatosEventoSocket, EventoVista, NombreEventoSocket, RespuestaComando, SiguientePregunta, SolicitudMensajeWa } from '@noki/contracts';
import { CONTACTO_DEMO } from '../ClienteApi.ts';
import type { PasoGuion } from '../demo.ts';
import type { LecturasCliente } from '../consultas.ts';
import { CATALOGO_DEMO, DATOS_WEB } from './datosWeb.ts';

export const IDS = {
  tramite: '019aff00-0000-7000-8000-000000000001', hilo: '019aff00-0000-7000-8000-000000000002',
  servicio: CATALOGO_DEMO.servicioId, sede: CATALOGO_DEMO.sedeId,
  recurso: '019aff00-0000-7000-8000-000000000005', reserva: '019aff00-0000-7000-8000-000000000006',
  mensaje: '019aff00-0000-7000-8000-000000000007', paciente: '019aff00-0000-7000-8000-000000000011',
  // Tokens opacos ficticios: no son credenciales ni sustituyen la firma del núcleo real.
  tokenQr: 'demo.qr.tepic.token-opaco', tokenContinuacion: 'demo.cc.continuacion-opaca',
} as const;

type EntradaGuion =
  | { tipo: 'comando'; titulo: string; comando: ComandoRequest }
  | { tipo: 'comandos'; titulo: string; comandos: ComandoRequest[]; intermedia: RespuestaComando }
  | { tipo: 'wa'; titulo: string; mensaje: SolicitudMensajeWa };

const llegada = {
  canal: 'clinica', actor: 'recepcion:tepic', tipo: 'RegistrarLlegada', tramiteId: IDS.tramite,
  payload: { token: IDS.tokenQr },
} as const;
const llamar: EntradaGuion = {
  tipo: 'comando', titulo: 'Llamada entrante', comando: { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' } },
};
const cotizar: EntradaGuion = {
  tipo: 'comandos', titulo: 'Cotizar paquete en Tepic', comandos: [
    { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarServicio', tramiteId: IDS.tramite, payload: { servicioId: IDS.servicio } },
    { canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarSede', tramiteId: IDS.tramite, payload: { sedeId: IDS.sede } },
  ],
  intermedia: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'BORRADOR', version: 2, servicioId: IDS.servicio }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'sede', pista: { entrada: 'NINGUNA' } }, eventos: [] },
};
const continuar: EntradaGuion = {
  tipo: 'wa', titulo: 'Continuar por WhatsApp', mensaje: { waId: CONTACTO_DEMO, payloadBoton: 'enviar-continuacion' },
};
const opcionHorario = { id: 'horario-manana', titulo: 'Jueves 26 · 09:15', payload: 'horario:2026-11-26T16:15:00.000Z' };
const opcionAlternativa = { id: 'horario-tarde', titulo: 'Jueves 26 · 12:15', payload: 'ver-horario-tarde' };
const verHorarios = { id: 'ver-horarios', titulo: 'Ver horarios', payload: 'ver-horarios' };
const revisar = { id: 'revisar', titulo: 'Revisar cita', payload: 'revisar-cita' };
const confirmar = { id: 'confirmar', titulo: 'Confirmar cita', payload: 'confirmar-cita' };
const sinPregunta: SiguientePregunta = { tipo: 'COMPLETO' };
const preguntarHorario: SiguientePregunta = { tipo: 'PREGUNTA', casilla: 'horario', pista: { entrada: 'BOTONES', opciones: [verHorarios] } };

type EventoGuion = { [N in NombreEventoSocket]: { nombre: N; datos: DatosEventoSocket[N] } }[NombreEventoSocket];
export interface PasoFixture {
  paso: PasoGuion;
  espera: EntradaGuion | null;
  respuesta: RespuestaComando;
  lecturas: LecturasCliente;
  eventosSocket: EventoGuion[];
  ayuda: string;
  entradasWa?: string[];
}

const evento = (numero: number, tipo: string, canal: EventoVista['canal']): EventoVista => ({
  id: `019aff01-0000-7000-8000-${String(numero).padStart(12, '0')}`, tipo, canal,
  ts: `2026-11-24T15:${String(numero).padStart(2, '0')}:00.000Z`,
});

// Son respuestas prefabricadas: los estados, versiones, preguntas y conteos se declaran por paso.
// No se aplican transiciones, disponibilidad, identidad ni reglas del dominio.
const definiciones: Array<{
  id: PasoGuion['id']; titulo: string; espera: EntradaGuion | null; respuesta: RespuestaComando;
  mensajes: LecturasCliente['conversacion']['mensajes'];
  ayuda: string; soloLectura: boolean; citas: boolean; registrada: boolean; cambiosCanal: number; entradasWa?: string[];
}> = [
  {
    id: 'INICIO', titulo: 'Esperando llamada', espera: null,
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'BORRADOR', version: 0 }, siguientePregunta: sinPregunta, eventos: [] },
    mensajes: [{ tipo: 'texto', texto: 'Comienza la demo en Call Center con una llamada entrante.' }],
    ayuda: 'Abre Call Center y pulsa Llamada entrante para comenzar.', soloLectura: false, citas: false, registrada: false, cambiosCanal: 0,
  },
  {
    id: 'LLAMADA_ENTRANTE', titulo: 'Llamada en Call Center', espera: llamar,
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'BORRADOR', version: 1 }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'servicio', pista: { entrada: 'NINGUNA' } }, eventos: [evento(1, 'TramiteIniciado', 'callcenter')] },
    mensajes: [{ tipo: 'texto', texto: 'El asesor prepara tu cotización en Tepic.' }],
    ayuda: 'El asesor puede cotizar el paquete en Tepic desde Call Center.', soloLectura: false, citas: false, registrada: false, cambiosCanal: 0,
  },
  {
    id: 'COTIZADO', titulo: 'Paquete cotizado en Tepic', espera: cotizar,
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'COTIZADO', version: 3, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: preguntarHorario, eventos: [evento(2, 'ServicioSeleccionado', 'callcenter'), evento(3, 'SedeSeleccionada', 'callcenter'), evento(4, 'CotizacionGenerada', 'callcenter')] },
    mensajes: [{ tipo: 'texto', texto: 'Tu cotización está lista. El asesor puede continuar por WhatsApp.' }],
    ayuda: 'Pulsa Continuar por WhatsApp en Call Center.', soloLectura: false, citas: false, registrada: false, cambiosCanal: 0,
  },
  {
    id: 'CONTINUAR_WA', titulo: 'Continuación en WhatsApp', espera: continuar,
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'COTIZADO', version: 4, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: preguntarHorario, eventos: [evento(5, 'CanalCambiado', 'whatsapp')] },
    mensajes: [{ tipo: 'texto', texto: 'Retomamos en el horario. Tu paquete y la sede Tepic ya están elegidos.' }, { tipo: 'botones', texto: '¿Qué horario prefieres?', botones: [verHorarios] }],
    ayuda: 'Elige Ver horarios para continuar sin repetir servicio ni sede.', soloLectura: false, citas: false, registrada: false, cambiosCanal: 1,
  },
  {
    id: 'ELEGIR_HORARIO', titulo: 'Elegir horario', espera: { tipo: 'wa', titulo: 'Ver horarios', mensaje: { waId: CONTACTO_DEMO, payloadBoton: verHorarios.payload } },
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'LISTO_PARA_RESERVAR', version: 5, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'horario', pista: { entrada: 'LISTA', opciones: [opcionHorario, opcionAlternativa] } }, eventos: [evento(6, 'RequisitoCumplido', 'whatsapp')] },
    mensajes: [{ tipo: 'lista', texto: 'Horarios de demostración en Tepic', secciones: [{ titulo: 'Mañana', filas: [opcionHorario] }, { titulo: 'Mediodía', filas: [opcionAlternativa] }] }],
    ayuda: 'El guion usa Jueves 26 · 09:15. La otra fila permite explorar la lista sin reservar.', soloLectura: true, citas: false, registrada: false, cambiosCanal: 1,
    entradasWa: [`CONTINUAR ${IDS.tokenContinuacion}`, 'Hola'],
  },
  {
    id: 'HORARIO_RESERVADO', titulo: 'Horario reservado', espera: { tipo: 'wa', titulo: opcionHorario.titulo, mensaje: { waId: CONTACTO_DEMO, payloadBoton: opcionHorario.payload } },
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'HORARIO_RESERVADO', version: 6, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'paciente', pista: { entrada: 'BOTONES', opciones: [revisar] } }, eventos: [evento(7, 'HorarioReservado', 'whatsapp')] },
    mensajes: [{ tipo: 'botones', texto: 'Jueves 26 a las 09:15, hora de Tepic. Revisa la cita para confirmar.', botones: [revisar] }],
    ayuda: 'Pulsa Revisar cita para ver el aviso de verificación simulada.', soloLectura: true, citas: false, registrada: false, cambiosCanal: 1,
  },
  {
    id: 'VERIFICACION', titulo: 'Verificación simulada', espera: { tipo: 'wa', titulo: revisar.titulo, mensaje: { waId: CONTACTO_DEMO, payloadBoton: revisar.payload } },
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'HORARIO_RESERVADO', version: 7, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'paciente', pista: { entrada: 'BOTONES', opciones: [confirmar] } }, eventos: [evento(8, 'PacienteReconocido', 'whatsapp')] },
    mensajes: [{ tipo: 'flow', titulo: 'Verificación de identidad', campos: [{ id: 'verificacion', etiqueta: 'Verificación protegida', captura: 'sensitive' }] }, { tipo: 'botones', texto: 'En esta demo la captura está simulada. Puedes confirmar la cita.', botones: [confirmar] }],
    ayuda: 'Pulsa Confirmar cita. No escribas datos sensibles en el chat.', soloLectura: true, citas: false, registrada: false, cambiosCanal: 1,
  },
  {
    id: 'CONFIRMADA', titulo: 'Cita confirmada · App', espera: { tipo: 'wa', titulo: confirmar.titulo, mensaje: { waId: CONTACTO_DEMO, payloadBoton: confirmar.payload } },
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'CONFIRMADA', version: 8, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: sinPregunta, eventos: [evento(9, 'CitaConfirmada', 'whatsapp'), evento(10, 'CanalCambiado', 'app')] },
    mensajes: [{ tipo: 'texto', texto: 'Cita confirmada. Abre App para ver tu QR y Clínica para registrar tu llegada.' }],
    ayuda: 'Abre App para ver el QR y luego Clínica para registrar la llegada.', soloLectura: true, citas: true, registrada: false, cambiosCanal: 2,
  },
  {
    id: 'EN_CLINICA', titulo: 'Llegada registrada · Clínica', espera: { tipo: 'comando', titulo: 'Registrar llegada', comando: llegada },
    respuesta: { tramite: { id: IDS.tramite, hiloId: IDS.hilo, tipo: 'AGENDAR', estado: 'EN_CLINICA', version: 9, servicioId: IDS.servicio, sedeId: IDS.sede }, siguientePregunta: sinPregunta, eventos: [evento(11, 'CanalCambiado', 'clinica'), evento(12, 'PacienteLlego', 'clinica')] },
    mensajes: [{ tipo: 'texto', texto: 'Llegada registrada en Tepic. La atención continúa en clínica.' }],
    ayuda: 'El Flujo A terminó. Consulta Administración o reinicia el guion.', soloLectura: true, citas: true, registrada: true, cambiosCanal: 3,
  },
];

export const GUION_FLUJO_A: PasoFixture[] = definiciones.map((dato, indice) => {
  const lineaTiempo = definiciones.slice(0, indice + 1).flatMap(paso => paso.respuesta.eventos);
  const cita: CitaVista = {
    tramite: dato.respuesta.tramite, servicio: CATALOGO_DEMO.servicio, sede: CATALOGO_DEMO.sede,
    inicio: '2026-11-26T16:15:00.000Z', zonaHoraria: 'America/Mazatlan', tokenQr: IDS.tokenQr,
  };
  const metricas = { porEstado: [{ estado: dato.respuesta.tramite.estado, cantidad: 1 }], kpis: { 'Cambios de canal': dato.cambiosCanal, 'Datos repetidos': 0 } };
  const eventosSocket: EventoGuion[] = [
    { nombre: 'tramite:actualizado', datos: dato.respuesta.tramite },
    { nombre: 'hilo:linea-tiempo', datos: { hiloId: IDS.hilo, eventos: lineaTiempo } },
    { nombre: 'admin:metricas', datos: metricas.kpis },
  ];
  if (dato.id === 'VERIFICACION') eventosSocket.push({ nombre: 'bandeja:mensaje', datos: { mensajeId: IDS.mensaje, canal: 'sms' } });
  if (dato.id === 'EN_CLINICA') eventosSocket.push({ nombre: 'sede:fila', datos: { tramiteId: IDS.tramite, posicion: 1 } });
  return {
    paso: { id: dato.id, titulo: dato.titulo, numero: indice + 1, total: definiciones.length },
    espera: dato.espera, respuesta: dato.respuesta, ayuda: dato.ayuda, eventosSocket,
    ...(dato.entradasWa ? { entradasWa: dato.entradasWa } : {}),
    lecturas: {
      tramite: dato.respuesta.tramite, tramitesAbiertos: indice === 0 ? [] : [dato.respuesta.tramite], catalogo: [CATALOGO_DEMO],
      fichaHilo: { hiloId: IDS.hilo, nombrePila: 'Ana', telefonoEnmascarado: '•••• 0001', tramites: indice === 0 ? [] : [dato.respuesta.tramite], lineaTiempo, soloLectura: dato.soloLectura, oferta: indice >= 2 ? CATALOGO_DEMO : null, codigoContinuacion: indice >= 3 ? `CONTINUAR ${IDS.tokenContinuacion}` : null },
      conversacion: { mensajes: dato.mensajes, siguientePregunta: dato.respuesta.siguientePregunta },
      citasPaciente: dato.citas ? [cita] : [], llegadasSede: dato.citas ? [{ cita, registrada: dato.registrada }] : [],
      bandeja: dato.id === 'VERIFICACION' || dato.citas ? [
        { id: IDS.mensaje, canal: 'sms', asunto: 'Código de demostración', cuerpo: 'Código ficticio: 246810. Solo para esta bandeja simulada.' },
        { id: '019aff00-0000-7000-8000-000000000008', canal: 'email', asunto: 'Aviso de demostración', cuerpo: 'Tu trámite puede continuar en los canales de atención.' },
      ] : [], metricas, lineaTiempo, web: DATOS_WEB[0]!.vista,
    },
  };
});
