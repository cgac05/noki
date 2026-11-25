import { Link } from 'react-router';
import { ComandoRequestSchema } from '@noki/contracts';
import { useState } from 'react';
import { QrCita } from '../componentes/QrCita.tsx';
import { useCliente, useConsulta, useContextoConsulta, useRespuestaComando } from '../cliente/ProveedorCliente.tsx';
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
  const mostrarLlamada = !esperarNuevaLlamada || inicio.isSuccess;
  const respuesta = mostrarLlamada ? ultimaRespuesta : undefined;
  // Un contexto de demo ajeno no sustituye la llamada activa de esta pestaña (D4).
  const hiloId = mostrarLlamada && (cliente.modo === 'mock' || respuesta) ? contexto.hiloId : undefined;
  useSala(hiloId ? `hilo:${hiloId}` : undefined);
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  const catalogo = useConsulta('catalogo', {});
  const accion = useAccion();
  const codigo = ficha.data?.codigoContinuacion?.replace(/^CONTINUAR\s+/, '');
  const accionInicio = inicio.variables?.accion;
  const comandoInicio = accionInicio?.tipo === 'comando' ? accionInicio.comando : undefined;
  const ani = inicio.isSuccess && inicio.data?.tramite.hiloId === hiloId && comandoInicio?.tipo === 'IniciarTramite'
    ? comandoInicio.payload.contacto : undefined;
  const rutaContinuacion = codigo
    ? `/wa?continuar=${encodeURIComponent(codigo)}${ani ? `&numero=${encodeURIComponent(ani)}` : ''}`
    : '/wa';
  const tramite = ficha.data?.tramites[0] ?? respuesta?.tramite;
  const pregunta = respuesta?.siguientePregunta;
  const llamadaCerrada = accion.isSuccess && accion.variables?.accion.titulo === 'Cerrar atención (llamada cortada)';
  const citaEnProceso = ficha.data?.tramites.some(t => t.tipo === 'AGENDAR' && estadosEnProceso.includes(t.estado));
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
    {tramite && <button type="button" disabled={inicio.isPending || accion.isPending} onClick={() => {
      setEsperarNuevaLlamada(true);
      setConsentimientoHilo(undefined);
      setHiloConAsistente(undefined);
      inicio.reset();
      accion.reset();
    }}>Volver a nueva llamada</button>}
    {hiloId && ficha.isPending && <EstadoCarga />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <>
      <section className="seccion" aria-labelledby="titulo-ficha"><h2 id="titulo-ficha">Ficha del hilo</h2>
        <dl className="datos"><div><dt>Paciente de demo</dt><dd>{ficha.data.nombrePila ?? '—'}</dd></div><div><dt>Contacto</dt><dd>{ficha.data.telefonoEnmascarado ?? '—'}</dd></div></dl>
        {!ficha.data.soloLectura && respuesta && pregunta?.tipo === 'PREGUNTA' && pregunta.casilla === 'paciente' && pregunta.pista.paso && <IdentificacionAsesor key={respuesta.tramite.id + JSON.stringify(pregunta.pista)} tramiteId={respuesta.tramite.id} pista={pregunta.pista} />}
        {ficha.data.tramites.map(tramite => <p key={tramite.id}>Estado del trámite: <strong>{tramite.estado}</strong></p>)}
        {ficha.data.oferta && <dl className="datos"><div><dt>Servicio</dt><dd>{ficha.data.oferta.servicio}</dd></div><div><dt>Sede</dt><dd>{ficha.data.oferta.sede}</dd></div><div><dt>Cotización</dt><dd>{dinero(ficha.data.oferta.precioCentavos)}</dd></div></dl>}
        {ficha.data.soloLectura && <p className="aviso">La atención continúa en otro canal. Esta ficha es de solo lectura.</p>}
        <div className="acciones">
          {tramite && !ficha.data.oferta && catalogo.data?.map(oferta => <button type="button" key={`${oferta.servicioId}:${oferta.sedeId}`} disabled={accion.isPending || ficha.data.soloLectura} onClick={() => accion.ejecutar({ tipo: 'comandos', titulo: 'Cotizar paquete', comandos: [
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
          : citaEnProceso && <button type="button" disabled={accion.isPending}
            onClick={() => setHiloConAsistente(hiloId)}>Completar la cita aquí</button>)}
        {codigo && <div className="continuacion"><Link className="enlace-principal" to={rutaContinuacion}>Abrir WhatsApp</Link><QrCita token={new URL(rutaContinuacion, location.origin).toString()} etiqueta="Código QR de continuación" /></div>}
      </section>
      <LineaTiempo eventos={ficha.data.lineaTiempo} />
    </>}
    {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
    {accion.isPending && <EstadoCarga texto="Actualizando la atención…" />}
    {accion.isError && <EstadoError error={accion.error} {...(ficha.data?.soloLectura ? {} : { onReintentar: accion.reintentar })} />}
  </>;
}
