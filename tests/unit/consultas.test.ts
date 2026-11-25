import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AlertaSeguridadSchema, CitaVistaSchema, FichaHiloSchema, LlegadaVistaSchema, MensajeBandejaSchema,
  MetricasVistaSchema, OfertaCatalogoSchema, ContextoDemoSchema, RUTAS_CONSULTAS, rutaConsulta,
} from '../../packages/contracts/src/index.ts';
import type { CitaVista, NombreConsulta, ParametrosConsulta, RespuestaConsulta } from '../../packages/contracts/src/index.ts';

const ids = {
  tramite: '019aff00-0000-7000-8000-000000000001', hilo: '019aff00-0000-7000-8000-000000000002',
  servicio: '019aff00-0000-7000-8000-000000000003', sede: '019aff00-0000-7000-8000-000000000004',
  paciente: '019aff00-0000-7000-8000-000000000005', mensaje: '019aff00-0000-7000-8000-000000000006',
};
const tramite = { id: ids.tramite, hiloId: ids.hilo, tipo: 'AGENDAR', estado: 'CONFIRMADA', version: 7 } as const;
const oferta = { servicioId: ids.servicio, servicio: 'Paquete US mamario + Papanicolaou', sedeId: ids.sede, sede: 'Tepic', precioCentavos: 25000 };
const cita = { tramite, servicio: oferta.servicio, sede: oferta.sede, inicio: '2026-11-26T16:15:00.000Z', zonaHoraria: 'America/Mazatlan', tokenQr: 'demo.token-opaco-de-cita' };
const ficha = { hiloId: ids.hilo, nombrePila: 'Ana', telefonoEnmascarado: '•••• 0001', tramites: [tramite], lineaTiempo: [], soloLectura: true, oferta, codigoContinuacion: null };
const alerta = { id: ids.mensaje, tipo: 'INTENTO_VERIFICACION_FALLIDO', canal: 'whatsapp', ts: cita.inicio, intentos: 3, bloqueado: true, hiloId: null };

