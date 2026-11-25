import type { CitaVista, HuecoVista, MensajeBot, RespuestaComando } from '@noki/contracts';
import { CONTACTO_BETO_DEMO, CONTACTO_CARLA_DEMO, CONTACTO_DEMO } from '../ClienteApi.ts';
import { GUION_FLUJO_A, IDS } from './guionFlujoA.ts';
import type { PasoFixture } from './guionFlujoA.ts';
import { TRAMITE_WEB_ID } from './datosWeb.ts';

export const IDS_FLUJO_C = {
  hiloId: '019aff10-0000-7000-8000-000000000002', pacienteId: '019aff10-0000-7000-8000-000000000011',
  sedeId: IDS.sede, tramiteWebId: TRAMITE_WEB_ID,
};
const tramite = {
  id: '019aff10-0000-7000-8000-000000000001', hiloId: IDS_FLUJO_C.hiloId,
  tipo: 'AGENDAR', estado: 'CONFIRMADA', version: 12, servicioId: IDS.servicio, sedeId: IDS.sede,
} as const;
const respuestaConfirmada: RespuestaComando = { tramite, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] };
const respuestaCancelada: RespuestaComando = { tramite: { ...tramite, estado: 'CANCELADA', version: 13 }, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] };
const cita: CitaVista = { tramite, servicio: 'Ultrasonido abdominal', sede: 'Tepic', inicio: '2026-11-26T16:15:00.000Z', zonaHoraria: 'America/Mazatlan', tokenQr: 'demo.qr.c8L4vR' };

