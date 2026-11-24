import { useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo } from '../componentes/LineaTiempo.tsx';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
import { useSala } from '../cliente/useSala.ts';

const ETIQUETAS_KPI: Record<string, string> = {
  cambiosCanal: 'Cambios de canal', cambiosCanalPorHilo: 'Cambios de canal por hilo',
  tramitesRecuperados: 'Trámites recuperados', citasConfirmadas: 'Citas confirmadas',
  llegadasRegistradas: 'Llegadas registradas', datosRepetidos: 'Datos repetidos',
  intentosVerificacionFallidos: 'Intentos de verificación fallidos',
};
const formatoNumero = new Intl.NumberFormat('es-MX', { maximumSignificantDigits: 21 });

export function Admin() {
  const metricas = useConsulta('metricas', {});
  const contexto = useContextoConsulta();
  const { hiloId } = contexto;
  useSala('admin');
  useSala(hiloId ? `hilo:${hiloId}` : undefined);
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  return <>
    <h1>Administración</h1><p className="introduccion">El mismo hilo, con la trazabilidad de cada canal.</p>
    {metricas.isPending && <EstadoCarga />}
    {metricas.isError && <EstadoError error={metricas.error} onReintentar={() => { void metricas.refetch(); }} />}
    {metricas.data && <>
      <section className="seccion"><h2>Trámites por estado</h2><dl className="datos">{metricas.data.porEstado.map(fila => <div key={fila.estado}><dt>{fila.estado}</dt><dd>{fila.cantidad}</dd></div>)}</dl></section>
      <section className="seccion"><h2>Indicadores disponibles</h2><dl className="datos">{Object.entries(metricas.data.kpis).map(([nombre, valor]) => <div key={nombre}><dt>{Object.hasOwn(ETIQUETAS_KPI, nombre) ? ETIQUETAS_KPI[nombre] : nombre}</dt><dd>{formatoNumero.format(valor)}</dd></div>)}</dl></section>
    </>}
    {!hiloId && <EstadoContexto contexto={contexto} texto="Aún no hay un hilo que mostrar. Inicia la atención o confirma una cita y vuelve a actualizar." />}
    {hiloId && ficha.isPending && <EstadoCarga texto="Cargando el hilo…" />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <LineaTiempo eventos={ficha.data.lineaTiempo} />}
  </>;
}
