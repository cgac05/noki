import { useCliente, useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo, NOMBRES_CANAL } from '../componentes/LineaTiempo.tsx';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
import { useSala } from '../cliente/useSala.ts';
import { RelojDemo } from '../componentes/RelojDemo.tsx';

const ETIQUETAS_KPI: Record<string, string> = {
  cambiosCanal: 'Cambios de canal', cambiosCanalPorHilo: 'Cambios de canal por hilo',
  tramitesRecuperados: 'Trámites recuperados', citasConfirmadas: 'Citas confirmadas',
  llegadasRegistradas: 'Llegadas registradas', datosRepetidos: 'Datos repetidos',
  intentosVerificacionFallidos: 'Intentos de verificación fallidos',
};
const formatoNumero = new Intl.NumberFormat('es-MX', { maximumSignificantDigits: 21 });
const formatoHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export function Admin() {
  const cliente = useCliente();
  const metricas = useConsulta('metricas', {});
  const alertas = useConsulta('alertasSeguridad', {});
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
    <section className="seccion" aria-labelledby="titulo-alertas">
      <h2 id="titulo-alertas">Alertas de seguridad</h2>
      {alertas.isPending && <EstadoCarga texto="Cargando alertas de seguridad…" />}
      {alertas.isError && <EstadoError error={alertas.error} onReintentar={() => { void alertas.refetch(); }} />}
      {alertas.data?.length === 0 && <p>Sin alertas de seguridad</p>}
      {alertas.data && alertas.data.length > 0 && <ol className="linea-tiempo" aria-label="Alertas de seguridad">
        {alertas.data.map(alerta => <li key={alerta.id}>
          <strong>{NOMBRES_CANAL[alerta.canal]}</strong>
          <span>{alerta.intentos} {alerta.intentos === 1 ? 'intento' : 'intentos'}{alerta.bloqueado && <> · <strong>Bloqueado</strong></>}</span>
          <time dateTime={alerta.ts}>{formatoHora.format(new Date(alerta.ts))}</time>
        </li>)}
      </ol>}
    </section>
    {!hiloId && <EstadoContexto contexto={contexto} texto="Aún no hay un hilo que mostrar. Inicia la atención o confirma una cita y vuelve a actualizar." />}
    {hiloId && ficha.isPending && <EstadoCarga texto="Cargando el hilo…" />}
    {ficha.isError && <EstadoError error={ficha.error} onReintentar={() => { void ficha.refetch(); }} />}
    {ficha.data && <LineaTiempo eventos={ficha.data.lineaTiempo} />}
    {cliente.relojDemo && <RelojDemo reloj={cliente.relojDemo} />}
  </>;
}
