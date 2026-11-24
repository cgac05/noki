import { Link } from 'react-router';
import { ComandoRequestSchema } from '@noki/contracts';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { useCliente, useConsulta, useContextoConsulta, useRespuestaComando } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo } from '../componentes/LineaTiempo.tsx';
import { dinero } from '../componentes/formato.ts';

export function CallCenter() {
  const cliente = useCliente();
  const { hiloId } = useContextoConsulta();
  const { respuesta } = useRespuestaComando();
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  const catalogo = useConsulta('catalogo', {});
  const accion = useAccion();
  const tramite = ficha.data?.tramites[0] ?? respuesta?.tramite;
  return <>
    <h1>Call Center</h1>
    <p className="introduccion">Inicia la atención y continúa la misma conversación en WhatsApp.</p>
    {!tramite && <button type="button" disabled={accion.isPending} onClick={() => accion.ejecutar({ tipo: 'comando', titulo: 'Llamada entrante', comando: ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' } }) })}>Llamada entrante</button>}
    {ficha.isPending && <EstadoCarga />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <>
      <section className="seccion" aria-labelledby="titulo-ficha"><h2 id="titulo-ficha">Ficha del hilo</h2>
        <dl className="datos"><div><dt>Paciente de demo</dt><dd>{ficha.data.nombrePila}</dd></div><div><dt>Contacto</dt><dd>{ficha.data.telefonoEnmascarado}</dd></div></dl>
        {ficha.data.tramites.map(tramite => <p key={tramite.id}>Estado del trámite: <strong>{tramite.estado}</strong></p>)}
        {ficha.data.oferta && <dl className="datos"><div><dt>Servicio</dt><dd>{ficha.data.oferta.servicio}</dd></div><div><dt>Sede</dt><dd>{ficha.data.oferta.sede}</dd></div><div><dt>Cotización</dt><dd>{dinero(ficha.data.oferta.precioCentavos)}</dd></div></dl>}
        {ficha.data.codigoContinuacion && <p className="continuacion">Código de continuación: <code>{ficha.data.codigoContinuacion}</code></p>}
        {ficha.data.soloLectura && <p className="aviso">La atención continúa en otro canal. Esta ficha es de solo lectura.</p>}
        <div className="acciones">
          {tramite && !ficha.data.oferta && catalogo.data?.map(oferta => <button type="button" key={`${oferta.servicioId}:${oferta.sedeId}`} disabled={accion.isPending || ficha.data.soloLectura} onClick={() => accion.ejecutar({ tipo: 'comandos', titulo: 'Cotizar paquete', comandos: [
            ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarServicio', tramiteId: tramite.id, payload: { servicioId: oferta.servicioId } }),
            ComandoRequestSchema.parse({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'SeleccionarSede', tramiteId: tramite.id, payload: { sedeId: oferta.sedeId } }),
          ] })}>Cotizar paquete en {oferta.sede}</button>)}
          {cliente.demo && ficha.data.oferta && !ficha.data.codigoContinuacion && <button type="button" disabled={accion.isPending || ficha.data.soloLectura} onClick={() => accion.ejecutar({ tipo: 'wa', titulo: 'Continuar por WhatsApp', mensaje: { waId: CONTACTO_DEMO, payloadBoton: 'enviar-continuacion' } })}>Continuar por WhatsApp</button>}
        </div>
        <Link className="enlace-principal" to="/wa">Abrir WhatsApp</Link>
      </section>
      <LineaTiempo eventos={ficha.data.lineaTiempo} />
    </>}
    {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
    {accion.isPending && <EstadoCarga texto="Actualizando la atención…" />}
    {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
  </>;
}
