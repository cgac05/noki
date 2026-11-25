import { expect, it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { CuerpoErrorSchema, RespuestaMensajeWaSchema, RUTAS_CONSULTAS } from '../../../packages/contracts/src/index.ts';
import type { ReservaId, SedeId, ServicioId, TramiteId } from '../../../packages/domain/src/index.ts';

it('Base vacía y consultas demo solo en modo demo', async () => {
  const demo = crearApiPruebas();
  const privada = crearApiPruebas({ demo: false });
  try {
    const { kpis, porEstado } = RUTAS_CONSULTAS.metricas.respuesta.parse(
      (await demo.app.inject('/api/admin/kpis')).json());
    expect(Object.values(kpis).every(valor => valor === 0)).toBe(true);
    expect(kpis).toMatchObject({ huecosLiberados: 0, huecosRecuperados: 0, horasRecursoRecuperadas: 0, diasAdelantadosPromedio: 0 });
    expect(porEstado).toHaveLength(10);
    expect(porEstado.every(({ cantidad }) => cantidad === 0)).toBe(true);
    expect(RUTAS_CONSULTAS.bandeja.respuesta.parse((await demo.app.inject('/api/demo/bandeja')).json())).toEqual([]);
    expect((await privada.app.inject('/api/demo/bandeja')).statusCode).toBe(404);
    expect((await privada.app.inject('/api/demo/contexto')).statusCode).toBe(404);
    const invalido = await demo.app.inject('/api/tramites/123');
    expect(invalido.statusCode).toBe(400);
    expect(CuerpoErrorSchema.parse(invalido.json()).error.codigo).toBe('VALIDACION');
    const inexistente = await demo.app.inject('/api/tramites/' + demo.ids.nuevo());
    expect(inexistente.statusCode).toBe(404);
    expect(CuerpoErrorSchema.parse(inexistente.json()).error.codigo).toBe('NO_ENCONTRADO');
  } finally { await Promise.all([demo.app.close(), privada.app.close()]); }
});

it('Solicitud WA vacía, sin trámites y opción vieja', async () => {
  const { app, ids, catalogo, lecturas, agenda, reloj } = crearApiPruebas();
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  const enviar = (payload: object) => app.inject({
    method: 'POST', url: '/api/canales/wa/mensajes', headers: { 'idempotency-key': ids.nuevo() },
    payload: { waId: '5210000000055', ...payload },
  });
  try {
    const vacia = await enviar({});
    expect(vacia.statusCode).toBe(400);
    expect(CuerpoErrorSchema.parse(vacia.json()).error.codigo).toBe('VALIDACION');
    const saludo = RespuestaMensajeWaSchema.parse((await enviar({ texto: 'Hola' })).json());
    const lista = saludo.mensajes.find(mensaje => mensaje.tipo === 'lista');
    const opcion = lista?.secciones[0]?.filas[0];
    if (!opcion) throw new Error('No se mostró el servicio.');
    expect(opcion.titulo).toBe('Química');
    await enviar({ payloadBoton: opcion.payload });
    const vieja = RespuestaMensajeWaSchema.parse((await enviar({ payloadBoton: opcion.payload })).json());
    expect(vieja.mensajes[0]).toMatchObject({ tipo: 'texto', texto: 'Esa opción ya no está disponible.' });
    expect(vieja.mensajes[1]).toMatchObject({ tipo: 'lista', secciones: [{ filas: [{ titulo: 'Tepic' }] }] });
    const leer = async (payload: object) => RespuestaMensajeWaSchema.parse((await enviar(payload)).json()).mensajes;
    const pulsar = async (mensajes: Awaited<ReturnType<typeof leer>>, titulo: string) => {
      const opciones = mensajes.flatMap(m => m.tipo === 'botones' ? m.botones :
        m.tipo === 'lista' ? m.secciones.flatMap(s => s.filas) : []);
      const elegida = opciones.find(fila => fila.titulo === titulo);
      if (!elegida) throw new Error('Falta la opción esperada.');
      return leer({ payloadBoton: elegida.payload });
    };
    const dias = await pulsar(vieja.mensajes, 'Tepic');
    const horarios = await pulsar(dias, 'mié 25 nov');
    expect(horarios[0]).toMatchObject({ tipo: 'lista', secciones: [{ filas: expect.arrayContaining([
      expect.objectContaining({ titulo: '09:00' }),
    ]) }] });
    const destinatario = await pulsar(horarios, '09:00');
    await agenda.apartar({
      inicio: '2026-11-25T16:00:00.000Z', sedeId, servicioId,
      reservaId: ids.nuevo() as ReservaId, tramiteId: ids.nuevo() as TramiteId,
      ts: reloj.ahora().toISOString(), ttlReservaMin: 60,
    });
    const fecha = await pulsar(destinatario, 'Para mí');
    expect(fecha[0]).toMatchObject({ tipo: 'flow', campos: [{ id: 'fechaNac' }] });
    const curp = await leer({ flowResponse: { fechaNac: '1990-01-01' } });
    const datos = await pulsar(curp, 'No la tengo');
    expect(datos[0]).toMatchObject({ tipo: 'flow', campos: expect.arrayContaining([
      expect.objectContaining({ id: 'nombre' }),
    ]) });
    await leer({ flowResponse: { nombre: 'Paciente sintético' } });
    const materno = await leer({ flowResponse: { apellidoPaterno: 'Demo' } });
    const sexo = await pulsar(materno, 'No tengo');
    let entidad = await pulsar(sexo, 'Mujer');
    while (!entidad.some(m => m.tipo === 'lista' && m.secciones.some(s => s.filas.some(f => f.titulo === 'Nayarit')))) {
      entidad = await pulsar(entidad, 'Más estados');
    }
    const ocupado = await pulsar(entidad, 'Nayarit');
    expect(ocupado[0]).toMatchObject({ tipo: 'texto', texto: 'El horario ya no está disponible.' });
    const reserva = await pulsar(await pulsar(ocupado, 'mié 25 nov'), '09:30');
    expect(reserva[0]).toMatchObject({ tipo: 'botones', botones: [{ titulo: 'Confirmar cita' }] });
    expect(JSON.stringify(reserva)).not.toContain('Paciente sintético');
  } finally { await app.close(); }
});

it('Requisitos con etiqueta muestra consentimiento y orden médica sin identificadores internos', async () => {
  const { app, ids, catalogo, lecturas } = crearApiPruebas();
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false,
    requisitos: [{ tipo: 'CONSENTIMIENTO', documento: 'demo' }, { tipo: 'ORDEN_MEDICA' }],
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Tepic', servicio: 'Química', precioCentavos: 5500 }, 'America/Mazatlan');
  const enviar = async (payload: object) => {
    const respuesta = await app.inject({
      method: 'POST', url: '/api/canales/wa/mensajes', headers: { 'idempotency-key': ids.nuevo() },
      payload: { waId: '5210000000077', ...payload },
    });
    expect(respuesta.statusCode).toBe(200);
    return RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
  };
  try {
    let mensajes = await enviar({ texto: 'Hola' });
    for (const titulo of ['Química', 'Tepic', 'mié 25 nov', '09:00']) {
      const filas = mensajes.flatMap(m => m.tipo === 'lista' ? m.secciones.flatMap(s => s.filas) : []);
      const opcion = filas.find(fila => fila.titulo === titulo);
      if (!opcion) throw new Error('Falta la opción ' + titulo);
      mensajes = await enviar({ payloadBoton: opcion.payload });
    }
    expect(mensajes).toMatchObject([{ tipo: 'botones', botones: [
      { titulo: 'Acepto el consentimiento' }, { titulo: 'Tengo mi orden médica' },
    ] }]);
    expect(JSON.stringify(mensajes)).not.toMatch(/CONSENTIMIENTO|ORDEN_MEDICA/u);
  } finally { await app.close(); }
});
