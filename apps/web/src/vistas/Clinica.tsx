import { ComandoRequestSchema } from '@noki/contracts';
import { useConsulta, useContextoConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { fechaEnSede } from '../componentes/formato.ts';
import { EstadoContexto } from '../componentes/EstadoContexto.tsx';
import { useSala } from '../cliente/useSala.ts';

export function Clinica() {
  const contexto = useContextoConsulta();
  const { sedeId } = contexto;
  useSala(sedeId ? `sede:${sedeId}` : undefined);
  const llegadas = useConsulta('llegadasSede', sedeId ? { sedeId } : undefined);
  const accion = useAccion();
  return <>
    <h1>Clínica</h1><p className="introduccion">Recepción · Llegadas esperadas</p>
    {!sedeId && <EstadoContexto contexto={contexto} texto="Aún no hay llegadas que mostrar: falta la sede de atención. Confirma una cita y vuelve a actualizar." />}
    {sedeId && llegadas.isPending && <EstadoCarga />}
    {llegadas.isError && <EstadoError error={llegadas.error} onReintentar={() => { void llegadas.refetch(); }} />}
    {llegadas.data?.length === 0 && <p className="seccion">Aún no hay llegadas esperadas. Confirma una cita en WhatsApp.</p>}
    {llegadas.data?.map(llegada => <section className="seccion" key={llegada.cita.tramite.id}>
      <h2>{llegada.cita.servicio}</h2><p>{llegada.cita.sede} · {fechaEnSede(llegada.cita.inicio, llegada.cita.zonaHoraria)}</p>
      <p>Estado: <strong>{llegada.cita.tramite.estado}</strong></p>
      {llegada.registrada && <p className="aviso">Llegada registrada</p>}
      {!llegada.registrada && <button type="button" disabled={accion.isPending} onClick={() => accion.ejecutar({ tipo: 'comando', titulo: 'Registrar llegada', comando: ComandoRequestSchema.parse({ canal: 'clinica', actor: 'recepcion:tepic', tipo: 'RegistrarLlegada', tramiteId: llegada.cita.tramite.id, payload: { token: llegada.cita.tokenQr } }) })}>Registrar llegada</button>}
    </section>)}
    {accion.isPending && <EstadoCarga texto="Registrando llegada…" />}
    {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
  </>;
}
