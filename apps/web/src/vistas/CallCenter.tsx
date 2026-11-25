import { Link } from 'react-router';
import { ComandoRequestSchema } from '@noki/contracts';
import { useState } from 'react';
import { QrCita } from '../componentes/QrCita.tsx';
import { useCliente, useConsulta, useContextoConsulta, useRespuestaComando } from '../cliente/ProveedorCliente.tsx';
import { ErrorCliente } from '../cliente/errores.ts';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { useSala } from '../cliente/useSala.ts';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo } from '../componentes/LineaTiempo.tsx';
import { dinero } from '../componentes/formato.ts';
import { IdentificacionAsesor } from '../componentes/IdentificacionAsesor.tsx';
import { AsistenteCita } from '../componentes/AsistenteCita.tsx';

const estadosEnProceso = ['BORRADOR', 'COTIZADO', 'LISTO_PARA_RESERVAR', 'HORARIO_RESERVADO'];

function LlamadaEntrante({ accion }: { accion: ReturnType<typeof useAccion> }) {
  const [numero, setNumero] = useState(CONTACTO_DEMO);
  const valido = /^\d{10,15}$/.test(numero);
  return <>
    <form className="seccion llamada-entrante" onSubmit={evento => {
      evento.preventDefault();
      if (valido) accion.ejecutar({ tipo: 'comando', titulo: 'Llamada entrante', comando: ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: numero } }) });
    }}>
      <label htmlFor="numero-llamada">Número de la llamada (ANI)</label>
      <input id="numero-llamada" type="tel" inputMode="numeric" pattern="[0-9]{10,15}" autoComplete="off" value={numero} disabled={accion.isPending} aria-invalid={!valido} aria-describedby="formato-ani" onChange={evento => setNumero(evento.target.value)} />
      <p id="formato-ani" className={valido ? 'ayuda-ani' : 'wa-error'}>Escribe de 10 a 15 dígitos, sin espacios ni signos.</p>
      <button type="submit" disabled={!valido || accion.isPending || accion.isError}>Llamada entrante</button>
    </form>
    {accion.isPending && <EstadoCarga texto="Iniciando la atención…" />}
    {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
  </>;
}

