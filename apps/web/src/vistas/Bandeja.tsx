import { useConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';

export function Bandeja() {
  const mensajes = useConsulta('bandeja', {});
  return <>
    <h1>Bandeja simulada</h1><p className="introduccion">SMS y correos ficticios de la demo. Los códigos se muestran solo aquí.</p>
    {mensajes.isPending && <EstadoCarga />}
    {mensajes.isError && <EstadoError error={mensajes.error} onReintentar={() => { void mensajes.refetch(); }} />}
    {mensajes.data?.length === 0 && <p className="seccion estado-vacio">No hay mensajes simulados todavía.</p>}
    {mensajes.data?.map(mensaje => <article className="seccion" key={mensaje.id}><h2>{mensaje.asunto}</h2><p className="canal-mensaje">{mensaje.canal === 'sms' ? 'SMS' : 'Correo'}</p><p>{mensaje.cuerpo}</p></article>)}
  </>;
}
