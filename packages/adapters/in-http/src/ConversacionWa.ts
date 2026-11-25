import { PREFIJO_BOTON_WA } from '@noki/application';
import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import {
  IdentificarPacienteSchema, type MensajeBot, type SolicitudMensajeWa,
} from '@noki/contracts';
import type {
  AprobacionCancelacion, AgendaExternaPort, CasosTramite, ContactosPort, ContextoComando, ConversacionesWa, GeneradorId, LecturasPort, Reloj,
} from '@noki/application';
import {
  ErrorDominio, siguientePregunta, type PistaDominio, type RegistroTiposTramite, type SedeId,
  type ServicioId, type Tramite, type TramiteId,
} from '@noki/domain';
import { canalOrigen, fechaCorta, fechaLarga, preguntaCasilla, requisito } from './textosWa.ts';
import { mensajesIdentificacion, respuestaFlowIdentificacion } from './identificacionWa.ts';

const accion = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('retomar'), id: z.uuidv7() }),
  z.object({ tipo: z.literal('servicio'), id: z.uuidv7() }),
  z.object({ tipo: z.literal('sede'), id: z.uuidv7() }),
  z.object({ tipo: z.literal('horario'), inicio: z.iso.datetime() }),
  z.object({ tipo: z.literal('requisito'), requisito: z.string() }),
  z.object({ tipo: z.literal('elegibilidad') }),
  z.object({ tipo: z.literal('confirmar') }),
  z.object({ tipo: z.literal('identificar'), payload: IdentificarPacienteSchema.shape.payload }),
]);
const conversacion = z.object({
  tramiteId: z.uuidv7().optional(), horario: z.iso.datetime().optional(),
  opciones: z.record(z.string(), accion), verificacion: z.boolean().optional(),
});
type Estado = z.infer<typeof conversacion>;
type Accion = z.infer<typeof accion>;

export interface DependenciasWa {
  casos: CasosTramite;
  aprobacion?: AprobacionCancelacion;
  responderOferta?: (waId: string, token: string, clave: string, correlacion: string) => Promise<string | null>;
  contactos: ContactosPort;
  conversaciones: ConversacionesWa;
  lecturas: LecturasPort;
  agendaExterna: AgendaExternaPort;
  reloj: Reloj;
  ids: GeneradorId;
  registro: RegistroTiposTramite;
}

const texto = (contenido: string): MensajeBot => ({ tipo: 'texto', texto: contenido });
const noDisponible = 'Esa opción ya no está disponible.';
const resumenInvalido = 'No pudimos verificar la información.';

export class ConversacionWa {
  constructor(private readonly deps: DependenciasWa) {}

