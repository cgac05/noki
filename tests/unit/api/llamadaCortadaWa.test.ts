import { expect, it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import { RespuestaMensajeWaSchema, RUTAS_CONSULTAS } from '../../../packages/contracts/src/index.ts';
import type { PacienteId, SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

const ani = '5210000000001';

it.each([
  { caso: 'mismo ANI con prefijo', aniCapturado: ani, waId: ani, retoma: true },
  { caso: 'ANI sin prefijo', aniCapturado: ani.slice(-10), waId: ani, retoma: true },
  { caso: 'WhatsApp sin prefijo', aniCapturado: ani, waId: ani.slice(-10), retoma: true },
  { caso: 'otro ANI', aniCapturado: ani.slice(-10), waId: '5210000000002', retoma: false },
  { caso: 'token usado', aniCapturado: ani, waId: ani, retoma: false },
  { caso: 'token vencido', aniCapturado: ani, waId: ani, retoma: false },
  { caso: 'sin solicitud', aniCapturado: ani, waId: ani, retoma: false },
  { caso: 'sin solicitud con prefijo', aniCapturado: ani.slice(-10), waId: ani, retoma: false },
  { caso: 'confirmada', aniCapturado: '3119990002', waId: '523119990002', retoma: false },
  { caso: 'sin solicitud con paciente', aniCapturado: '3119990002', waId: '523119990002', retoma: false },
])(
  'continúa la llamada solo con el mismo número y la solicitud vigente: $caso', async ({ caso, aniCapturado, waId, retoma }) => {
    const { app, casos, ids, lecturas, catalogo, tramites, reloj, pacientes, contactos } = crearApiPruebas();
    const sedeId = ids.nuevo() as SedeId;
    const servicioId = ids.nuevo() as ServicioId;
    const contexto = () => ({
      canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false,
      factores: new Set<never>(), correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
    } as const);
    const enviar = async (waId: string, texto: string) => {
      const respuesta = await app.inject({ method: 'POST', url: '/api/canales/wa/mensajes',
        headers: { 'idempotency-key': ids.nuevo() }, payload: { waId, texto } });
      expect(respuesta.statusCode).toBe(200);
      return RespuestaMensajeWaSchema.parse(respuesta.json()).mensajes;
    };
    try {
      catalogo.registrar(servicioId, {
        tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false, requisitos: [],
        duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
        anticipacionMinimaHoras: 0, recordatorios: [],
      }, new Map([[sedeId, 5500]]));
      lecturas.registrarOferta({ servicioId, sedeId, servicio: 'Química', sede: 'Tepic', precioCentavos: 5500 }, 'America/Mazatlan');
      const { tramite } = await casos.iniciar('AGENDAR', aniCapturado, contexto());
      await casos.seleccionarServicio(tramite.id, servicioId, contexto());
      await casos.seleccionarSede(tramite.id, sedeId, contexto());
      if (caso === 'confirmada' || caso === 'sin solicitud con paciente') {
        const pacienteId = ids.nuevo() as PacienteId;
        await pacientes.registrar(pacienteId, { nombre: 'Paciente', apellidoPaterno: 'Demo', fechaNac: '1990-01-01', sexo: 'F' });
        await casos.asignarPaciente(tramite.id, pacienteId, contexto());
        if (caso === 'confirmada') {
          await casos.reservar(tramite.id, new Date(reloj.ahora().getTime() + 86_400_000).toISOString(), contexto());
          await casos.confirmar(tramite.id, contexto());
        }
      }
      if (caso !== 'confirmada' && !caso.startsWith('sin solicitud')) await casos.solicitarContinuacion(tramite.id, contexto());
      if (caso === 'token vencido') reloj.fijar(new Date('2026-11-26T12:00:00Z'));
      if (caso === 'token usado') {
        const ficha = RUTAS_CONSULTAS.fichaHilo.respuesta.parse((await app.inject('/api/hilos/' + tramite.hiloId + '/ficha')).json());
        expect(ficha.codigoContinuacion).toBeTruthy();
        await casos.retomar({ valorContacto: aniCapturado, token: ficha.codigoContinuacion! }, { ...contexto(), canal: 'whatsapp', actor: 'paciente' });
      }
      const mensajes = await enviar(waId, 'Hola');
      if (retoma) {
        expect(mensajes[0]).toMatchObject({ tipo: 'texto', texto: expect.stringMatching(/llamada se cortó.*Química en Tepic/u) });
        expect(mensajes[1]).toMatchObject({ tipo: 'lista', texto: '¿Qué día prefieres?' });
        expect(await enviar(waId, 'Hola')).not.toContainEqual(mensajes[0]);
      } else if (caso !== 'otro ANI' && caso !== 'confirmada') {
        expect(mensajes[0]).toEqual({ tipo: 'texto', texto: 'Retomamos tu trámite: Química en Tepic. Lo iniciaste por teléfono.' });
        expect(mensajes[1]).toMatchObject({ tipo: 'lista', texto: '¿Qué día prefieres?' });
        if (caso !== 'token usado') {
          const contacto = await contactos.buscar('whatsapp', waId);
          if (contacto) expect(await contactos.vinculosDe(contacto.id)).toEqual([]);
        }
        expect(tramites.eventos().filter(e => e.tipo === 'IdentidadVinculada')).toHaveLength(0);
      } else if (caso === 'confirmada') {
        expect(mensajes[0]).toMatchObject({ tipo: 'flow', titulo: 'Verifica tu solicitud' });
      } else {
        expect(mensajes[0]).toMatchObject({ tipo: 'lista', texto: '¿Qué servicio necesitas?' });
      }
      const cambios = tramites.eventos().filter(e => e.tramiteId === tramite.id && e.tipo === 'CanalCambiado');
      expect(cambios).toHaveLength(caso === 'otro ANI' || caso === 'confirmada' ? 0 : 1);
      if (!retoma && caso !== 'otro ANI' && caso !== 'confirmada' && caso !== 'token usado') {
        expect(cambios[0]?.payload).toMatchObject({ de: 'callcenter', a: 'whatsapp', metodo: 'MISMO_NUMERO' });
      }
    } finally { await app.close(); }
  });
