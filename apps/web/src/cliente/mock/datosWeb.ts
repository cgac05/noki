import type { ComandoRequest, OfertaCatalogo } from '@noki/contracts';
import type { PasoWeb } from '../demo.ts';

export const CATALOGO_DEMO: OfertaCatalogo = {
  servicioId: '019aff00-0000-7000-8000-000000000003', servicio: 'Paquete US mamario + Papanicolaou',
  sedeId: '019aff00-0000-7000-8000-000000000004', sede: 'Tepic', precioCentavos: 25000,
};

export const TRAMITE_WEB_ID = '019aff00-0000-7000-8000-000000000009';
// Entradas esperadas del mini guion; nunca se entregan en las lecturas.
export const COMANDOS_WEB_ESPERADOS: ComandoRequest[] = [
  { canal: 'web', actor: 'paciente', tipo: 'SeleccionarServicio', tramiteId: TRAMITE_WEB_ID, payload: { servicioId: CATALOGO_DEMO.servicioId } },
  { canal: 'web', actor: 'paciente', tipo: 'SeleccionarSede', tramiteId: TRAMITE_WEB_ID, payload: { sedeId: CATALOGO_DEMO.sedeId } },
];

const respuesta = {
  tramite: { id: TRAMITE_WEB_ID, hiloId: '019aff00-0000-7000-8000-000000000010', tipo: 'AGENDAR', estado: 'COTIZADO', version: 2, servicioId: CATALOGO_DEMO.servicioId, sedeId: CATALOGO_DEMO.sedeId },
  siguientePregunta: { tipo: 'PREGUNTA', casilla: 'horario', pista: { entrada: 'NINGUNA' } }, eventos: [],
} as const;

// Mini guion independiente: estas respuestas no modifican el índice del Flujo A.
export const DATOS_WEB: PasoWeb[] = [
  { vista: { catalogo: CATALOGO_DEMO, cotizacion: null }, respuesta: { tramite: { id: TRAMITE_WEB_ID, hiloId: respuesta.tramite.hiloId, tipo: 'AGENDAR', estado: 'BORRADOR', version: 0 }, siguientePregunta: { tipo: 'COMPLETO' }, eventos: [] } },
  { vista: { catalogo: CATALOGO_DEMO, cotizacion: null }, respuesta: { tramite: { id: TRAMITE_WEB_ID, hiloId: respuesta.tramite.hiloId, tipo: 'AGENDAR', estado: 'BORRADOR', version: 1, servicioId: CATALOGO_DEMO.servicioId }, siguientePregunta: { tipo: 'PREGUNTA', casilla: 'sede', pista: { entrada: 'NINGUNA' } }, eventos: [] } },
  { vista: { catalogo: CATALOGO_DEMO, cotizacion: { precioCentavos: CATALOGO_DEMO.precioCentavos, codigoContinuacion: 'CONTINUAR demo.web.continuacion-opaca' } }, respuesta: { ...respuesta, eventos: [] } },
];