  async responder(mensaje: SolicitudMensajeWa, clave: string, correlationId: string): Promise<MensajeBot[]> {
    const { waId, flowResponse, payloadBoton } = mensaje;
    if (payloadBoton?.startsWith(PREFIJO_BOTON_WA)) {
      const resultado = await this.deps.aprobacion?.responder(waId, payloadBoton, clave, correlationId);
      return [texto(resultado === 'CANCELADA' ? 'Tu cita quedó cancelada.'
        : resultado === 'CONSERVADA' ? 'Conservamos tu cita.'
        : await this.deps.responderOferta?.(waId, payloadBoton, clave, correlationId) ?? noDisponible)];
    }
    const { casos, contactos, conversaciones, lecturas, reloj } = this.deps;
    const contexto: ContextoComando = {
      canal: 'whatsapp', actor: 'paciente', nivel: 0, vinculado: false, factores: new Set(),
      idempotencyKey: clave, correlationId,
    };
    let primeraOperacion = true;
    const contextoOperacion = (): ContextoComando => {
      if (!primeraOperacion) return { ...contexto, idempotencyKey: this.deps.ids.nuevo() };
      primeraOperacion = false;
      return contexto;
    };
    const ts = reloj.ahora().toISOString();
    const previo = await contactos.buscar('whatsapp', waId);
    const guardado = previo && conversacion.safeParse(await conversaciones.obtener(previo.id));
    const estado: Estado = guardado && guardado.success ? guardado.data : { opciones: {} };
    let tramite = estado.tramiteId ? await lecturas.tramite(estado.tramiteId as TramiteId) : null;
    const mensajes: MensajeBot[] = [];
    const token = /^CONTINUAR\s+(\S+)$/iu.exec(mensaje.texto?.trim() ?? '')?.[1];

    const opcionPrevia = payloadBoton?.startsWith('op:') ? estado.opciones[payloadBoton] : undefined;
    const tramiteElegidoId = opcionPrevia?.tipo === 'retomar' ? opcionPrevia.id as TramiteId : undefined;
    if (token || tramiteElegidoId || (!tramite && (mensaje.texto || (estado.verificacion && flowResponse)))) {
      const verificacion = estado.verificacion && flowResponse ? z.object({
        folio: z.string().regex(/^[0-9]{8,9}$/u), fechaNac: z.iso.date(),
      }).safeParse(flowResponse) : undefined;
      if (verificacion && !verificacion.success) return [this.pedirVerificacion()];
      const retomado = await casos.retomar({
        valorContacto: waId, incluirReferencias: true, ...(tramiteElegidoId ? { tramiteElegidoId } : {}), ...(token ? { token } : {}), ...(verificacion?.success ? verificacion.data : {}),
      }, contextoOperacion());
      if (retomado.tipo === 'BLOQUEADO') return [texto('Espera antes de volver a intentarlo.')];
      if (retomado.tipo === 'RETOMADO') {
        tramite = retomado.operacion.tramite;
        estado.tramiteId = tramite.id;
        delete estado.verificacion;
        delete estado.horario;
        const oferta = (await lecturas.catalogo()).find(o => o.servicioId === tramite?.servicioId && o.sedeId === tramite?.sedeId);
        const momento = tramite.horario && tramite.sedeId ? await this.formatear(tramite.horario.inicio, tramite.sedeId) : undefined;
        const detalle = [oferta?.servicio, oferta?.sede].filter(Boolean).join(' en ');
        const resumen = detalle ? 'Retomamos tu trámite: ' + detalle : 'Retomamos tu trámite';
        mensajes.push(texto(resumen + (momento ? ', ' + momento : '') + '. Lo iniciaste ' + canalOrigen[tramite.canalOrigen] + '.'));
      } else if (token || verificacion || tramiteElegidoId) {
        return [texto(resumenInvalido)];
      } else if (retomado.tipo === 'REQUIERE_VERIFICACION') {
        estado.verificacion = true;
        await this.guardar(waId, estado, ts);
        return [this.pedirVerificacion()];
      } else if (retomado.tipo === 'VARIOS') {
        const catalogo = await lecturas.catalogo();
        estado.opciones = {};
        const filas = retomado.resumenes.slice(0, 10).flatMap((item, indice) => {
          const id = retomado.tramiteIds?.[indice];
          if (!id) return [];
          const payload = 'op:' + this.deps.ids.nuevo();
          estado.opciones[payload] = { tipo: 'retomar', id };
          const oferta = catalogo.find(fila => fila.servicioId === item.servicioId && fila.sedeId === item.sedeId);
          return [{ id: 'resumen-' + indice, payload,
            titulo: [oferta?.servicio, oferta?.sede, canalOrigen[item.canalOrigen]].filter(Boolean).join(' · ') }];
        });
        await this.guardar(waId, estado, ts);
        return filas.length ? [{ tipo: 'lista', texto: 'Tienes varios trámites abiertos.', secciones: [{ filas }] }]
          : [texto(noDisponible)];
      } else {
        tramite = (await casos.iniciar('AGENDAR', waId, contextoOperacion())).tramite;
        estado.tramiteId = tramite.id;
      }
    }
    if (!tramite) return [texto(noDisponible)];
    try {
      if (tramite.estado === 'HORARIO_RESERVADO' && tramite.horario &&
          Date.parse(tramite.horario.expiraEn) <= Date.parse(ts)) {
        delete estado.horario;
        await casos.confirmar(tramite.id, contextoOperacion());
      } else if (payloadBoton && !tramiteElegidoId && !token) {
        const elegida = opcionPrevia;
        if (elegida) tramite = await this.aplicar(tramite, estado, elegida, waId, contextoOperacion);
        else mensajes.push(texto(noDisponible));
      } else if (flowResponse) {
        const pregunta = this.pregunta(tramite, estado);
        const payload = pregunta.tipo === 'PREGUNTA' && pregunta.casilla === 'paciente'
          ? respuestaFlowIdentificacion(tramite.id, pregunta.pista, flowResponse) : undefined;
        if (payload) {
          const resultado = await casos.identificarPaciente(tramite.id, payload, waId, contextoOperacion());
          tramite = resultado.tramite;
          const fallido = resultado.eventos.find(e => e.tipo === 'IntentoVerificacionFallido');
          if (fallido && fallido.payload.intentos >= 3) {
            estado.opciones = {};
            await this.guardar(waId, estado, ts);
            return [texto('Espera antes de volver a intentarlo.')];
          }
          if (fallido) mensajes.push(texto(resumenInvalido));
        } else mensajes.push(texto('Revisa los campos requeridos.'));
      }
      if (estado.horario && tramite.estado === 'LISTO_PARA_RESERVAR' && !tramite.advertenciaElegibilidad) {
        const inicio = estado.horario;
        delete estado.horario;
        tramite = (await casos.reservar(tramite.id, inicio, contextoOperacion())).tramite;
      }
    } catch (error) {
      if (!(error instanceof ErrorDominio)) throw error;
      const actual = await lecturas.tramite(tramite.id);
      if (actual) tramite = actual;
      mensajes.push(texto('regla' in error && error.regla === 'HORARIO_NO_DISPONIBLE'
        ? 'El horario ya no está disponible.' : resumenInvalido));
    }
    estado.opciones = {};
    mensajes.push(...await this.mensajes(tramite, estado, ts, correlationId));
    await this.guardar(waId, estado, ts);
    return mensajes;
  }