describe('Modelos compartidos de consultas', () => {
  it.each(['12345678', '123456789'])('Token del QR no es el folio: rechaza %s', tokenQr => {
    expect(CitaVistaSchema.safeParse({ ...cita, tokenQr }).success).toBe(false);
  });

  it('Cita válida: valida UTC, zona de Tepic y tipos derivados exportados', () => {
    const resultado = CitaVistaSchema.parse(cita);
    expect(resultado).toEqual(cita);
    expectTypeOf(resultado).toEqualTypeOf<CitaVista>();
    expectTypeOf<RespuestaConsulta<'citasPaciente'>>().toEqualTypeOf<CitaVista[]>();
    expectTypeOf<ParametrosConsulta<'citasPaciente'>>().toEqualTypeOf<{ pacienteId: string }>();
    expectTypeOf<'citasPaciente'>().toExtend<NombreConsulta>();
  });

  it('Zona horaria inválida: indica el campo zonaHoraria', () => {
    const resultado = CitaVistaSchema.safeParse({ ...cita, zonaHoraria: 'Tepic/Centro' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.path).toEqual(['zonaHoraria']);
  });

  it.each([250.5, -1])('Precio en centavos: rechaza el monto %s', precioCentavos => {
    expect(OfertaCatalogoSchema.safeParse({ ...oferta, precioCentavos }).success).toBe(false);
  });

  it('acepta un precio de 25000 centavos y rechaza fechas sin UTC y token vacío', () => {
    expect(OfertaCatalogoSchema.parse(oferta).precioCentavos).toBe(25000);
    expect(CitaVistaSchema.safeParse({ ...cita, inicio: '2026-11-26T09:15:00-07:00' }).success).toBe(false);
    expect(CitaVistaSchema.safeParse({ ...cita, tokenQr: '' }).success).toBe(false);
  });

  it('Ficha sin acciones: descarta comandos y claves desconocidas al validar', () => {
    const resultado = FichaHiloSchema.parse({ ...ficha, acciones: [{ tipo: 'ConfirmarCita' }], fechaNac: 'dato no autorizado', email: 'dato no autorizado' });
    expect(resultado).toEqual(ficha);
    expect(resultado).not.toHaveProperty('acciones');
    expect(resultado).not.toHaveProperty('fechaNac');
    expect(resultado).not.toHaveProperty('email');
  });

  it('Llegada sin comando: descarta la acción', () => {
    expect(LlegadaVistaSchema.parse({ cita, registrada: false, accion: { tipo: 'RegistrarLlegada' } })).toEqual({ cita, registrada: false });
  });

  it('acepta una posición positiva entera solo cuando la llegada está registrada', () => {
    const llegada = { cita, registrada: true };
    expect(LlegadaVistaSchema.parse({ ...llegada, posicion: 2 })).toEqual({ ...llegada, posicion: 2 });
    expect(LlegadaVistaSchema.parse(llegada)).toEqual(llegada);
    expect(LlegadaVistaSchema.safeParse({ ...llegada, registrada: false, posicion: 1 }).success).toBe(false);
    expect(LlegadaVistaSchema.safeParse({ ...llegada, posicion: 0 }).success).toBe(false);
    expect(LlegadaVistaSchema.safeParse({ ...llegada, posicion: 1.5 }).success).toBe(false);
  });

  it('valida la alerta sin datos personales y descarta el teléfono', () => {
    expect(AlertaSeguridadSchema.parse(alerta)).toEqual(alerta);
    expect(AlertaSeguridadSchema.parse({ ...alerta, telefono: 'dato no autorizado' })).toEqual(alerta);
  });

  it('Ficha de un hilo anónimo: conserva los campos nulos', () => {
    const anonima = { ...ficha, nombrePila: null, telefonoEnmascarado: null };
    expect(FichaHiloSchema.parse(anonima)).toEqual(anonima);
  });

  it('Teléfono completo rechazado: exige la máscara de cuatro dígitos', () => {
    expect(FichaHiloSchema.safeParse({ ...ficha, telefonoEnmascarado: '5210000000001' }).success).toBe(false);
    expect(FichaHiloSchema.safeParse({ ...ficha, hiloId: 'no-es-uuid' }).success).toBe(false);
  });

  it('Campos sensibles ausentes: recorre todos los modelos y sus objetos anidados', () => {
    const objetos = [OfertaCatalogoSchema, CitaVistaSchema, FichaHiloSchema, LlegadaVistaSchema, MensajeBandejaSchema, MetricasVistaSchema, ContextoDemoSchema, AlertaSeguridadSchema,
      CitaVistaSchema.shape.tramite, FichaHiloSchema.shape.tramites.element, FichaHiloSchema.shape.lineaTiempo.element,
      MetricasVistaSchema.shape.porEstado.element];
    for (const esquema of objetos) {
      for (const nombre of Object.keys(esquema.shape)) expect(['fechaNac', 'email', 'rfc', 'pin', 'curp', 'telefono']).not.toContain(nombre);
    }
  });

  it('valida bandeja de demo y métricas con cantidades enteras no negativas', () => {
    expect(MensajeBandejaSchema.safeParse({ id: ids.mensaje, canal: 'sms', asunto: 'Demo', cuerpo: 'Mensaje ficticio' }).success).toBe(true);
    expect(MetricasVistaSchema.safeParse({ porEstado: [{ estado: 'CONFIRMADA', cantidad: 1 }], kpis: { 'Cambios de canal': 2 } }).success).toBe(true);
    expect(MetricasVistaSchema.safeParse({ porEstado: [{ estado: 'CONFIRMADA', cantidad: -1 }], kpis: {} }).success).toBe(false);
  });
});

describe('Tabla compartida de rutas GET', () => {
  it('Ruta construida desde parámetros: conserva el hilo elegido', () => {
    expect(rutaConsulta('lineaTiempo', { hiloId: ids.hilo })).toBe(`/api/hilos/${ids.hilo}/linea-tiempo`);
  });

  it('Parámetro inválido: no produce ruta con un paciente que no sea UUID v7', () => {
    expect(() => rutaConsulta('citasPaciente', { pacienteId: 'invalido/../otro' })).toThrowError(expect.objectContaining({ name: 'ZodError' }));
    expect(() => rutaConsulta('citasPaciente', { pacienteId: '9a00b338-1504-4c59-9dc8-2bfca925dfc5' })).toThrowError(expect.objectContaining({ name: 'ZodError' }));
  });

  it('Rutas existentes conservadas: mantiene las cuatro consultas ya publicadas', () => {
    expect(rutaConsulta('tramite', { tramiteId: ids.tramite })).toBe(`/api/tramites/${ids.tramite}`);
    expect(rutaConsulta('lineaTiempo', { hiloId: ids.hilo })).toBe(`/api/hilos/${ids.hilo}/linea-tiempo`);
    expect(rutaConsulta('tramitesAbiertos', { pacienteId: ids.paciente })).toBe(`/api/pacientes/${ids.paciente}/tramites-abiertos`);
    expect(rutaConsulta('metricas', {})).toBe('/api/admin/kpis');
  });

  it('publica las once rutas y sus esquemas de respuesta sin acciones', () => {
    expect(Object.keys(RUTAS_CONSULTAS)).toHaveLength(11);
    expect(rutaConsulta('catalogo', {})).toBe('/api/catalogo');
    expect(rutaConsulta('fichaHilo', { hiloId: ids.hilo })).toBe(`/api/hilos/${ids.hilo}/ficha`);
    expect(rutaConsulta('citasPaciente', { pacienteId: ids.paciente })).toBe(`/api/pacientes/${ids.paciente}/citas`);
    expect(rutaConsulta('llegadasSede', { sedeId: ids.sede })).toBe(`/api/sedes/${ids.sede}/llegadas`);
    expect(RUTAS_CONSULTAS.catalogo.respuesta.parse([oferta])).toEqual([oferta]);
    expect(RUTAS_CONSULTAS.fichaHilo.respuesta.parse(ficha)).toEqual(ficha);
    expect(RUTAS_CONSULTAS.tramite.respuesta.parse(tramite)).toEqual(tramite);
  });

  it('publica las alertas de seguridad con un máximo de 50 elementos', () => {
    const ruta = RUTAS_CONSULTAS.alertasSeguridad;
    for (const consulta of Object.values(RUTAS_CONSULTAS)) expect(consulta).not.toHaveProperty('metodo');
    expect(rutaConsulta('alertasSeguridad', {})).toBe('/api/admin/alertas');
    expect(ruta).not.toHaveProperty('soloDemo', true);
    expect(ruta.respuesta.parse(Array.from({ length: 50 }, () => alerta))).toHaveLength(50);
    expect(ruta.respuesta.safeParse(Array.from({ length: 51 }, () => alerta)).success).toBe(false);
  });

  it('Contexto de demo: expone solo los identificadores nullables', () => {
    const ruta = RUTAS_CONSULTAS.contextoDemo;
    const contexto = { hiloId: ids.hilo, pacienteId: null, sedeId: ids.sede };
    expect(ruta.soloDemo).toBe(true);
    expect(rutaConsulta('contextoDemo', {})).toBe('/api/demo/contexto');
    expect(ruta.respuesta.parse({ ...contexto, telefono: 'dato no autorizado' })).toEqual(contexto);
    expect(ruta.respuesta.parse({ hiloId: null, pacienteId: null, sedeId: null })).toEqual({ hiloId: null, pacienteId: null, sedeId: null });
    expect(ruta.respuesta.safeParse({ ...contexto, pacienteId: 'no-es-uuid' }).success).toBe(false);
  });

  it('Bandeja marcada como demo: su ruta y respuestas quedan identificadas', () => {
    expect(RUTAS_CONSULTAS.bandeja.soloDemo).toBe(true);
    expect(rutaConsulta('bandeja', {})).toBe('/api/demo/bandeja');
    expect(RUTAS_CONSULTAS.bandeja.respuesta.parse([])).toEqual([]);
  });
});
