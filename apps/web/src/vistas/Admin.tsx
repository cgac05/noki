import { useCliente, useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LineaTiempo, NOMBRES_CANAL } from '../componentes/LineaTiempo.tsx';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
import { useSala } from '../cliente/useSala.ts';
import { RelojDemo } from '../componentes/RelojDemo.tsx';
import type { HuecoVista } from '@noki/contracts';
import { fechaEnSede } from '../componentes/formato.ts';

const ETIQUETAS_KPI: Record<string, string> = {
  cambiosCanal: 'Cambios de canal', cambiosCanalPorHilo: 'Cambios de canal por hilo',
  tramitesRecuperados: 'Trámites recuperados', citasConfirmadas: 'Citas confirmadas',
  llegadasRegistradas: 'Llegadas registradas', datosRepetidos: 'Datos repetidos',
  intentosVerificacionFallidos: 'Intentos de verificación fallidos',
  huecosLiberados: 'Huecos liberados', huecosRecuperados: 'Huecos recuperados',
  horasRecursoRecuperadas: 'Horas de recurso recuperadas', diasAdelantadosPromedio: 'Días adelantados en promedio',
};
const ESTADOS_HUECO: Record<HuecoVista['estado'], string> = { DETECTADO: 'Detectado', OFRECIDO: 'Ofrecido', ASIGNADO: 'Asignado', DESIERTO: 'Desierto' };
const ESTADOS_OFERTA: Record<HuecoVista['ofertas'][number]['estado'], string> = { OFRECIDA: 'Ofrecida', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', EXPIRADA: 'Expirada', PERDIDA: 'Perdida' };
const formatoNumero = new Intl.NumberFormat('es-MX', { maximumSignificantDigits: 21 });
const formatoHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export function Admin() {
  const cliente = useCliente();
  const metricas = useConsulta('metricas', {});
  const alertas = useConsulta('alertasSeguridad', {});
  const huecos = useConsulta('panelHuecos', {});
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
    <section className="seccion" aria-labelledby="titulo-huecos">
      <h2 id="titulo-huecos">Panel de huecos</h2>
      {huecos.isPending && <EstadoCarga texto="Cargando huecos…" />}
      {huecos.isError && <EstadoError error={huecos.error} onReintentar={() => { void huecos.refetch(); }} />}
      {huecos.data?.length === 0 && <p>No hay huecos liberados.</p>}
      {huecos.data && huecos.data.length > 0 && <ol className="panel-huecos" aria-label="Huecos liberados">{huecos.data.map(hueco => <li key={hueco.id}>
        <h3>{hueco.servicio}</h3>
        <dl className="datos">
          <div><dt>Sede</dt><dd>{hueco.sede}</dd></div>
          <div><dt>Fecha y hora en la sede</dt><dd><time dateTime={hueco.inicio}>{fechaEnSede(hueco.inicio, hueco.zonaHoraria)}</time><small>{hueco.zonaHoraria}</small></dd></div>
          <div><dt>Estado del hueco</dt><dd>{ESTADOS_HUECO[hueco.estado]}</dd></div>
        </dl>
        <ol className="ofertas-hueco" aria-label={`Ofertas de ${hueco.servicio}`}>{hueco.ofertas.map((oferta, indice) => <li key={indice}>
          <strong>{ESTADOS_OFERTA[oferta.estado]}</strong>
          <dl className="datos"><div><dt>Envío</dt><dd><time dateTime={oferta.enviadaEn}>{formatoHora.format(new Date(oferta.enviadaEn))}</time></dd></div>
            <div><dt>Vencimiento</dt><dd><time dateTime={oferta.expiraEn}>{formatoHora.format(new Date(oferta.expiraEn))}</time></dd></div></dl>
        </li>)}</ol>
      </li>)}</ol>}
    </section>
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