  private async guardar(waId: string, estado: Estado, ts: string) {
    const contacto = await this.deps.contactos.buscar('whatsapp', waId);
    if (contacto) await this.deps.conversaciones.guardar(contacto.id, estado, ts);
  }

  private pedirVerificacion(): MensajeBot {
    return { tipo: 'flow', titulo: 'Verifica tu solicitud', campos: [
      { id: 'folio', etiqueta: 'Folio', captura: 'sensitive', requerido: true },
      { id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true },
    ] };
  }

  private pregunta(tramite: Tramite, estado: Estado) {
    return siguientePregunta({
      tipo: tramite.tipo, casillaLlena: casilla => casilla === 'horario' && Boolean(estado.horario) || tramite.casillaLlena(casilla),
      pasoIdentificacion: () => tramite.pasoIdentificacion(), identificacion: tramite.identificacion,
    }, 'whatsapp', this.deps.registro);
  }

  private async aplicar(tramite: Tramite, estado: Estado, seleccion: Accion, waId: string,
    contextoOperacion: () => ContextoComando): Promise<Tramite> {
    const { casos } = this.deps;
    const { id } = tramite;
    switch (seleccion.tipo) {
      case 'retomar': return tramite;
      case 'servicio': return (await casos.seleccionarServicio(id, seleccion.id as ServicioId, contextoOperacion())).tramite;
      case 'sede': return (await casos.seleccionarSede(id, seleccion.id as SedeId, contextoOperacion())).tramite;
      case 'identificar': return (await casos.identificarPaciente(id, seleccion.payload, waId, contextoOperacion())).tramite;
      case 'horario': estado.horario = seleccion.inicio; return tramite;
      case 'confirmar': return (await casos.confirmar(id, contextoOperacion())).tramite;
      case 'elegibilidad': return (await casos.reconocerElegibilidad(id, contextoOperacion())).tramite;
      case 'requisito': {
        const requisito = tramite.perfil?.requisitos.find(({ tipo }) => tipo === seleccion.requisito);
        if (!requisito) return tramite;
        if (requisito.tipo === 'ACEPTAR_PREPARACION') {
          return (await casos.aceptarPreparacion(id, contextoOperacion())).tramite;
        }
        return (await casos.cumplirRequisito(id, requisito.tipo, contextoOperacion())).tramite;
      }
    }
  }

