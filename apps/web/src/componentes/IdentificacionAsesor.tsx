import { useState } from 'react';
import { armarIdentificacion } from '../cliente/identificacion.ts';
import type { PistaIdentificacion } from '../cliente/identificacion.ts';
import { useIdentificacion } from '../cliente/useIdentificacion.ts';
import { ErrorCliente } from '../cliente/errores.ts';
import { EstadoError } from './EstadoError.tsx';
import { ModalFlow } from './ModalFlow.tsx';

export function IdentificacionAsesor({ tramiteId, pista }: { tramiteId: string; pista: PistaIdentificacion }) {
  const [modal, setModal] = useState(false);
  const [errorContrato, setErrorContrato] = useState<ErrorCliente>();
  const accion = useIdentificacion();
  const enviar = async (respuesta: Parameters<typeof armarIdentificacion>[2]) => {
    try {
      setErrorContrato(undefined);
      const resultado = armarIdentificacion(tramiteId, pista, respuesta);
      return resultado.valido ? await accion.enviar(resultado.comando) : false;
    } catch (error) {
      setErrorContrato(error instanceof ErrorCliente ? error : new ErrorCliente('CONTRATO', 'No pudimos interpretar la pregunta de identificación.'));
      return false;
    }
  };
  const error = errorContrato ?? accion.error;
  return <section aria-label="Identificar paciente (opcional)" className="seccion">
    <h3>Identificar paciente (opcional)</h3>
    <p>Paso: {pista.paso}</p>
    <div className="acciones">
      {pista.opciones?.map(opcion => <button type="button" key={opcion.id} disabled={accion.enviando} onClick={() => { void enviar({ opcion: opcion.payload }); }}>{opcion.titulo}</button>)}
      {Boolean(pista.campos?.length) && <button type="button" disabled={accion.enviando} onClick={() => setModal(true)}>Capturar datos</button>}
      <button type="button" className="boton-secundario" disabled={accion.enviando} onClick={() => { accion.descartar(); void enviar({ reiniciar: true }); }}>Reiniciar identificación</button>
    </div>
    {accion.enviando && <p role="status">Enviando identificación…</p>}
    {error && <>{error.codigo && <p>{error.codigo}</p>}<EstadoError error={error} {...(!modal && accion.error ? { onReintentar: () => { void accion.reintentar(); } } : {})} /></>}
    {modal && pista.campos && <ModalFlow capturaAsesor mensaje={{ tipo: 'flow', titulo: 'Identificar paciente', campos: pista.campos }} validar={valores => {
      const resultado = armarIdentificacion(tramiteId, pista, { valores });
      return resultado.valido ? [] : resultado.campos;
    }} onEnviar={valores => enviar({ valores })} onCerrar={() => setModal(false)} onDescartar={accion.descartar} />}
  </section>;
}
