import { useState } from 'react';
import { Link } from 'react-router';
import { ComandoRequestSchema, type ComandoRequest, type OfertaCatalogo, type RespuestaComando } from '@noki/contracts';
import { useCliente, useConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { QrCita } from '../componentes/QrCita.tsx';
import { dinero } from '../componentes/formato.ts';

export function Web() {
  const cliente = useCliente();
  return <>
    <h1>Web</h1><p className="introduccion">Cotiza tu estudio y continúa la atención por WhatsApp.</p>
    {cliente.modo === 'real' ? <WebReal /> : <WebSimulada />}
  </>;
}

const pacienteWeb = { canal: 'web', actor: 'paciente' } as const;

function sobreTramite(respuesta: RespuestaComando | undefined) {
  if (!respuesta) throw new Error('Falta el trámite de la cotización.');
  return { ...pacienteWeb, tramiteId: respuesta.tramite.id, hiloId: respuesta.tramite.hiloId };
}

function WebReal() {
  const catalogo = useConsulta('catalogo', {});
  const cotizar = useAccion();
  const continuar = useAccion();
  const [oferta, elegirOferta] = useState<OfertaCatalogo>();
  const hiloId = continuar.data?.tramite.hiloId;
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  const codigo = ficha.data?.codigoContinuacion?.replace(/^CONTINUAR\s+/, '');
  const enlace = codigo ? '/wa?continuar=' + encodeURIComponent(codigo) : undefined;

  function cotizarOferta(seleccion: OfertaCatalogo) {
    const iniciada = cotizar.ejecutar({ tipo: 'comandos', titulo: 'Cotizar', comandos: [
      { ...pacienteWeb, tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR' } },
      previa => ({ ...sobreTramite(previa), tipo: 'SeleccionarServicio', payload: { servicioId: seleccion.servicioId } }),
      previa => ({ ...sobreTramite(previa), tipo: 'SeleccionarSede', payload: { sedeId: seleccion.sedeId } }),
    ] });
    if (iniciada) elegirOferta(seleccion);
  }

  function solicitarContinuacion() {
    const comando: ComandoRequest = {
      ...sobreTramite(cotizar.data), tipo: 'SolicitarContinuacion', payload: { destino: 'whatsapp' },
    };
    continuar.ejecutar({ tipo: 'comando', titulo: 'Continuar en WhatsApp', comando });
  }

  return <>
    {catalogo.isPending && <EstadoCarga />}
    {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
    {catalogo.data && !cotizar.data && <section className="seccion">
      <h2>Servicios y sedes</h2>
      {catalogo.data.length === 0 && <p>No hay servicios disponibles para cotizar.</p>}
      <div className="acciones">
        {catalogo.data.map(seleccion => <button type="button" key={`${seleccion.servicioId}:${seleccion.sedeId}`}
          disabled={cotizar.isPending || cotizar.isError} onClick={() => cotizarOferta(seleccion)}>
          Cotizar {seleccion.servicio} en {seleccion.sede} · {dinero(seleccion.precioCentavos)}
        </button>)}
      </div>
    </section>}
    {cotizar.data && oferta && <section className="seccion">
      <h2>Tu cotización</h2>
      <dl className="datos"><div><dt>Servicio</dt><dd>{oferta.servicio}</dd></div><div><dt>Sede</dt><dd>{oferta.sede}</dd></div></dl>
      <p className="precio">{dinero(oferta.precioCentavos)}</p>
      <button type="button" disabled={continuar.isPending || continuar.isError || continuar.isSuccess}
        onClick={solicitarContinuacion}>Continuar en WhatsApp</button>
      {hiloId && ficha.isPending && <EstadoCarga texto="Buscando el código de continuación…" />}
      {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
      {ficha.isSuccess && !codigo && <EstadoError error={new Error('No encontramos el código de continuación.')}
        onReintentar={() => { void ficha.refetch(); }} />}
      {codigo && enlace && <div className="continuacion">
        <p>Usa este código para continuar:</p><code>CONTINUAR {codigo}</code>
        <Link className="enlace-principal" to={enlace}>Abrir WhatsApp</Link>
        <QrCita token={new URL(enlace, location.origin).toString()} etiqueta="Código QR de continuación" />
      </div>}
    </section>}
    {cotizar.isPending && <EstadoCarga texto="Preparando cotización…" />}
    {cotizar.isError && <EstadoError error={cotizar.error} onReintentar={cotizar.reintentar} />}
    {continuar.isPending && <EstadoCarga texto="Solicitando continuación…" />}
    {continuar.isError && <EstadoError error={continuar.error} onReintentar={continuar.reintentar} />}
  </>;
}

function WebSimulada() {
  const web = useConsulta('web', {});
  const tramiteId = useCliente().demo?.ids.tramiteWebId;
  const accion = useAccion();
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  return <>
    {web.isPending && <EstadoCarga />}
    {web.isError && <EstadoError error={web.error} onReintentar={() => { void web.refetch(); }} />}
    {web.data && <section className="seccion"><h2>Tu cotización</h2>
      <dl className="datos"><div><dt>Servicio</dt><dd>{web.data.catalogo.servicio}</dd></div><div><dt>Sede</dt><dd>{web.data.catalogo.sede}</dd></div></dl>
      {!web.data.cotizacion && <div className="acciones"><button type="button" disabled={accion.isPending || !tramiteId} onClick={() => accion.ejecutar({ tipo: 'comandos', titulo: 'Cotizar', comandos: [
        ComandoRequestSchema.parse({ canal: 'web', actor: 'paciente', tipo: 'SeleccionarServicio', tramiteId, payload: { servicioId: web.data.catalogo.servicioId } }),
        ComandoRequestSchema.parse({ canal: 'web', actor: 'paciente', tipo: 'SeleccionarSede', tramiteId, payload: { sedeId: web.data.catalogo.sedeId } }),
      ] })}>Cotizar en {web.data.catalogo.sede}</button></div>}
      {web.data.cotizacion && <><p className="precio">{dinero(web.data.cotizacion.precioCentavos)}</p><button type="button" onClick={() => setMostrarCodigo(true)}>Continuar en WhatsApp</button>
        {mostrarCodigo && <div className="continuacion"><p>Usa este código para continuar:</p><code>{web.data.cotizacion.codigoContinuacion}</code><Link className="enlace-principal" to="/wa">Abrir WhatsApp</Link></div>}
      </>}
      {accion.isPending && <EstadoCarga texto="Preparando cotización…" />}
      {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
    </section>}
  </>;
}