  private async formatear(inicio: string, sedeId: SedeId): Promise<string> {
    const zona = await this.deps.lecturas.zonaSede(sedeId) ?? 'UTC';
    return fechaLarga(inicio, zona);
  }

  private async mensajes(tramite: Tramite, estado: Estado, ts: string, correlationId: string): Promise<MensajeBot[]> {
    const op = (seleccion: Accion) => {
      const payload = 'op:' + this.deps.ids.nuevo();
      estado.opciones[payload] = seleccion;
      return payload;
    };
    const opcion = (seleccion: Accion, titulo: string) => {
      const payload = op(seleccion);
      return { id: payload, titulo, payload };
    };
    if (tramite.estado === 'CONFIRMADA' && tramite.horario && tramite.sedeId) {
      return [texto('Cita confirmada para ' + await this.formatear(tramite.horario.inicio, tramite.sedeId) + '. Tu QR está en la App.')];
    }
    if (tramite.estado === 'HORARIO_RESERVADO' && tramite.horario && tramite.sedeId) {
      return [{ tipo: 'botones', texto: 'Tu reserva vence el ' + await this.formatear(tramite.horario.expiraEn, tramite.sedeId),
        botones: [opcion({ tipo: 'confirmar' }, 'Confirmar cita')] }];
    }
    const pregunta = this.pregunta(tramite, estado);
    if (pregunta.tipo !== 'PREGUNTA') return [texto('No hay más pasos pendientes.')];
    const { casilla, pista } = pregunta;
    if (casilla === 'paciente') return mensajesIdentificacion(pista satisfies PistaDominio, payload => op({ tipo: 'identificar', payload }));
    if (casilla === 'elegibilidad') return [{ tipo: 'botones', texto: 'Confirma que revisaste la elegibilidad.',
      botones: [opcion({ tipo: 'elegibilidad' }, 'Entendido')] }];
    if (casilla === 'requisitos') {
      const completados = tramite.instantanea().datos.requisitos;
      const botones = (tramite.perfil?.requisitos ?? []).filter(r => !completados.includes(r.tipo)).slice(0, 3)
        .map(r => opcion({ tipo: 'requisito', requisito: r.tipo }, requisito[r.tipo]));
      return botones.length ? [{ tipo: 'botones', texto: 'Completa los requisitos del servicio.', botones }] : [texto('Revisa los requisitos.')];
    }
    type Opcion = ReturnType<typeof opcion>;
    let filas: Opcion[] = [];
    const catalogo = await this.deps.lecturas.catalogo();
    if (casilla === 'servicio') {
      filas = [...new Map(catalogo.map(item => [item.servicioId, item.servicio])).entries()].slice(0, 10)
        .map(([id, nombre]) => opcion({ tipo: 'servicio', id }, nombre));
    } else if (casilla === 'sede') {
      filas = catalogo.filter(item => item.servicioId === tramite.servicioId).slice(0, 10)
        .map(item => opcion({ tipo: 'sede', id: item.sedeId }, item.sede));
    } else if (tramite.sedeId && tramite.servicioId) {
      const { sedeId, servicioId } = tramite;
      const zona = await this.deps.lecturas.zonaSede(sedeId) ?? 'UTC';
      const fecha = formatInTimeZone(new Date(Date.parse(ts) + 86_400_000), zona, 'yyyy-MM-dd');
      const [horarios, ocupados] = await Promise.all([
        this.deps.agendaExterna.disponibilidad({ fecha, sedeId, servicioId, zonaHoraria: zona }, correlationId),
        this.deps.lecturas.horariosOcupados(sedeId, fecha, ts),
      ]);
      filas = horarios.filter(inicio => !ocupados.includes(inicio) && Date.parse(inicio) > Date.parse(ts)).slice(0, 10)
        .map(inicio => opcion({ tipo: 'horario', inicio }, fechaCorta(inicio, zona)));
    }
    return filas.length ? [{ tipo: 'lista', texto: preguntaCasilla[casilla] ?? '¿Qué opción prefieres?', secciones: [{ filas }] }]
      : [texto('No hay opciones disponibles.')];
  }
}
