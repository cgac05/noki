import { it } from 'vitest';
import { crearApiPruebas } from '../../../apps/api/src/pruebas.ts';
import type { HiloId, PacienteId, SedeId, ServicioId, TramiteId } from '../../../packages/domain/src/index.ts';
import { comprobarIdempotenciaWa } from './bateriaIdempotenciaWa.ts';

it('reserva por WhatsApp al aceptar la preparación con el paciente asignado desde el call center', async () => {
  const deps = crearApiPruebas();
  const { app, catalogo, ids, lecturas, pacientes, reloj, tokens, tramites } = deps;
  const pacienteId = ids.nuevo() as PacienteId;
  const sedeId = ids.nuevo() as SedeId;
  const servicioId = ids.nuevo() as ServicioId;
  catalogo.registrar(servicioId, {
    tipo: 'ESTUDIO', modoAgenda: 'TURNO', requiereProfesional: false,
    requisitos: [{ tipo: 'ACEPTAR_PREPARACION', texto: 'Preparación de prueba' }],
    duracionMin: 15, ttlReservaMin: 10, toleranciaMin: 5, limiteCambiosHoras: 24,
    anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sedeId, 5500]]));
  lecturas.registrarOferta({ sedeId, servicioId, sede: 'Clínica Tepic', servicio: 'Química sanguínea', precioCentavos: 5500 }, 'America/Mazatlan');
  try {
    await pacientes.registrar(pacienteId, { nombre: 'Ana', apellidoPaterno: 'Prueba', fechaNac: '1990-01-01', sexo: 'F' });
    await comprobarIdempotenciaWa(deps, {
      waId: '5210000000001', pacienteId, sedeId, servicioId, inicio: '2026-11-25T16:00:00.000Z',
      codigoContinuacion: async (hiloId, tramiteId) => {
        const evento = tramites.eventos().find(e => e.tramiteId === tramiteId && e.tipo === 'ConsentimientoContactoWA');
        if (evento?.tipo !== 'ConsentimientoContactoWA') return null;
        return tokens.emitir({
          jti: evento.payload.consentimientoId, uso: 'CONTINUIDAD', tramiteId: tramiteId as TramiteId,
          hiloId: hiloId as HiloId, pacienteId, nivel: 1, canalOrigen: 'callcenter', metodo: 'TOKEN_CC',
          emitidoEn: reloj.ahora().toISOString(), expiraEn: '2026-11-25T12:00:00.000Z',
        });
      },
      eventos: async tramiteId => tramites.eventos().filter(evento => evento.tramiteId === tramiteId),
    });
  } finally { await app.close(); }
});
