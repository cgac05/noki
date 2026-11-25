import { Link } from 'react-router';
import { useState } from 'react';
import type { CitaVista, TramiteVista } from '@noki/contracts';
import type { RespuestaConsultaCliente } from '../cliente/consultas.ts';
import { useCliente, useConsulta } from '../cliente/ProveedorCliente.tsx';
import { AsistenteCita } from '../componentes/AsistenteCita.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { QrCita } from '../componentes/QrCita.tsx';
import { fechaEnSede } from '../componentes/formato.ts';
import { SesionDemo } from '../componentes/SesionDemo.tsx';
import { useSala } from '../cliente/useSala.ts';
import { useAccion } from '../cliente/useAccion.ts';
import { ErrorCliente } from '../cliente/errores.ts';

function CancelacionCita({ cita }: { cita: CitaVista }) {
  const [confirmando, confirmar] = useState(false);
  const accion = useAccion();
  const pendiente = accion.error instanceof ErrorCliente && accion.error.codigo === 'STEP_UP_REQUERIDO';
  const cancelada = cita.tramite.estado === 'CANCELADA' || accion.data?.tramite.estado === 'CANCELADA';
  return <div>
    {cita.tramite.estado === 'CONFIRMADA' && (!confirmando || pendiente) && !accion.data && <button type="button" className="boton-secundario" onClick={() => { accion.reset(); confirmar(true); }}>Cancelar cita</button>}
    {confirmando && !accion.isSuccess && !pendiente && !cancelada && <div>
      <p>¿Quieres cancelar esta cita?</p>
      <button type="button" disabled={accion.isPending || accion.isError} onClick={() => accion.ejecutar({ tipo: 'comando', titulo: 'Cancelar cita', comando: { tipo: 'CancelarCita', canal: 'app', actor: 'paciente', tramiteId: cita.tramite.id, payload: {} } })}>Confirmar cancelación</button>
      <button type="button" className="boton-secundario" disabled={accion.isPending} onClick={() => { confirmar(false); accion.reset(); }}>Conservar cita</button>
    </div>}
    {accion.isPending && <EstadoCarga texto="Solicitando cancelación…" />}
    {accion.isError && !pendiente && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
    {cancelada && <p className="estado-exito" role="status">La cita se canceló.</p>}
    {pendiente && !cancelada && <div><p role="status">La cancelación espera aprobación en WhatsApp.</p><Link className="enlace-principal" to="/wa">Abrir WhatsApp</Link></div>}
  </div>;
}

export function App() {
  const cliente = useCliente();
  if (!cliente.sesionWebDemoHabilitada) return <>
    <h1>App</h1>
    <p>La consulta de citas está disponible en modo demo.</p>
  </>;

  return <SesionDemo textoVolver="Salir" sinRegistro={<SinCitasParaNumero />}
    mostrarSesion={(sesion, telefono, salir) => <PanelCitas key={telefono} sesion={sesion} telefono={telefono} salir={salir} />} />;
}

function esCitaEnProceso(tramite: TramiteVista) {
  return tramite.tipo === 'AGENDAR' && (tramite.estado === 'BORRADOR' || tramite.estado === 'COTIZADO' ||
    tramite.estado === 'LISTO_PARA_RESERVAR' || tramite.estado === 'HORARIO_RESERVADO');
}

function PanelCitas({ sesion, telefono, salir }: {
  sesion: RespuestaConsultaCliente<'sesionWebDemo'>; telefono: string; salir: () => void;
}) {
  const { pacienteId, nombreVisible, tramitesEnProceso } = sesion;
  const [mostrarAsistente, setMostrarAsistente] = useState(false);
  const abiertos = useConsulta('tramitesAbiertos', pacienteId ? { pacienteId } : undefined);
  const enProceso = [...(abiertos.data ?? []), ...tramitesEnProceso].filter(esCitaEnProceso);
  const pendientes = [...new Map(enProceso.map(tramite => [tramite.id, tramite])).values()];
  const catalogo = useConsulta('catalogo', pendientes.length ? {} : undefined);

  return <>
    {mostrarAsistente ? <section className="seccion">
      <h2>Continúa tu cita</h2>
      <AsistenteCita telefono={telefono} />
      <button type="button" className="boton-secundario" onClick={() => setMostrarAsistente(false)}>Volver</button>
    </section> : <>
      {(pacienteId || pendientes.length > 0) && <h1>{nombreVisible ? `Hola, ${nombreVisible}` : 'Tus citas'}</h1>}
      {pacienteId && abiertos.isPending && <EstadoCarga texto="Consultando citas por terminar…" />}
      {abiertos.isError && <EstadoError error={abiertos.error} onReintentar={() => { void abiertos.refetch(); }} />}
      {pendientes.length > 0 && <section className="seccion" aria-label="Citas por terminar">
        <h2>Citas por terminar</h2>
        {catalogo.isPending && <EstadoCarga texto="Consultando servicios y sedes…" />}
        {catalogo.isError && <EstadoError error={catalogo.error} onReintentar={() => { void catalogo.refetch(); }} />}
        <ul>
          {pendientes.map(tramite => {
            const servicio = catalogo.data?.find(oferta => oferta.servicioId === tramite.servicioId)?.servicio;
            const sede = catalogo.data?.find(oferta => oferta.sedeId === tramite.sedeId)?.sede;
            return <li key={tramite.id}>
              <p>{servicio ?? 'Cita en proceso'}</p>
              {sede && <p>{sede}</p>}
              <button type="button" onClick={() => setMostrarAsistente(true)}>Termina tu cita</button>
            </li>;
          })}
        </ul>
      </section>}
      {pacienteId ? <CitasPaciente key={pacienteId} pacienteId={pacienteId} />
        : pendientes.length === 0 && <SinCitasParaNumero />}
    </>}
    <button type="button" className="boton-secundario" onClick={salir}>Salir</button>
  </>;
}

function SinCitasParaNumero() {
  return <section className="seccion estado-vacio">
    <h2>No encontramos citas para este número</h2>
    <p><Link to="/web">Agendar en Web</Link> o <Link to="/wa">Agendar por WhatsApp</Link>.</p>
  </section>;
}

function CitasPaciente({ pacienteId }: { pacienteId: string }) {
  useSala(`paciente:${pacienteId}`);
  const citas = useConsulta('citasPaciente', { pacienteId });
  return <>
    <p className="introduccion">Tus citas y el QR para continuar en clínica.</p>
    {citas.isPending && <EstadoCarga />}
    {citas.isError && <EstadoError error={citas.error} onReintentar={() => { void citas.refetch(); }} />}
    {citas.data?.length === 0 && <div className="seccion estado-vacio"><p>Aún no hay citas para mostrar.</p><Link className="enlace-principal" to="/callcenter">Iniciar atención en Call Center</Link></div>}
    {citas.data?.map(cita => <section className="seccion cita" key={cita.tramite.id} aria-label="Cita del paciente">
      <div><h2>{cita.servicio}</h2><dl className="datos">
        <div><dt>Estado</dt><dd>{cita.tramite.estado}</dd></div><div><dt>Sede</dt><dd>{cita.sede}</dd></div>
        <div><dt>Fecha y hora en la sede</dt><dd><time dateTime={cita.inicio}>{fechaEnSede(cita.inicio, cita.zonaHoraria)}</time><small>{cita.zonaHoraria}</small></dd></div>
      </dl><p>Presenta este QR en recepción.</p><CancelacionCita cita={cita} /></div><QrCita token={cita.tokenQr} />
    </section>)}
  </>;
}
