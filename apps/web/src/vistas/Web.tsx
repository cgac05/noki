import { useState } from 'react';
import { Link } from 'react-router';
import { ComandoRequestSchema, type CitaVista, type ComandoRequest, type OfertaCatalogo, type RespuestaComando } from '@noki/contracts';
import { useCliente, useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { QrCita } from '../componentes/QrCita.tsx';
import { useSala } from '../cliente/useSala.ts';
import { dinero, fechaEnSede } from '../componentes/formato.ts';

export function Web() {
  const cliente = useCliente();
  if (cliente.modo === 'real') return <WebReal />;
  return <>
    <h1>Web</h1><p className="introduccion">Cotiza tu estudio y continúa la atención por WhatsApp.</p>
    <WebSimulada />
  </>;
}

const pacienteWeb = { canal: 'web', actor: 'paciente' } as const;

function sobreTramite(respuesta: RespuestaComando | undefined) {
  if (!respuesta) throw new Error('Falta el trámite de la cotización.');
  return { ...pacienteWeb, tramiteId: respuesta.tramite.id, hiloId: respuesta.tramite.hiloId };
}

const formatoTelefono = /^\d{10,15}$/;

function WebReal() {
  const [telefono, setTelefono] = useState('');
  const [paso, setPaso] = useState<'telefono' | 'citas' | 'cotizar'>('telefono');
  const [pagos, setPagos] = useState<Record<string, string>>({});
  const telefonoValido = formatoTelefono.test(telefono);

  return <>
    <h1>Paga tu cita</h1>
    <p className="introduccion">Simulación: no se realiza ningún cobro</p>
    {paso === 'telefono' && <>
      <form className="seccion" onSubmit={evento => {
        evento.preventDefault();
        if (telefonoValido) setPaso('citas');
      }}>
        <label htmlFor="telefono-pago">Teléfono</label>
        <input id="telefono-pago" type="tel" inputMode="numeric" autoComplete="off"
          value={telefono} onChange={evento => setTelefono(evento.target.value)}
          aria-invalid={telefono !== '' && !telefonoValido} aria-describedby="formato-telefono-pago" />
        <p id="formato-telefono-pago">Escribe de 10 a 15 dígitos, sin espacios ni signos.</p>
        <button type="submit" disabled={!telefonoValido}>Ver citas</button>
      </form>
      <button type="button" className="boton-secundario" onClick={() => setPaso('cotizar')}>¿Aún no tienes cita? Cotiza un estudio</button>
    </>}
    {paso === 'citas' && <PagoCitas telefonoEnmascarado={`•••• ${telefono.slice(-4)}`} pagos={pagos}
      registrar={(id, folio) => setPagos(anteriores => ({ ...anteriores, [id]: folio }))}
      volver={() => setPaso('telefono')} />}
    {paso === 'cotizar' && <CotizacionWeb telefonoInicial={telefono} volver={() => setPaso('telefono')} />}
  </>;
}

function clavePago(id: string) {
  return `noki:pago-simulado:${id}`;
}

function leerPago(id: string) {
  try { return sessionStorage.getItem(clavePago(id)); }
  catch { return null; }
}

function PagoCitas({ telefonoEnmascarado, pagos, registrar, volver }: {
  telefonoEnmascarado: string;
  pagos: Record<string, string>;
  registrar: (id: string, folio: string) => void;
  volver: () => void;
}) {
  const contexto = useContextoConsulta();
  const { pacienteId } = contexto;
  useSala(pacienteId ? `paciente:${pacienteId}` : undefined);
  const citas = useConsulta('citasPaciente', pacienteId ? { pacienteId } : undefined);
  const catalogo = useConsulta('catalogo', pacienteId ? {} : undefined);
  const [seleccion, setSeleccion] = useState<string>();
  const [recibo, setRecibo] = useState<string>();
  const confirmadas = citas.data?.filter(cita => cita.tramite.estado === 'CONFIRMADA') ?? [];
  const citaElegida = confirmadas.find(cita => cita.tramite.id === seleccion);

  function precio(cita: CitaVista) {
    return catalogo.data?.find(oferta => oferta.servicioId === cita.tramite.servicioId &&
      oferta.sedeId === cita.tramite.sedeId)?.precioCentavos;
  }

  function confirmarPago(cita: CitaVista) {
    const id = cita.tramite.id;
    const folio = pagos[id] ?? leerPago(id) ?? `SIM-${crypto.randomUUID()}`;
    try { sessionStorage.setItem(clavePago(id), folio); }
    catch { /* El estado local conserva el pago si el navegador bloquea el almacenamiento. */ }
    registrar(id, folio);
    setRecibo(folio);
  }

  const precioElegido = citaElegida && precio(citaElegida);
  const pagoElegido = seleccion && (pagos[seleccion] ?? leerPago(seleccion));
  const sinCitas = !contexto.cargando && !contexto.error && (!pacienteId || (citas.isSuccess && confirmadas.length === 0));

  return <>
    <p>{telefonoEnmascarado}</p>
    {recibo ? <section className="seccion" aria-label="Recibo simulado">
      <h2>Pago simulado registrado</h2>
      <p>Folio de pago: {recibo}</p>
      <button type="button" className="boton-secundario" onClick={() => setRecibo(undefined)}>Volver</button>
    </section> : citaElegida && precioElegido !== undefined ? <section className="seccion">
      <h2>Pago con CoDi</h2>
      <p>{citaElegida.servicio} · {citaElegida.sede}</p>
      <p className="precio">{dinero(precioElegido)}</p>
      {pagoElegido ? <p>Pagada</p> : <>
        <p>Escanea con tu app bancaria (simulación)</p>
        <div role="button" tabIndex={0} aria-label="Simular pago con CoDi"
          onClick={evento => {
            if (evento.target instanceof Element && evento.target.closest('button')) return;
            confirmarPago(citaElegida);
          }}
          onKeyDown={evento => {
            if (evento.target !== evento.currentTarget || (evento.key !== 'Enter' && evento.key !== ' ')) return;
            evento.preventDefault();
            confirmarPago(citaElegida);
          }}>
          <QrCita token="CODI-DEMO" etiqueta="Código QR de CoDi" />
        </div>
      </>}
      <button type="button" className="boton-secundario" onClick={() => setSeleccion(undefined)}>Volver</button>
    </section> : <>
      {contexto.cargando && <EstadoCarga texto="Consultando el contexto de atención…" />}
      {contexto.error && <EstadoError error={contexto.error} onReintentar={contexto.actualizar} />}
      {pacienteId && (citas.isPending || catalogo.isPending) && <EstadoCarga texto="Consultando tus citas…" />}
      {citas.isError && <EstadoError error={citas.error} onReintentar={() => { void citas.refetch(); }} />}
      {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
      {sinCitas && <section className="seccion">
        <h2>No encontramos citas pendientes</h2>
        <p>Agenda una cita en <Link to="/wa">WhatsApp</Link> o en <Link to="/callcenter">Call Center</Link>.</p>
      </section>}
      {confirmadas.map(cita => {
        const id = cita.tramite.id;
        const importe = precio(cita);
        const pagada = pagos[id] ?? leerPago(id);
        return <section className="seccion" key={id} aria-label={cita.servicio}>
          <h2>{cita.servicio}</h2>
          <p>{cita.sede}</p>
          <p><time dateTime={cita.inicio}>{fechaEnSede(cita.inicio, cita.zonaHoraria)}</time></p>
          {importe !== undefined && <p className="precio">{dinero(importe)}</p>}
          {pagada ? <p>Pagada</p> : importe !== undefined
            ? <button type="button" onClick={() => setSeleccion(id)}>Pagar con CoDi</button>
            : catalogo.isSuccess && <p>El precio de esta cita no está disponible.</p>}
        </section>;
      })}
      <button type="button" className="boton-secundario" onClick={volver}>Volver</button>
    </>}
  </>;
}

function CotizacionWeb({ telefonoInicial, volver }: { telefonoInicial: string; volver: () => void }) {
  const catalogo = useConsulta('catalogo', {});
  const cotizar = useAccion();
  const continuar = useAccion();
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [oferta, elegirOferta] = useState<OfertaCatalogo>();
  const telefonoValido = formatoTelefono.test(telefono);
  const hiloId = continuar.data?.tramite.hiloId;
  const ficha = useConsulta('fichaHilo', hiloId ? { hiloId } : undefined);
  const codigo = ficha.data?.codigoContinuacion?.replace(/^CONTINUAR\s+/, '');
  const enlace = codigo ? '/wa?continuar=' + encodeURIComponent(codigo) : undefined;

  function cotizarOferta(seleccion: OfertaCatalogo) {
    if (!telefonoValido) return;
    const iniciada = cotizar.ejecutar({ tipo: 'comandos', titulo: 'Cotizar', comandos: [
      { ...pacienteWeb, tipo: 'IniciarTramite', payload: { tipoTramite: 'AGENDAR', contacto: telefono } },
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
      {catalogo.data.length > 0 && <>
        <label htmlFor="telefono-web">Teléfono</label>
        <input id="telefono-web" type="tel" inputMode="numeric" autoComplete="off"
          value={telefono} disabled={cotizar.isPending || cotizar.isError}
          aria-invalid={telefono !== '' && !telefonoValido} aria-describedby="formato-telefono-web"
          onChange={evento => setTelefono(evento.target.value)} />
        <p id="formato-telefono-web">Escribe de 10 a 15 dígitos, sin espacios ni signos.</p>
      </>}
      {catalogo.data.length === 0 && <p>No hay servicios disponibles para cotizar.</p>}
      <div className="acciones">
        {catalogo.data.map(seleccion => <button type="button" key={`${seleccion.servicioId}:${seleccion.sedeId}`}
          disabled={!telefonoValido || cotizar.isPending || cotizar.isError} onClick={() => cotizarOferta(seleccion)}>
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
    <button type="button" className="boton-secundario" disabled={cotizar.isPending || continuar.isPending}
      onClick={() => {
        if (!cotizar.data) { volver(); return; }
        continuar.reset();
        cotizar.reset();
      }}>Volver</button>
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
