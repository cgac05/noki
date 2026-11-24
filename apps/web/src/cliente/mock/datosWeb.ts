import type { PasoWeb } from '../provisional.ts';

export const CATALOGO_DEMO = {
  servicioId: '019aff00-0000-7000-8000-000000000003', servicio: 'Paquete US mamario + Papanicolaou',
  sedeId: '019aff00-0000-7000-8000-000000000004', sede: 'Tepic', precioCentavos: 25000,
};

const comando = {
  canal: 'web', actor: 'paciente', tipo: 'SeleccionarSede',
  tramiteId: '019aff00-0000-7000-8000-000000000009', payload: { sedeId: CATALOGO_DEMO.sedeId },
} as const;

const respuesta = {
  tramite: { id: comando.tramiteId, hiloId: '019aff00-0000-7000-8000-000000000010', tipo: 'AGENDAR', estado: 'COTIZADO', version: 1, servicioId: CATALOGO_DEMO.servicioId, sedeId: CATALOGO_DEMO.sedeId },
  siguientePregunta: { tipo: 'PREGUNTA', casilla: 'horario', pista: { entrada: 'NINGUNA' } }, eventos: [],
} as const;

// Mini guion independiente: estas respuestas no modifican el índice del Flujo A.
export const DATOS_WEB: PasoWeb[] = [
  { vista: { catalogo: CATALOGO_DEMO, cotizacion: null, acciones: [{ titulo: 'Cotizar en Tepic', comando }] }, respuesta: { ...respuesta, eventos: [] } },
  { vista: { catalogo: CATALOGO_DEMO, cotizacion: { precioCentavos: CATALOGO_DEMO.precioCentavos, codigoContinuacion: 'CONTINUAR demo.web.continuacion-opaca' }, acciones: [] }, respuesta: { ...respuesta, eventos: [] } },
];
