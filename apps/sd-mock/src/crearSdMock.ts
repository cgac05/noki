import Fastify from 'fastify';
import { z } from 'zod';
import { setTimeout as esperar } from 'node:timers/promises';

const citaSchema = z.object({ reservaId: z.uuid(), sedeId: z.uuid(), servicioId: z.uuid(), inicio: z.iso.datetime({ offset: true }) });
const disponibilidadSchema = z.object({ sedeId: z.uuid(), servicioId: z.uuid(), fecha: z.iso.date() });
const simulacionSchema = z.object({
  latenciaMs: z.number().int().min(0).max(30_000),
  falloPorcentaje: z.number().min(0).max(100),
  fallarSiguientes: z.number().int().min(0).optional(),
});
const opcionesSchema = z.object({
  latencia: z.coerce.number().int().min(0).max(30_000).optional(),
  fallo: z.coerce.number().min(0).max(100).optional(),
});
const folioSchema = z.object({ folio: z.string().regex(/^\d{8,9}$/) });

export function crearSdMock(logger = true) {
  const app = Fastify({
    logger: logger ? { level: process.env['LOG_LEVEL'] ?? 'info', redact: ['fechaNac', 'email', 'telefono', 'rfc', 'pin', 'curp'] } : false,
    requestIdLogLabel: 'correlation_id',
  });
  const citas = new Map<string, { folio: string; activa: boolean }>();
  let secuencia = 10_000_000;
  let simulacion = { latenciaMs: 0, falloPorcentaje: 0, fallarSiguientes: 0 };
  const invalidos = { codigo: 'ENTRADA_INVALIDA' };
  app.get('/health', async () => ({ estado: 'ok' }));
  app.put('/simulacion', async (req, res) => {
    const validado = simulacionSchema.safeParse(req.body);
    if (!validado.success) return res.code(400).send(invalidos);
    simulacion = { ...validado.data, fallarSiguientes: validado.data.fallarSiguientes ?? 0 };
    return simulacion;
  });
  app.addHook('preHandler', async (req, res) => {
    if (!req.url.startsWith('/agenda/')) return;
    const opciones = opcionesSchema.safeParse(req.query);
    if (!opciones.success) return res.code(400).send(invalidos);
    const forzado = simulacion.fallarSiguientes > 0;
    if (forzado) simulacion.fallarSiguientes--;
    const fallo = opciones.data.fallo ?? simulacion.falloPorcentaje;
    const latencia = opciones.data.latencia ?? simulacion.latenciaMs;
    if (latencia) await esperar(latencia);
    if (forzado || (fallo > 0 && Math.random() * 100 < fallo)) {
      return res.code(503).send({ codigo: 'AGENDA_NO_DISPONIBLE' });
    }
  });
  app.get('/agenda/disponibilidad', async (req, res) => {
    const validado = disponibilidadSchema.safeParse(req.query);
    if (!validado.success) return res.code(400).send(invalidos);
    const comienzo = Date.parse(validado.data.fecha + 'T07:00:00Z');
    return { horarios: Array.from({ length: 15 }, (_, indice) => new Date(comienzo + indice * 1_800_000).toISOString()) };
  });
  app.post('/agenda/citas', async (req, res) => {
    const validado = citaSchema.safeParse(req.body);
    if (!validado.success) return res.code(400).send(invalidos);
    const { reservaId } = validado.data;
    const anterior = citas.get(reservaId);
    if (anterior) return { folio: anterior.folio };
    const folio = String(secuencia++);
    citas.set(reservaId, { folio, activa: true });
    return { folio };
  });
  app.delete('/agenda/citas/:folio', async (req, res) => {
    const validado = folioSchema.safeParse(req.params);
    if (!validado.success) return res.code(400).send(invalidos);
    const cita = [...citas.values()].find(({ folio }) => folio === validado.data.folio);
    if (cita) cita.activa = false;
    return res.code(204).send();
  });
  return app;
}
