import { useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { LlegadaClinica } from '../componentes/LlegadaClinica.tsx';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
import { useSala } from '../cliente/useSala.ts';

export function Clinica() {
  const contexto = useContextoConsulta();
  const { sedeId } = contexto;
  useSala(sedeId ? `sede:${sedeId}` : undefined);
  const llegadas = useConsulta('llegadasSede', sedeId ? { sedeId } : undefined);
  return <>
    <h1>Clínica</h1><p className="introduccion">Recepción · Llegadas esperadas</p>
    {!sedeId && <EstadoContexto contexto={contexto} texto="Aún no hay llegadas que mostrar: falta la sede de atención. Confirma una cita y vuelve a actualizar." />}
    {sedeId && llegadas.isPending && <EstadoCarga />}
    {llegadas.isError && <EstadoError error={llegadas.error} onReintentar={() => { void llegadas.refetch(); }} />}
    {llegadas.data?.length === 0 && <p className="seccion">Aún no hay llegadas esperadas. Confirma una cita en WhatsApp.</p>}
    {sedeId && llegadas.data?.map(llegada => <LlegadaClinica key={llegada.cita.tramite.id} llegada={llegada} sedeContextoId={sedeId} />)}
  </>;
}
