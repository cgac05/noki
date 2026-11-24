import type { FastifyPluginAsync } from 'fastify';
import { RUTAS_CONSULTAS, type NombreConsulta, type ParametrosConsulta } from '@noki/contracts';
import type { BandejaPort, CitaLeida, EmisorTokens, LecturasPort, Reloj } from '@noki/application';
import { NoEncontrado, type HiloId, type PacienteId, type SedeId, type TramiteId } from '@noki/domain';
import { respuestaError } from './respuestaError.ts';
import { vistaTramite } from './vistaTramite.ts';

export interface DependenciasConsultas {
  lecturas: LecturasPort;
  reloj: Reloj;
  emisor: EmisorTokens;
  bandeja: BandejaPort;
  demo: boolean;
  codigoContinuacion?: (id: HiloId) => Promise<string | null>;
}

async function vistaCita(cita: CitaLeida, emisor: EmisorTokens) {
  const { tramite, ...datos } = cita;
  const horario = tramite.horario;
  if (!horario) throw new NoEncontrado('reserva', tramite.id);
  const tokenQr = await emisor.emitir({
    jti: horario.reservaId, uso: 'LLEGADA', tramiteId: tramite.id, hiloId: tramite.hiloId,
    ...(tramite.pacienteId ? { pacienteId: tramite.pacienteId } : {}),
    nivel: 1, canalOrigen: tramite.canalOrigen, metodo: tramite.canalOrigen === 'callcenter' ? 'TOKEN_CC' : 'TOKEN_WEB',
    emitidoEn: datos.inicio, expiraEn: new Date(Date.parse(datos.inicio) + 86_400_000).toISOString(),
  });
  return { ...datos, tramite: vistaTramite(tramite), tokenQr };
}

export const rutasConsultas: FastifyPluginAsync<DependenciasConsultas> = async (app, deps) => {
  const { lecturas, emisor, reloj } = deps;
  function registrar<N extends NombreConsulta>(nombre: N, consultar: (p: ParametrosConsulta<N>) => Promise<unknown>) {
    const ruta = RUTAS_CONSULTAS[nombre];
    if ('soloDemo' in ruta && !deps.demo) return;
    app.get(ruta.ruta, async (request, reply) => {
      try {
        const parametros = ruta.parametros.parse(request.params) as ParametrosConsulta<N>;
        return ruta.respuesta.parse(await consultar(parametros));
      } catch (error) {
        const respuesta = respuestaError(error, () => request.log.error({ correlation_id: request.id }, 'Fallo en la consulta'));
        return reply.code(respuesta.codigo).send(respuesta.cuerpo);
      }
    });
  }
  registrar('tramite', async ({ tramiteId }) => {
    const tramite = await lecturas.tramite(tramiteId as TramiteId);
    if (!tramite) throw new NoEncontrado('tramite', tramiteId);
    return vistaTramite(tramite);
  });
  registrar('lineaTiempo', async ({ hiloId }) => {
    const eventos = await lecturas.lineaTiempo(hiloId as HiloId);
    if (!eventos) throw new NoEncontrado('hilo', hiloId);
    return eventos;
  });
  registrar('tramitesAbiertos', async ({ pacienteId }) => (await lecturas.tramitesAbiertos(pacienteId as PacienteId)).map(vistaTramite));
  registrar('catalogo', () => lecturas.catalogo());
  registrar('fichaHilo', async ({ hiloId }) => {
    const ficha = await lecturas.fichaHilo(hiloId as HiloId);
    if (!ficha) throw new NoEncontrado('hilo', hiloId);
    return { ...ficha, tramites: ficha.tramites.map(vistaTramite),
      codigoContinuacion: await deps.codigoContinuacion?.(hiloId as HiloId) ?? null };
  });
  registrar('citasPaciente', async ({ pacienteId }) => Promise.all(
    (await lecturas.citasPaciente(pacienteId as PacienteId)).map(cita => vistaCita(cita, emisor))));
  registrar('llegadasSede', async ({ sedeId }) => Promise.all(
    (await lecturas.llegadasSede(sedeId as SedeId, reloj.ahora().toISOString())).map(async cita => ({
      cita: await vistaCita(cita, emisor), registrada: cita.tramite.estado === 'EN_CLINICA',
    }))));
  registrar('metricas', () => lecturas.metricas());
  registrar('bandeja', () => deps.bandeja.listar());
  registrar('contextoDemo', () => lecturas.contextoDemo());
};
