import { useState } from 'react';
import { Link } from 'react-router';
import { ComandoRequestSchema } from '@noki/contracts';
import { useCliente, useConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { dinero } from '../componentes/formato.ts';

export function Web() {
  const web = useConsulta('web', {});
  const tramiteId = useCliente().demo?.ids.tramiteWebId;
  const accion = useAccion();
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  return <>
    <h1>Web</h1><p className="introduccion">Cotiza tu estudio y continúa la atención por WhatsApp.</p>
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