// Textos del guion, concentrados aquí para ajustarlos con el frente A.
// Son datos fijos ficticios de D6 de relleno-huecos; no se aplican reglas del núcleo.
const aprobar = { id: 'aprobar', titulo: 'Sí, cancelar', payload: 'demo.ref.k8M2aV' };
const conservar = { id: 'conservar', titulo: 'No, conservarla', payload: 'demo.ref.r9T6wN' };
const adelantar = { id: 'adelantar', titulo: 'Sí, adelantar', payload: 'demo.ref.z5X3qP' };
const rechazar = { id: 'rechazar', titulo: 'No, gracias', payload: 'demo.ref.t7B2jH' };
const aprobacion: MensajeBot = { tipo: 'botones', texto: '¿Confirmas que quieres cancelar tu cita de Ultrasonido abdominal en Tepic del 26 de noviembre de 2026, 09:15?', botones: [aprobar, conservar] };
const ofertaBeto: MensajeBot = { tipo: 'botones', texto: 'Se liberó un espacio para Ultrasonido abdominal en Tepic el 26 de noviembre de 2026, 09:15. ¿Quieres adelantar tu cita?', botones: [adelantar, rechazar] };
const ofertaCarla: MensajeBot = { tipo: 'botones', texto: 'Se liberó un espacio para Ultrasonido abdominal en Tepic el 3 de diciembre de 2026, 09:15. ¿Quieres adelantar tu cita?', botones: [
  { id: 'adelantar', titulo: 'Sí, adelantar', payload: 'demo.ref.m6D9fA' },
  { id: 'rechazar', titulo: 'No, gracias', payload: 'demo.ref.h4Q8sE' },
] };
const hueco: HuecoVista = {
  id: '019aff10-0000-7000-8000-000000000020', servicio: cita.servicio, sede: cita.sede,
  inicio: cita.inicio, zonaHoraria: cita.zonaHoraria, estado: 'OFRECIDO',
  ofertas: [{ estado: 'OFRECIDA', enviadaEn: '2026-11-25T15:00:00.000Z', expiraEn: '2026-11-25T15:15:00.000Z' }],
};
const metricasIniciales = { porEstado: [{ estado: 'CONFIRMADA' as const, cantidad: 3 }], kpis: { huecosLiberados: 0, huecosRecuperados: 0, horasRecursoRecuperadas: 0, diasAdelantadosPromedio: 0 } };
const metricasCancelada = { porEstado: [{ estado: 'CONFIRMADA' as const, cantidad: 2 }, { estado: 'CANCELADA' as const, cantidad: 1 }], kpis: { huecosLiberados: 1, huecosRecuperados: 0, horasRecursoRecuperadas: 0, diasAdelantadosPromedio: 0 } };
const metricasAdelantada = { porEstado: metricasCancelada.porEstado, kpis: { huecosLiberados: 2, huecosRecuperados: 1, horasRecursoRecuperadas: 0.5, diasAdelantadosPromedio: 7 } };
const lecturasIniciales = {
  ...GUION_FLUJO_A[0]!.lecturas, tramite, tramitesAbiertos: [tramite],
  citasPaciente: [cita], contextoDemo: { hiloId: IDS_FLUJO_C.hiloId, pacienteId: IDS_FLUJO_C.pacienteId, sedeId: IDS.sede },
  fichaHilo: { hiloId: IDS_FLUJO_C.hiloId, nombrePila: 'Ana', telefonoEnmascarado: '•••• 0001', tramites: [tramite], lineaTiempo: [], soloLectura: true, oferta: null, codigoContinuacion: null },
  metricas: metricasIniciales,
};
const lecturasCancelada = {
  ...lecturasIniciales, tramite: respuestaCancelada.tramite, tramitesAbiertos: [], citasPaciente: [{ ...cita, tramite: respuestaCancelada.tramite }],
  fichaHilo: { ...lecturasIniciales.fichaHilo, tramites: [respuestaCancelada.tramite] },
  panelHuecos: [hueco], metricas: metricasCancelada,
};
const definiciones: Array<Omit<PasoFixture, 'paso'> & { id: PasoFixture['paso']['id']; titulo: string }> = [
  {
    id: 'C_INICIO', titulo: 'Flujo C · Cita confirmada en App', espera: null, respuesta: respuestaConfirmada,
    lecturas: lecturasIniciales, mensajes: [], eventosSocket: [], ayuda: 'Abre App y pulsa Cancelar cita para comenzar el Flujo C.',
  },
  {
    id: 'C_APROBACION_PEDIDA', titulo: 'Flujo C · Aprobación en WhatsApp',
    espera: { tipo: 'comando', titulo: 'Cancelar cita', comando: { tipo: 'CancelarCita', canal: 'app', actor: 'paciente', tramiteId: tramite.id, payload: {} } },
    respuesta: respuestaConfirmada, rechazo: { codigo: 'STEP_UP_REQUERIDO', mensaje: 'Se requiere aprobar la cancelación por WhatsApp.' },
    lecturas: lecturasIniciales, mensajes: [], eventosSocket: [{ nombre: 'wa:mensajes', datos: { waId: CONTACTO_DEMO, mensajes: [aprobacion] } }],
    ayuda: 'Abre WhatsApp con el número de Ana y pulsa Sí, cancelar.',
  },
  {
    id: 'C_CANCELADA', titulo: 'Flujo C · Oferta enviada',
    espera: { tipo: 'wa', titulo: aprobar.titulo, mensaje: { waId: CONTACTO_DEMO, payloadBoton: aprobar.payload } },
    respuesta: respuestaCancelada, lecturas: lecturasCancelada, mensajes: [{ tipo: 'texto', texto: 'Tu cita quedó cancelada.' }],
    eventosSocket: [
      { nombre: 'tramite:actualizado', datos: respuestaCancelada.tramite },
      { nombre: 'wa:mensajes', datos: { waId: CONTACTO_BETO_DEMO, mensajes: [ofertaBeto] } },
      { nombre: 'admin:metricas', datos: metricasCancelada.kpis },
    ], ayuda: 'Cambia al número de Beto desde el aviso y pulsa Sí, adelantar.',
  },
  {
    id: 'C_ADELANTADA', titulo: 'Flujo C · Adelanto y efecto dominó',
    espera: { tipo: 'wa', titulo: adelantar.titulo, mensaje: { waId: CONTACTO_BETO_DEMO, payloadBoton: adelantar.payload } },
    respuesta: respuestaCancelada,
    lecturas: { ...lecturasCancelada, metricas: metricasAdelantada, panelHuecos: [
      { ...hueco, id: '019aff10-0000-7000-8000-000000000021', inicio: '2026-12-03T16:15:00.000Z', ofertas: [{ estado: 'OFRECIDA', enviadaEn: '2026-11-25T15:01:00.000Z', expiraEn: '2026-11-25T15:16:00.000Z' }] },
      { ...hueco, estado: 'ASIGNADO', ofertas: [{ ...hueco.ofertas[0]!, estado: 'ACEPTADA' }] },
    ] },
    mensajes: [{ tipo: 'texto', texto: 'Listo, tu cita quedó el 26 de noviembre de 2026, 09:15.' }],
    eventosSocket: [
      { nombre: 'wa:mensajes', datos: { waId: CONTACTO_CARLA_DEMO, mensajes: [ofertaCarla] } },
      { nombre: 'admin:metricas', datos: metricasAdelantada.kpis },
    ], ayuda: 'Revisa el efecto dominó en Admin y la oferta del horario anterior en el número de Carla.',
  },
];
export const GUION_FLUJO_C: PasoFixture[] = definiciones.map(({ id, titulo, ...dato }, indice) => ({ ...dato, paso: { id, titulo, numero: indice + 1, total: definiciones.length } }));
