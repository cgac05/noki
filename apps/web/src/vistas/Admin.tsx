import { useConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo } from '../componentes/LineaTiempo.tsx';

export function Admin() {
  const metricas = useConsulta('metricas', {});
  const ficha = useConsulta('ficha', {});
  return <>
    <h1>Administración</h1><p className="introduccion">El mismo hilo, con la trazabilidad de cada canal.</p>
    {metricas.isPending && <EstadoCarga />}
    {metricas.isError && <EstadoError error={metricas.error} onReintentar={() => { void metricas.refetch(); }} />}
    {metricas.data && <>
      <section className="seccion"><h2>Trámites por estado</h2><dl className="datos">{metricas.data.porEstado.map(fila => <div key={fila.estado}><dt>{fila.estado}</dt><dd>{fila.cantidad}</dd></div>)}</dl></section>
      <section className="seccion"><h2>Indicadores disponibles</h2><dl className="datos">{Object.entries(metricas.data.kpis).map(([nombre, valor]) => <div key={nombre}><dt>{nombre}</dt><dd>{valor}</dd></div>)}</dl></section>
    </>}
    {ficha.isPending && <EstadoCarga texto="Cargando el hilo…" />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <LineaTiempo eventos={ficha.data.lineaTiempo} />}
  </>;
}
