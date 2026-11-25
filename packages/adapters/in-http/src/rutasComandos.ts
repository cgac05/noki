import type { FastifyPluginAsync } from 'fastify';
import { ComandoRequestSchema, RespuestaComandoSchema, type ComandoRequest, type EventoVista } from '@noki/contracts';
import type { CasosTramite, ContextoComando, GeneradorId, ResultadoComando, TokenVerificado, VerificadorTokens } from '@noki/application';
import { NoEncontrado, ReglaViolada, StepUpRequerido, type HiloId, type RecursoId, type SedeId, type ServicioId, type PacienteId, type TramiteId } from '@noki/domain';
import { z } from 'zod';
import { ejecutarIdempotente, type DependenciasIdempotencia } from './idempotencia.ts';
import { respuestaError } from './respuestaError.ts';
import { vistaTramite } from './vistaTramite.ts';

export interface LecturasComandos {
  tramite(id: TramiteId): Promise<{ hiloId: HiloId; horario?: { reservaId: string } | undefined; estado: string } | null>;
  contactoPorHilo(id: HiloId): Promise<string | null>;
  eventosPorClave(clave: string): Promise<EventoVista[]>;
}

export interface DependenciasComandos {
  casos: CasosTramite;
  tokens: VerificadorTokens;
  lecturas: LecturasComandos;
  ids: GeneradorId;
  demo: boolean;
  idempotencia?: DependenciasIdempotencia;
  solicitarContinuacion?: (id: TramiteId, contexto: ContextoComando) => Promise<ResultadoComando>;
}

const claveSchema = z.uuid();
const requiereTramite = z.object({ tramiteId: z.uuidv7() });
const actorExterno = z.enum(['paciente', 'interno']);

async function credencialContexto(comando: ComandoRequest, cabecera: string | undefined,
  deps: DependenciasComandos): Promise<TokenVerificado | null> {
  if (comando.actor === 'sistema') actorExterno.parse(comando.actor);
  if (comando.actor !== 'paciente' && !deps.demo) throw new StepUpRequerido(1, []);
  if (cabecera === undefined) return null;
  const token = /^Bearer (\S+)$/iu.exec(cabecera)?.[1];
  const credencial = token ? await deps.tokens.verificar(token, 'CONTEXTO') : null;
  if (!credencial) throw new StepUpRequerido(1, ['TOKEN']);
  return credencial;
}

async function traducir(comando: ComandoRequest, contexto: ContextoComando,
  deps: DependenciasComandos, contactoIdentificacion?: string): Promise<ResultadoComando> {
  const { casos, lecturas, ids } = deps;
  if (comando.tipo === 'IniciarTramite') {
    return casos.iniciar(comando.payload.tipoTramite, comando.payload.contacto ?? 'anonimo:' + ids.nuevo(), contexto, comando.payload.nuevo);
  }
  if (comando.tipo === 'RegistrarLlegada') {
    return casos.registrarLlegada(comando.payload.token, contexto, comando.tramiteId as TramiteId | undefined);
  }

  const id = requiereTramite.parse(comando).tramiteId as TramiteId;
  switch (comando.tipo) {
    case 'IdentificarPaciente':
      if (contactoIdentificacion === undefined) throw new NoEncontrado('contacto', id);
      return casos.identificarPaciente(id, comando.payload, contactoIdentificacion, contexto);
    case 'SeleccionarServicio':
      return casos.seleccionarServicio(id, comando.payload.servicioId as ServicioId, contexto);
    case 'SeleccionarSede':
      return casos.seleccionarSede(id, comando.payload.sedeId as SedeId, contexto);
    case 'AsignarPaciente':
      return casos.asignarPaciente(id, comando.payload.pacienteId as PacienteId,
        deps.demo && comando.canal === 'web' && comando.actor === 'paciente'
          ? { ...contexto, actor: 'sistema' }
          : contexto);
    case 'ReservarHorario':
      return casos.reservar(id, comando.payload.inicio, contexto, comando.payload.recursoId as RecursoId);
    case 'ConfirmarCita': {
      const tramite = await lecturas.tramite(id);
      if (!tramite) throw new NoEncontrado('tramite', id);
      if (tramite.horario?.reservaId !== comando.payload.reservaId) throw new ReglaViolada('RESERVA_NO_COINCIDE');
      return casos.confirmar(id, contexto);
    }
    case 'CancelarCita':
      return casos.cancelar(id, contexto);
    case 'SolicitarContinuacion':
      if (!deps.solicitarContinuacion) throw new NoEncontrado('operacion', id);
      return deps.solicitarContinuacion(id, contexto);
    case 'CerrarAtencion':
      return casos.cerrarAtencion(id, contexto);
  }
}

export const rutasComandos: FastifyPluginAsync<DependenciasComandos> = async (app, deps) => {
  app.post('/api/comandos', async (request, reply) => {
    const errorHttp = (error: unknown) => respuestaError(error,
      () => request.log.error({ correlation_id: request.id }, 'Fallo inesperado en el comando'));
    try {
      const comando = ComandoRequestSchema.parse(request.body);
      const clave = claveSchema.parse(request.headers['idempotency-key']);
      const credencial = await credencialContexto(comando, request.headers.authorization, deps);
      let contacto: string | undefined;
      if (comando.tipo === 'IdentificarPaciente') {
        if (comando.actor === 'paciente' && !credencial) throw new StepUpRequerido(1, ['TOKEN']);
        const id = comando.tramiteId as TramiteId;
        const tramite = await deps.lecturas.tramite(id);
        if (comando.actor === 'paciente' && tramite?.hiloId !== credencial?.hiloId) {
          throw new StepUpRequerido(1, ['TOKEN']);
        }
        if (!tramite) throw new NoEncontrado('tramite', id);
        contacto = await deps.lecturas.contactoPorHilo(tramite.hiloId) ?? undefined;
      }
      const contexto: ContextoComando = {
        actor: comando.actor, canal: comando.canal, nivel: credencial?.nivel ?? 0,
        vinculado: credencial?.pacienteId !== undefined,
        ...(credencial?.pacienteId ? { pacienteId: credencial.pacienteId } : {}),
        factores: new Set(credencial ? ['TOKEN'] : []),
        correlationId: request.id, idempotencyKey: clave,
      };
      const ejecutar = async () => {
        const resultado = await traducir(comando, contexto, deps, contacto);
        return { codigo: 200, cuerpo: RespuestaComandoSchema.parse({
          tramite: vistaTramite(resultado.tramite),
          siguientePregunta: resultado.siguientePregunta, eventos: await deps.lecturas.eventosPorClave(clave),
        }) };
      };
      const respuesta = deps.idempotencia
        ? await ejecutarIdempotente(deps.idempotencia, clave, '/api/comandos', comando, ejecutar, errorHttp,
          error => comando.tipo === 'CancelarCita' && error instanceof StepUpRequerido
            && error.factores.length === 1 && error.factores[0] === 'BOTON_APROBACION')
        : await ejecutar();
      return reply.code(respuesta.codigo).send(respuesta.cuerpo);
    } catch (error) {
      const respuesta = errorHttp(error);
      return reply.code(respuesta.codigo).send(respuesta.cuerpo);
    }
  });
};
