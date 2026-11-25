import { Link } from 'react-router';
import { useState } from 'react';
import type { CitaVista } from '@noki/contracts';
import { useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { QrCita } from '../componentes/QrCita.tsx';
import { fechaEnSede } from '../componentes/formato.ts';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
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
    {cancelada && <p role="status">La cita se canceló.</p>}
    {pendiente && !cancelada && <div><p role="status">La cancelación espera aprobación en WhatsApp.</p><Link className="enlace-principal" to="/wa">Abrir WhatsApp</Link></div>}
  </div>;
}

export function App() {
  const contexto = useContextoConsulta();
  const { pacienteId } = contexto;
  useSala(pacienteId ? `paciente:${pacienteId}` : undefined);
  const citas = useConsulta('citasPaciente', pacienteId ? { pacienteId } : undefined);
  return <>
    <h1>App</h1><p className="introduccion">Tus citas y el QR para continuar en clínica.</p>
    {!pacienteId && <EstadoContexto contexto={contexto} texto="Aún no hay un paciente en el contexto de atención. Confirma una cita y vuelve a actualizar para ver tus citas." />}
    {pacienteId && citas.isPending && <EstadoCarga />}
    {citas.isError && <EstadoError error={citas.error} onReintentar={() => { void citas.refetch(); }} />}
    {citas.data?.length === 0 && <div className="seccion"><p>Aún no hay citas para mostrar.</p><Link className="enlace-principal" to="/callcenter">Iniciar atención en Call Center</Link></div>}
    {citas.data?.map(cita => <section className="seccion cita" key={cita.tramite.id} aria-label="Cita del paciente">
      <div><h2>{cita.servicio}</h2><dl className="datos">
        <div><dt>Estado</dt><dd>{cita.tramite.estado}</dd></div><div><dt>Sede</dt><dd>{cita.sede}</dd></div>
        <div><dt>Fecha y hora en la sede</dt><dd><time dateTime={cita.inicio}>{fechaEnSede(cita.inicio, cita.zonaHoraria)}</time><small>{cita.zonaHoraria}</small></dd></div>
      </dl><p>Presenta este QR en recepción.</p><CancelacionCita cita={cita} /></div><QrCita token={cita.tokenQr} />
    </section>)}
  </>;
}
