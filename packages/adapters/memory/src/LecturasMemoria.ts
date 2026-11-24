import { formatInTimeZone } from 'date-fns-tz';
import type { CitaLeida, EventoLeido, GeneradorId, LecturasPort, OfertaLeida } from '@noki/application';
import { ESTADOS_TRAMITE, normalizarTelefono, type HiloId, type PacienteId, type SedeId, type Tramite, type TramiteId } from '@noki/domain';
import type { AgendaMemoria } from './AgendaMemoria.ts';
import type { ContactosMemoria } from './ContactosMemoria.ts';
import type { EventosSinTramiteMemoria } from './EventosSinTramiteMemoria.ts';
import type { PacientesMemoria } from './PacientesMemoria.ts';
import type { TramiteRepoMemoria } from './TramiteRepoMemoria.ts';

export class LecturasMemoria implements LecturasPort {
  private readonly ofertas: OfertaLeida[] = [];
  private readonly zonas = new Map<SedeId, string>();
  private readonly idsEventos = new Map<string, string>();

  constructor(private readonly tramites: TramiteRepoMemoria, private readonly contactos: ContactosMemoria,
    private readonly pacientes: PacientesMemoria, private readonly agenda: AgendaMemoria,
    private readonly sinTramite: EventosSinTramiteMemoria, private readonly ids: GeneradorId) {}

  registrarOferta(oferta: OfertaLeida, zonaHoraria: string): void {
    this.ofertas.push({ ...oferta });
    this.zonas.set(oferta.sedeId, zonaHoraria);
  }

  tramite(id: TramiteId) { return this.tramites.obtener(id); }

  async contactoPorHilo(id: HiloId) { return this.contactos.valorPorHilo(id); }

