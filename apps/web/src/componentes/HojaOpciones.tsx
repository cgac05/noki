import { useEffect, useId, useRef } from 'react';
import type { MensajeBot } from '@noki/contracts';

type Lista = Extract<MensajeBot, { tipo: 'lista' }>;
export function HojaOpciones({ mensaje, deshabilitado, onElegir, onCerrar }: { mensaje: Lista; deshabilitado: boolean; onElegir: (payload: string, titulo: string) => void; onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null); const tituloId = useId();
  useEffect(() => { dialogo.current?.showModal(); }, []);
  return <dialog className="dialogo-wa hoja-opciones" ref={dialogo} aria-labelledby={tituloId} onCancel={evento => { evento.preventDefault(); onCerrar(); }} onClose={onCerrar}>
    <header><h2 id={tituloId}>{mensaje.texto}</h2><button type="button" className="boton-secundario" onClick={onCerrar}>Cerrar</button></header>
    {mensaje.secciones.map((seccion, indice) => <section key={indice} className="seccion-lista">
      {seccion.titulo && <h3>{seccion.titulo}</h3>}
      <ul>{seccion.filas.map(fila => <li key={fila.id}><button type="button" disabled={deshabilitado} onClick={() => { onCerrar(); onElegir(fila.payload, fila.titulo); }}>{fila.titulo}</button></li>)}</ul>
    </section>)}
  </dialog>;
}