export function CallCenter() {
  const [consentimientoHilo, setConsentimientoHilo] = useState<string>();
  const [esperarNuevaLlamada, setEsperarNuevaLlamada] = useState(false);
  const [hiloConAsistente, setHiloConAsistente] = useState<string>();
  const cliente = useCliente();
  const contexto = useContextoConsulta();
  const { respuesta: ultimaRespuesta } = useRespuestaComando();
  const inicio = useAccion();
  const nuevaCita = useAccion();
  const [avisoOculto, setAvisoOculto] = useState(false);
  const [fechaValidada, setFechaValidada] = useState<{ hiloId: string | undefined; fecha: string }>();
  const mostrarLlamada = !esperarNuevaLlamada || inicio.isSuccess;
  const respuesta = mostrarLlamada ? ultimaRespuesta : undefined;
  // Un contexto de demo ajeno no sustituye la llamada activa de esta pestaña (D4).
  const hiloInicialMock = cliente.modo === 'mock' ? nuevaCita.data?.tramite.hiloId ?? inicio.data?.tramite.hiloId : undefined;
  const hiloId = mostrarLlamada && (cliente.modo === 'mock' || respuesta) ? hiloInicialMock ?? contexto.hiloId : undefined;
  useSala(hiloId ? `hilo:${hiloId}` : undefined);
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  const nacimiento = useConsulta('fechaNacimientoLlamada', hiloId ? { hiloId } : undefined);
  const fechaNacimiento = nacimiento.data?.fechaNacimiento;
  const mismoPacienteEnNuevaCita = nuevaCita.isSuccess && nuevaCita.data?.tramite.hiloId === hiloId
    && nuevaCita.data?.eventos.some(evento => evento.tipo === 'PacienteAsignado')
    && fechaValidada?.hiloId === inicio.data?.tramite.hiloId;
  const validada = fechaValidada !== undefined && fechaValidada.fecha === fechaNacimiento
    && (fechaValidada.hiloId === hiloId || mismoPacienteEnNuevaCita);
  const errorNacimiento = nacimiento.error instanceof ErrorCliente && nacimiento.error.tipo === 'NO_DISPONIBLE'
    ? null : nacimiento.error;
  const verificacionPendiente = nacimiento.isPending || Boolean(fechaNacimiento && !validada)
    || Boolean(errorNacimiento && ficha.data?.nombrePila);
  const catalogo = useConsulta('catalogo', {});
  const accion = useAccion();
  const codigo = ficha.data?.codigoContinuacion?.replace(/^CONTINUAR\s+/, '');
  const accionInicio = inicio.variables?.accion;
  const comandoInicio = accionInicio?.tipo === 'comando' ? accionInicio.comando : undefined;
  const ani = inicio.isSuccess && comandoInicio?.tipo === 'IniciarTramite'
    ? comandoInicio.payload.contacto : undefined;
  const rutaContinuacion = codigo
    ? `/wa?continuar=${encodeURIComponent(codigo)}${ani ? `&numero=${encodeURIComponent(ani)}` : ''}`
    : '/wa';
  const tramiteDeLlamada = nuevaCita.data?.tramite ?? inicio.data?.tramite;
  const tramiteInicial = tramiteDeLlamada?.hiloId === hiloId ? tramiteDeLlamada : undefined;
  const tramite = (tramiteInicial
    ? ficha.data?.tramites.find(t => t.id === tramiteInicial.id) ?? tramiteInicial
    : ficha.data?.tramites[0]) ?? respuesta?.tramite;
  const mostrarAviso = inicio.isSuccess && !avisoOculto && !nuevaCita.isSuccess
    && !inicio.data?.eventos.some(evento => evento.tipo === 'TramiteIniciado');
  const abrirNuevaCita = () => {
    if (!ani) return;
    const enviada = nuevaCita.ejecutar({
      tipo: 'comando', titulo: 'Nueva cita', comando: ComandoRequestSchema.parse({
        canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite',
        payload: { tipoTramite: 'AGENDAR', contacto: ani, nuevo: true },
      }),
    });
    if (enviada) {
      setConsentimientoHilo(undefined);
      setHiloConAsistente(undefined);
      accion.reset();
    }
  };
  const pregunta = respuesta?.siguientePregunta;
  const llamadaCerrada = accion.isSuccess && accion.variables?.accion.titulo === 'Cerrar atención (llamada cortada)';
  const tramiteNuevo = nuevaCita.data?.tramite;
  const nuevaCitaEnBorrador = tramiteNuevo?.id === tramite?.id && tramite?.estado === 'BORRADOR';
  const puedeCompletarCita = tramiteNuevo
    ? tramite?.id === tramiteNuevo.id && !nuevaCitaEnBorrador && estadosEnProceso.includes(tramite.estado)
    : ficha.data?.tramites.some(t => t.tipo === 'AGENDAR' && estadosEnProceso.includes(t.estado));
  const continuacionDeshabilitada = accion.isPending || accion.isError || ficha.data?.soloLectura || Boolean(codigo) || llamadaCerrada;
  const solicitarContinuacion = (tramiteId: string, titulo: string) => accion.ejecutar({
    tipo: 'comando', titulo, comando: ComandoRequestSchema.parse({
      canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SolicitarContinuacion', tramiteId, payload: { destino: 'whatsapp' },
    }),
  });
  return <>
    <h1>Call Center</h1>
    <p className="introduccion">Inicia la atención y continúa la misma conversación en WhatsApp.</p>
    {!tramite && <LlamadaEntrante accion={inicio} />}
    {tramite && <button type="button" disabled={inicio.isPending || nuevaCita.isPending || accion.isPending} onClick={() => {
      setEsperarNuevaLlamada(true);
      setConsentimientoHilo(undefined);
      setHiloConAsistente(undefined);
      setAvisoOculto(false);
      setFechaValidada(undefined);
      nuevaCita.reset();
      inicio.reset();
      accion.reset();
    }}>Volver a nueva llamada</button>}
    {hiloId && ficha.isPending && <EstadoCarga />}
    {errorNacimiento &&
      <EstadoError error={errorNacimiento} onReintentar={() => { void nacimiento.refetch(); }} />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <>
      <section className="seccion" aria-labelledby="titulo-ficha"><h2 id="titulo-ficha">Ficha del hilo</h2>
        <dl className="datos"><div><dt>Paciente de demo</dt><dd>{ficha.data.nombrePila ?? '—'}</dd></div><div><dt>Contacto</dt><dd>{ficha.data.telefonoEnmascarado ?? '—'}</dd></div></dl>
        {!ficha.data.soloLectura && respuesta && pregunta?.tipo === 'PREGUNTA' && pregunta.casilla === 'paciente' && pregunta.pista.paso && <IdentificacionAsesor key={respuesta.tramite.id + JSON.stringify(pregunta.pista)} tramiteId={respuesta.tramite.id} pista={pregunta.pista} />}
        {ficha.data.tramites.map(tramite => <p key={tramite.id}>Estado del trámite: <strong>{tramite.estado}</strong></p>)}
        {ficha.data.oferta && <dl className="datos"><div><dt>Servicio</dt><dd>{ficha.data.oferta.servicio}</dd></div><div><dt>Sede</dt><dd>{ficha.data.oferta.sede}</dd></div><div><dt>Cotización</dt><dd>{dinero(ficha.data.oferta.precioCentavos)}</dd></div></dl>}
        {ficha.data.soloLectura && <p className="aviso">La atención continúa en otro canal. Esta ficha es de solo lectura.</p>}
        {fechaNacimiento && <>
          <dl className="datos"><div><dt>Fecha de nacimiento</dt><dd>{fechaNacimiento.split('-').reverse().join('/')}</dd></div></dl>
          <label className="consentimiento"><input type="checkbox" checked={validada}
            onChange={evento => setFechaValidada(evento.target.checked ? { hiloId, fecha: fechaNacimiento } : undefined)} />
            Validé la fecha de nacimiento con el cliente
          </label>
        </>}
        {mostrarAviso && <div className="aviso">
          <p>Este número tiene un estudio en proceso:{ficha.data.oferta
            ? ' ' + ficha.data.oferta.servicio + ' en ' + ficha.data.oferta.sede : ''}</p>
          <button type="button" disabled={verificacionPendiente || nuevaCita.isPending || nuevaCita.isError}
            onClick={() => setAvisoOculto(true)}>Continuar con este estudio</button>
          <button type="button" disabled={verificacionPendiente || !ani || nuevaCita.isPending || nuevaCita.isError}
            onClick={abrirNuevaCita}>Nueva cita</button>
        </div>}
        <div className="acciones">
          {tramite && (!ficha.data.oferta || nuevaCitaEnBorrador) && catalogo.data?.map(oferta => <button type="button" key={`${oferta.servicioId}:${oferta.sedeId}`} disabled={accion.isPending || ficha.data.soloLectura} onClick={() => accion.ejecutar({ tipo: 'comandos', titulo: 'Cotizar paquete', comandos: [
            ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarServicio', tramiteId: tramite.id, payload: { servicioId: oferta.servicioId } }),
            ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarSede', tramiteId: tramite.id, payload: { sedeId: oferta.sedeId } }),
          ] })}>Cotizar {oferta.servicio} en {oferta.sede} · {dinero(oferta.precioCentavos)}</button>)}
        </div>
        {tramite && <>
          <label className="consentimiento"><input type="checkbox" checked={consentimientoHilo === hiloId} disabled={accion.isPending || ficha.data.soloLectura || Boolean(codigo)} onChange={evento => setConsentimientoHilo(evento.target.checked ? hiloId : undefined)} />El paciente aceptó continuar por WhatsApp</label>
          <button type="button" disabled={consentimientoHilo !== hiloId || continuacionDeshabilitada} onClick={() => solicitarContinuacion(tramite.id, 'Continuar por WhatsApp')}>Continuar por WhatsApp</button>
          {!['ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'EXPIRADO'].includes(tramite.estado) &&
            <button type="button" disabled={continuacionDeshabilitada} onClick={() => solicitarContinuacion(tramite.id, 'Cerrar atención (llamada cortada)')}>Cerrar atención (llamada cortada)</button>}
        </>}
        {llamadaCerrada && <p role="status">Llamada cerrada</p>}
        {ani && !llamadaCerrada && (hiloConAsistente === hiloId
          ? <AsistenteCita key={hiloId} telefono={ani} />
          : puedeCompletarCita && <button type="button" disabled={verificacionPendiente || accion.isPending || nuevaCita.isPending}
            onClick={() => setHiloConAsistente(hiloId)}>Completar la cita aquí</button>)}
        {codigo && <div className="continuacion"><Link className="enlace-principal" to={rutaContinuacion}>Abrir WhatsApp</Link><QrCita token={new URL(rutaContinuacion, location.origin).toString()} etiqueta="Código QR de continuación" /></div>}
      </section>
      <LineaTiempo eventos={ficha.data.lineaTiempo} />
    </>}
    {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
    {nuevaCita.isPending && <EstadoCarga texto="Abriendo una nueva cita" />}
    {nuevaCita.isError && <EstadoError error={nuevaCita.error} onReintentar={nuevaCita.reintentar} />}
    {accion.isPending && <EstadoCarga texto="Actualizando la atención…" />}
    {accion.isError && <EstadoError error={accion.error} {...(ficha.data?.soloLectura ? {} : { onReintentar: accion.reintentar })} />}
  </>;
}
