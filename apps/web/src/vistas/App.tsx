import { Link } from 'react-router';
import { useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { QrCita } from '../componentes/QrCita.tsx';
import { fechaEnSede } from '../componentes/formato.ts';

export function App() {
  const { pacienteId } = useContextoConsulta();
  const citas = useConsulta('citasPaciente', pacienteId ? { pacienteId } : undefined);
  return <>
    <h1>App</h1><p className="introduccion">Tus citas y el QR para continuar en clínica.</p>
    {citas.isPending && <EstadoCarga />}
    {citas.isError && <EstadoError error={citas.error} onReintentar={() => { void citas.refetch(); }} />}
    {citas.data?.length === 0 && <div className="seccion"><p>Aún no hay citas para mostrar.</p><Link className="enlace-principal" to="/callcenter">Iniciar atención en Call Center</Link></div>}
    {citas.data?.map(cita => <section className="seccion cita" key={cita.tramite.id} aria-label="Cita del paciente">
      <div><h2>{cita.servicio}</h2><dl className="datos">
        <div><dt>Estado</dt><dd>{cita.tramite.estado}</dd></div><div><dt>Sede</dt><dd>{cita.sede}</dd></div>
        <div><dt>Fecha y hora en la sede</dt><dd><time dateTime={cita.inicio}>{fechaEnSede(cita.inicio, cita.zonaHoraria)}</time><small>{cita.zonaHoraria}</small></dd></div>
      </dl><p>Presenta este QR en recepción.</p></div><QrCita token={cita.tokenQr} />
    </section>)}
  </>;
}