  private eventos() {
    return [...this.tramites.eventos(), ...this.sinTramite.eventos()].map(evento => {
      const id = this.idsEventos.get(evento.idempotencyKey) ?? this.ids.nuevo();
      this.idsEventos.set(evento.idempotencyKey, id);
      return { ...evento, id };
    }).sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));
  }

  async eventosPorClave(clave: string): Promise<EventoLeido[]> {
    return this.eventos().filter(e => e.idempotencyKey === clave || e.idempotencyKey.startsWith(clave + ':'))
      .map(({ id, ts, tipo, canal }) => ({ id, ts, tipo, canal }));
  }

  async lineaTiempo(hiloId: HiloId): Promise<EventoLeido[] | null> {
    if (this.contactos.valorPorHilo(hiloId) === null) return null;
    return this.eventos().filter(e => e.hiloId === hiloId).map(({ id, ts, tipo, canal }) => ({ id, ts, tipo, canal }));
  }

  tramitesAbiertos(id: PacienteId) { return this.tramites.abiertosPorPaciente(id); }

  async catalogo() {
    return structuredClone(this.ofertas).sort((a, b) => a.servicio.localeCompare(b.servicio) || a.sede.localeCompare(b.sede));
  }

  async zonaSede(id: SedeId) { return this.zonas.get(id) ?? null; }

  async fichaHilo(hiloId: HiloId) {
    const valor = this.contactos.valorPorHilo(hiloId);
    if (valor === null) return null;
    const descendentes = this.eventos().reverse();
    const porActividad = (a: Tramite, b: Tramite) =>
      (descendentes.find(e => e.tramiteId === b.id)?.ts ?? '').localeCompare(
        descendentes.find(e => e.tramiteId === a.id)?.ts ?? '') || b.id.localeCompare(a.id);
    const tramites = this.tramites.todos().filter(t => t.hiloId === hiloId).sort(porActividad);
    const reciente = (await this.tramites.abiertosPorHilo(hiloId)).sort(porActividad)[0];
    const nombre = reciente?.pacienteId ? this.pacientes.nombres(reciente.pacienteId)?.nombre : undefined;
    const telefono = /^\+?[0-9 ()-]+$/u.test(valor) ? normalizarTelefono(valor) : undefined;
    const oferta = this.ofertas.find(o => o.sedeId === reciente?.sedeId && o.servicioId === reciente.servicioId);
    const cambio = descendentes.find(e => e.hiloId === hiloId && e.tipo === 'CanalCambiado');
    return {
      hiloId, tramites, nombrePila: nombre?.trim().split(/\s+/u)[0] || null,
      telefonoEnmascarado: telefono ? '•••• ' + telefono.slice(-4) : null,
      lineaTiempo: await this.lineaTiempo(hiloId) ?? [],
      soloLectura: cambio?.tipo === 'CanalCambiado' && cambio.payload.de === 'callcenter' && cambio.payload.a !== 'callcenter',
      oferta: oferta && reciente?.precioCentavos !== undefined ? { ...oferta, precioCentavos: reciente.precioCentavos } : null,
    };
  }

  private leerCitas(tramites: Tramite[]): CitaLeida[] {
    return tramites.flatMap(tramite => {
      const oferta = this.ofertas.find(o => o.sedeId === tramite.sedeId && o.servicioId === tramite.servicioId);
      const zonaHoraria = tramite.sedeId ? this.zonas.get(tramite.sedeId) : undefined;
      const horario = tramite.horario;
      return oferta && zonaHoraria && horario ? [{
        tramite, servicio: oferta.servicio, sede: oferta.sede, zonaHoraria, inicio: horario.inicio,
      }] : [];
    }).sort((a, b) => a.inicio.localeCompare(b.inicio) || a.tramite.id.localeCompare(b.tramite.id));
  }

  async citasPaciente(id: PacienteId) {
    return this.leerCitas(this.tramites.todos().filter(t => t.pacienteId === id &&
      ['CONFIRMADA', 'EN_CLINICA', 'ATENDIDA'].includes(t.estado)));
  }

  async llegadasSede(id: SedeId, ts: string) {
    return this.leerCitas(this.tramites.todos().filter(t => t.sedeId === id &&
      ['CONFIRMADA', 'EN_CLINICA'].includes(t.estado))).filter(cita =>
        formatInTimeZone(cita.inicio, cita.zonaHoraria, 'yyyy-MM-dd') >= formatInTimeZone(ts, cita.zonaHoraria, 'yyyy-MM-dd'),
      ).slice(0, 50);
  }

  async metricas() {
    const tramites = this.tramites.todos();
    const eventos = this.eventos();
    const cambios = eventos.filter(evento => evento.tipo === 'CanalCambiado');
    const hilos = new Set(eventos.map(evento => evento.hiloId)).size;
    const anteriores = new Map<string, string>();
    let datosRepetidos = 0;
    for (const evento of eventos) {
      if (!['ServicioSeleccionado', 'SedeSeleccionada', 'PacienteAsignado'].includes(evento.tipo)) continue;
      const llave = evento.tramiteId + ':' + evento.tipo;
      const actual = JSON.stringify(evento.payload);
      if (anteriores.get(llave) === actual) datosRepetidos++;
      anteriores.set(llave, actual);
    }
    return {
      porEstado: ESTADOS_TRAMITE.map(estado => ({ estado, cantidad: tramites.filter(t => t.estado === estado).length })),
      kpis: {
        cambiosCanal: cambios.length,
        cambiosCanalPorHilo: hilos ? Math.round(cambios.length / hilos * 100) / 100 : 0,
        tramitesRecuperados: tramites.filter(t => eventos.some(e => e.tramiteId === t.id && e.tipo === 'CitaConfirmada')
          && cambios.some(e => e.tramiteId === t.id)).length,
        citasConfirmadas: eventos.filter(e => e.tipo === 'CitaConfirmada').length,
        llegadasRegistradas: eventos.filter(e => e.tipo === 'PacienteLlego').length,
        datosRepetidos,
        intentosVerificacionFallidos: eventos.filter(e => e.tipo === 'IntentoVerificacionFallido').length,
      },
    };
  }

  async contextoDemo() {
    const estados = this.tramites.todos().filter(t => ['CONFIRMADA', 'EN_CLINICA', 'ATENDIDA'].includes(t.estado));
    const ultima = this.eventos().reverse().find(e => e.tipo === 'CitaConfirmada' && estados.some(t => t.id === e.tramiteId));
    const tramite = estados.find(t => t.id === ultima?.tramiteId);
    return { hiloId: tramite?.hiloId ?? null, pacienteId: tramite?.pacienteId ?? null, sedeId: tramite?.sedeId ?? null };
  }

  async horariosOcupados(id: SedeId, fecha: string, ts: string) {
    const zona = this.zonas.get(id);
    return zona ? this.agenda.horariosOcupados(id, ts)
      .filter(inicio => formatInTimeZone(inicio, zona, 'yyyy-MM-dd') === fecha) : [];
  }
}
