import { z } from 'zod';
import { EventoVistaSchema, TramiteVistaSchema } from './comandos.ts';
import { CanalSchema, EstadoTramiteSchema } from './vocabulario.ts';

export const OfertaCatalogoSchema = z.object({
  servicioId: z.uuidv7(), servicio: z.string().min(1),
  sedeId: z.uuidv7(), sede: z.string().min(1), precioCentavos: z.number().int().nonnegative(),
});
export type OfertaCatalogo = z.infer<typeof OfertaCatalogoSchema>;

const ZonaHorariaSchema = z.string().refine(valor => {
  try { new Intl.DateTimeFormat('es-MX', { timeZone: valor }); return true; } catch { return false; }
}, { message: 'Se requiere una zona horaria IANA válida.' });

export const CitaVistaSchema = z.object({
  tramite: TramiteVistaSchema, servicio: z.string().min(1), sede: z.string().min(1),
  inicio: z.string().datetime(), zonaHoraria: ZonaHorariaSchema,
  // El núcleo firma y consume el token; el contrato impide usar el folio en su lugar.
  tokenQr: z.string().min(1).refine(valor => !/^\d{8,9}$/.test(valor), { message: 'El QR requiere un token firmado de un solo uso, no un folio.' }),
});
export type CitaVista = z.infer<typeof CitaVistaSchema>;

export const FichaHiloSchema = z.object({
  hiloId: z.uuidv7(), nombrePila: z.string().min(1).nullable(), telefonoEnmascarado: z.string().regex(/^•••• \d{4}$/).nullable(),
  tramites: z.array(TramiteVistaSchema), lineaTiempo: z.array(EventoVistaSchema), soloLectura: z.boolean(),
  oferta: OfertaCatalogoSchema.nullable(), codigoContinuacion: z.string().nullable(),
});
export type FichaHilo = z.infer<typeof FichaHiloSchema>;

export const LlegadaVistaSchema = z.object({
  cita: CitaVistaSchema, registrada: z.boolean(), posicion: z.number().int().positive().optional(),
}).refine(llegada => llegada.registrada || llegada.posicion === undefined, {
  path: ['posicion'], message: 'Solo una llegada registrada puede tener posición.',
});
export type LlegadaVista = z.infer<typeof LlegadaVistaSchema>;

export const AlertaSeguridadSchema = z.object({
  id: z.uuidv7(), tipo: z.literal('INTENTO_VERIFICACION_FALLIDO'), canal: CanalSchema,
  ts: z.string().datetime(), intentos: z.number().int().positive(), bloqueado: z.boolean(),
  hiloId: z.uuidv7().nullable(),
});
export type AlertaSeguridad = z.infer<typeof AlertaSeguridadSchema>;
export const HuecoVistaSchema = z.object({
  id: z.uuidv7(),
  servicio: z.string().min(1), sede: z.string().min(1),
  inicio: z.string().datetime(), zonaHoraria: ZonaHorariaSchema,
  estado: z.enum(['DETECTADO', 'OFRECIDO', 'ASIGNADO', 'DESIERTO']),
  ofertas: z.array(z.object({
    estado: z.enum(['OFRECIDA', 'ACEPTADA', 'RECHAZADA', 'EXPIRADA', 'PERDIDA']),
    enviadaEn: z.string().datetime(), expiraEn: z.string().datetime(),
  })),
});
export type HuecoVista = z.infer<typeof HuecoVistaSchema>;

export const MensajeBandejaSchema = z.object({
  id: z.uuidv7(), canal: z.enum(['sms', 'email']), asunto: z.string().min(1), cuerpo: z.string().min(1),
});
export type MensajeBandeja = z.infer<typeof MensajeBandejaSchema>;

export const MetricasVistaSchema = z.object({
  porEstado: z.array(z.object({ estado: EstadoTramiteSchema, cantidad: z.number().int().nonnegative() })),
  kpis: z.record(z.string(), z.number()),
});
export type MetricasVista = z.infer<typeof MetricasVistaSchema>;

export const ContextoDemoSchema = z.object({
  hiloId: z.uuidv7().nullable(), pacienteId: z.uuidv7().nullable(), sedeId: z.uuidv7().nullable(),
});
export type ContextoDemo = z.infer<typeof ContextoDemoSchema>;

interface DefinicionConsulta {
  ruta: string;
  parametros: z.ZodType;
  respuesta: z.ZodType;
  soloDemo?: true;
}

// Todas las entradas representan consultas GET; las claves conservan sus esquemas concretos.
export const RUTAS_CONSULTAS = {
  tramite: { ruta: '/api/tramites/:tramiteId', parametros: z.object({ tramiteId: z.uuidv7() }), respuesta: TramiteVistaSchema },
  lineaTiempo: { ruta: '/api/hilos/:hiloId/linea-tiempo', parametros: z.object({ hiloId: z.uuidv7() }), respuesta: z.array(EventoVistaSchema) },
  tramitesAbiertos: { ruta: '/api/pacientes/:pacienteId/tramites-abiertos', parametros: z.object({ pacienteId: z.uuidv7() }), respuesta: z.array(TramiteVistaSchema) },
  catalogo: { ruta: '/api/catalogo', parametros: z.object({}), respuesta: z.array(OfertaCatalogoSchema) },
  fichaHilo: { ruta: '/api/hilos/:hiloId/ficha', parametros: z.object({ hiloId: z.uuidv7() }), respuesta: FichaHiloSchema },
  citasPaciente: { ruta: '/api/pacientes/:pacienteId/citas', parametros: z.object({ pacienteId: z.uuidv7() }), respuesta: z.array(CitaVistaSchema) },
  llegadasSede: { ruta: '/api/sedes/:sedeId/llegadas', parametros: z.object({ sedeId: z.uuidv7() }), respuesta: z.array(LlegadaVistaSchema) },
  metricas: { ruta: '/api/admin/kpis', parametros: z.object({}), respuesta: MetricasVistaSchema },
  alertasSeguridad: {
    ruta: '/api/admin/alertas', parametros: z.object({}),
    respuesta: z.array(AlertaSeguridadSchema).max(50),
  },
  panelHuecos: {
    ruta: '/api/admin/huecos', parametros: z.object({}),
    respuesta: z.array(HuecoVistaSchema).max(50),
  },
  bandeja: { ruta: '/api/demo/bandeja', parametros: z.object({}), respuesta: z.array(MensajeBandejaSchema), soloDemo: true },
  contextoDemo: { ruta: '/api/demo/contexto', parametros: z.object({}), respuesta: ContextoDemoSchema, soloDemo: true },
} as const satisfies Record<string, DefinicionConsulta>;

export type NombreConsulta = keyof typeof RUTAS_CONSULTAS;
export type ParametrosConsulta<N extends NombreConsulta> = z.infer<(typeof RUTAS_CONSULTAS)[N]['parametros']>;
export type RespuestaConsulta<N extends NombreConsulta> = z.infer<(typeof RUTAS_CONSULTAS)[N]['respuesta']>;

export function rutaConsulta<N extends NombreConsulta>(nombre: N, parametros: ParametrosConsulta<N>): string {
  const definicion = RUTAS_CONSULTAS[nombre];
  const valores = definicion.parametros.parse(parametros);
  let ruta: string = definicion.ruta;
  for (const [clave, valor] of Object.entries(valores)) {
    if (typeof valor === 'string') ruta = ruta.replace(`:${clave}`, encodeURIComponent(valor));
  }
  return ruta;
}
