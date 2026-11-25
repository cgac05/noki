import { expect, it } from 'vitest';
import { RellenoHuecos, RelojDemo, type CandidatoParaOferta, type DatosHuecoLiberado } from '../../packages/application/src/index.ts';
import {
  HuecosMemoria, NotificadorWaMemoria, ProgramadorMemoria, RegistroTokensUsadosMemoria, RelojFalso, TokensBotonWaMemoria,
} from '../../packages/adapters/memory/src/index.ts';
import type { EventoDominio, HiloId, RecursoId, ReservaId, SedeId, ServicioId, TramiteId } from '../../packages/domain/src/index.ts';

const ts = '2026-11-25T15:00:00.000Z';
const inicio = '2026-11-27T16:00:00.000Z';
const reservaId = 'reserva-ana' as ReservaId;
const cita: DatosHuecoLiberado = {
  origenReservaId: reservaId, inicio, sedeId: 'tepic' as SedeId, recursoId: 'sala' as RecursoId,
  servicioId: 'ultrasonido' as ServicioId, servicio: 'Ultrasonido', sede: 'Tepic', zonaHoraria: 'America/Mazatlan',
  anticipacionMinimaHoras: 8, tramiteId: 'cita-ana' as TramiteId, hiloId: 'hilo-ana' as HiloId,
};
const evento: EventoDominio = {
  tipo: 'CitaCancelada', tramiteId: cita.tramiteId, hiloId: cita.hiloId, canal: 'whatsapp',
  actor: 'paciente', version: 5, nivelAuth: 0, correlationId: 'correlacion',
  idempotencyKey: 'clave', ts, payload: { anticipacionHoras: 49 },
};
const beto: CandidatoParaOferta = {
  interesId: 'interes-beto', tramiteId: 'cita-beto' as TramiteId, hiloId: 'hilo-beto' as HiloId,
  contactoId: 'contacto-beto', waId: '5210000000002', enviadasEn: [],
  estado: 'ACTIVO', servicioId: cita.servicioId, sedesAceptadas: [cita.sedeId],
  ventanaDesde: ts, ventanaHasta: '2026-12-07T16:00:00.000Z', citaActualInicio: '2026-12-07T16:00:00.000Z',
  requisitosCubiertos: true, recursoCompatible: true, registradoEn: ts,
};
const carla = { ...beto, interesId: 'interes-carla', tramiteId: 'cita-carla' as TramiteId,
  hiloId: 'hilo-carla' as HiloId, contactoId: 'contacto-carla', waId: '5210000000003' };

function preparar(demo = true, lecturas?: ConstructorParameters<typeof RellenoHuecos>[0]['lecturas']) {
  const reloj = new RelojFalso(new Date(ts));
  const notificador = new NotificadorWaMemoria();
  const tokens = new TokensBotonWaMemoria(reloj, new RegistroTokensUsadosMemoria(), demo);
  const huecos = new HuecosMemoria();
  let consecutivo = 0;
  const programador = new ProgramadorMemoria(async trabajo => {
    if (trabajo.tipo === 'OFERTA') await casos.vencer(trabajo.ofertaId, 'correlacion');
  });
  const casos: RellenoHuecos = new RellenoHuecos({
    demo, reloj, notificador, tokens, huecos, ids: { nuevo: () => 'id-' + ++consecutivo },
    lecturas: lecturas ?? { liberada: async () => cita, datos: async () => cita, candidatos: async () => [beto, carla] },
    horaLocal: () => 8, textoOferta: ({ servicio, sede }) => 'Se liberó un espacio para ' + servicio + ' en ' + sede,
    programar: async oferta => programador.programar({ tipo: 'OFERTA', ofertaId: oferta.id, venceEn: oferta.expiraEn }),
  });
  return { casos, huecos, notificador, relojDemo: new RelojDemo(reloj, programador) };
}

it('detecta una sola vez el hueco y ofrece a Beto sin datos de Ana', async () => {
  const { casos, huecos, notificador } = preparar();
  await casos.detectar(evento);
  await casos.detectar(evento);
  const hueco = await huecos.porOrigen(reservaId);
  expect(hueco?.estado).toBe('OFRECIDO');
  expect(hueco?.ofertas).toHaveLength(1);
  expect(huecos.eventos.map(({ tipo }) => tipo)).toEqual(['HuecoLiberado', 'OfertaEnviada']);
  expect(notificador.envios.map(({ waId }) => waId)).toEqual([beto.waId]);
  const ofertaEnviada = huecos.eventos.find(e => e.tipo === 'OfertaEnviada');
  const contenido = JSON.stringify([notificador.envios, ofertaEnviada]);
  for (const dato of [cita.tramiteId, cita.hiloId, cita.origenReservaId, '5210000000001']) {
    expect(contenido).not.toContain(dato);
  }
});

it('al vencer la oferta para Beto se ofrece a Carla', async () => {
  const { casos, huecos, notificador, relojDemo } = preparar();
  await casos.detectar(evento);
  const primera = (await huecos.porOrigen(reservaId))?.ofertas[0];
  if (!primera) throw new Error('Falta la primera oferta');
  await relojDemo.adelantar(15);
  expect((await huecos.porOrigen(reservaId))?.ofertas.map(o => o.estado)).toEqual(['EXPIRADA', 'OFRECIDA']);
  expect(notificador.envios.map(({ waId }) => waId)).toEqual([beto.waId, carla.waId]);
});

it('detecta el hueco fuera del modo demo y lo deja desierto', async () => {
  const { casos, huecos, notificador } = preparar(false);
  await casos.detectar(evento);
  expect((await huecos.porOrigen(reservaId))?.estado).toBe('DESIERTO');
  expect(notificador.envios).toEqual([]);
});

it('al rechazar el espacio se envía una sola oferta a la siguiente candidata', async () => {
  const { casos, huecos, notificador } = preparar();
  await casos.detectar(evento);
  const primera = (await huecos.porOrigen(reservaId))?.ofertas[0];
  if (!primera) throw new Error('Falta la primera oferta');
  await casos.rechazar(primera.id, 'correlacion');
  expect((await huecos.porOrigen(reservaId))?.ofertas.map(o => o.estado)).toEqual(['RECHAZADA', 'OFRECIDA']);
  expect(notificador.envios.map(({ waId }) => waId)).toEqual([beto.waId, carla.waId]);
});

it('ofrece a Carla el horario previo de Beto al procesar CitaAdelantada', async () => {
  const horarioAnterior = { ...cita, origenReservaId: 'reserva-beto' as ReservaId,
    tramiteId: beto.tramiteId, hiloId: beto.hiloId, inicio: '2026-12-02T16:00:00.000Z' };
  const { casos, huecos, notificador } = preparar(true, {
    liberada: async recibido => recibido.tipo === 'CitaAdelantada'
      && recibido.payload.reservaAnteriorId === horarioAnterior.origenReservaId ? horarioAnterior : null,
    datos: async () => horarioAnterior,
    candidatos: async () => [carla],
  });
  await casos.detectar({
    ...evento, tipo: 'CitaAdelantada', tramiteId: beto.tramiteId, hiloId: beto.hiloId,
    payload: { reservaAnteriorId: horarioAnterior.origenReservaId, reservaId: 'nueva' as ReservaId, diasAdelantados: 5 },
  });
  expect((await huecos.porOrigen(horarioAnterior.origenReservaId))?.estado).toBe('OFRECIDO');
  expect(notificador.envios.map(({ waId }) => waId)).toEqual([carla.waId]);
});
