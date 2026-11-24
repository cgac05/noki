import { Link } from 'react-router';
import { useConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo } from '../componentes/LineaTiempo.tsx';
import { dinero } from '../componentes/formato.ts';

export function CallCenter() {
  const ficha = useConsulta('ficha', {});
  const accion = useAccion();
  return <>
    <h1>Call Center</h1>
    <p className="introduccion">Inicia la atención y continúa la misma conversación en WhatsApp.</p>
    {ficha.isPending && <EstadoCarga />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <>
      <section className="seccion" aria-labelledby="titulo-ficha"><h2 id="titulo-ficha">Ficha del hilo</h2>
        <dl className="datos"><div><dt>Paciente de demo</dt><dd>{ficha.data.nombrePila}</dd></div><div><dt>Contacto</dt><dd>{ficha.data.telefonoEnmascarado}</dd></div></dl>
        {ficha.data.tramites.map(tramite => <p key={tramite.id}>Estado del trámite: <strong>{tramite.estado}</strong></p>)}
        {ficha.data.catalogo && <dl className="datos"><div><dt>Servicio</dt><dd>{ficha.data.catalogo.servicio}</dd></div><div><dt>Sede</dt><dd>{ficha.data.catalogo.sede}</dd></div><div><dt>Cotización</dt><dd>{dinero(ficha.data.catalogo.precioCentavos)}</dd></div></dl>}
        {ficha.data.codigoContinuacion && <p className="continuacion">Código de continuación: <code>{ficha.data.codigoContinuacion}</code></p>}
        {ficha.data.soloLectura && <p className="aviso">La atención continúa en otro canal. Esta ficha es de solo lectura.</p>}
        <div className="acciones">{ficha.data.acciones.map((opcion, indice) => <button type="button" key={indice} disabled={accion.isPending} onClick={() => accion.ejecutar(opcion)}>{opcion.titulo}</button>)}</div>
        {accion.isPending && <EstadoCarga texto="Actualizando la atención…" />}
        {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
        <Link className="enlace-principal" to="/wa">Abrir WhatsApp</Link>
      </section>
      <LineaTiempo eventos={ficha.data.lineaTiempo} />
    </>}
  </>;
}
