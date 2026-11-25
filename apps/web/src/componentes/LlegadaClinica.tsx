import { ComandoRequestSchema } from '@noki/contracts';
import type { LlegadaVista } from '@noki/contracts';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from './EstadoCarga.tsx';
import { EstadoError } from './EstadoError.tsx';
import { fechaEnSede } from './formato.ts';

export function LlegadaClinica({ llegada }: { llegada: LlegadaVista }) {
  const accion = useAccion();
  const enviar = (tipo: 'RegistrarLlegada' | 'CerrarAtencion', titulo: string) => {
    accion.ejecutar({ tipo: 'comando', titulo, comando: ComandoRequestSchema.parse({
      canal: 'clinica', actor: 'recepcion:tepic', tipo, tramiteId: llegada.cita.tramite.id,
      payload: tipo === 'RegistrarLlegada' ? { token: llegada.cita.tokenQr } : {},
    }) });
  };
  return <section className="seccion">
    <h2>{llegada.cita.servicio}</h2>
    <p>{llegada.cita.sede} · {fechaEnSede(llegada.cita.inicio, llegada.cita.zonaHoraria)}</p>
    <p>Estado: <strong>{llegada.cita.tramite.estado}</strong></p>
    {llegada.registrada ? <>
      <p className="aviso">Llegada registrada</p>
      {llegada.posicion !== undefined && <p><strong>Turno {llegada.posicion}</strong></p>}
      <div className="acciones">
        <button type="button" className="boton-secundario" disabled={accion.isPending} onClick={() => enviar('CerrarAtencion', 'Cerrar atención')}>Cerrar atención</button>
      </div>
    </> : <button type="button" disabled={accion.isPending} onClick={() => enviar('RegistrarLlegada', 'Registrar llegada')}>Registrar llegada</button>}
    {accion.isPending && <EstadoCarga texto="Enviando a recepción…" />}
    {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
  </section>;
}
