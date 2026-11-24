import type { MensajeBot as Mensaje, SiguientePregunta } from '@noki/contracts';

type Interaccion = { onElegir: (payload: string) => void; deshabilitado?: boolean };

export function MensajeBot({ mensaje, onElegir, deshabilitado = false, mostrarBotones = true }: { mensaje: Mensaje; mostrarBotones?: boolean } & Interaccion) {
  if (mensaje.tipo === 'flow') return <article className="mensaje-bot"><h3>{mensaje.titulo}</h3><p role="note">Esta captura llegará con el simulador de WhatsApp. No escribas datos sensibles en el chat.</p></article>;
  return <article className="mensaje-bot">
    <p>{mensaje.texto}</p>
    {mensaje.tipo === 'botones' && mostrarBotones && <div className="acciones">{mensaje.botones.map(opcion => (
      <button key={opcion.id} type="button" disabled={deshabilitado} onClick={() => onElegir(opcion.payload)}>{opcion.titulo}</button>
    ))}</div>}
    {mensaje.tipo === 'lista' && mensaje.secciones.map((seccion, indice) => <section className="seccion-lista" key={indice}>
      {seccion.titulo && <h3>{seccion.titulo}</h3>}
      <ul>{seccion.filas.map(fila => <li key={fila.id}><button type="button" disabled={deshabilitado} onClick={() => onElegir(fila.payload)}>{fila.titulo}</button></li>)}</ul>
    </section>)}
  </article>;
}

export function EntradaPregunta({ pregunta, onElegir, deshabilitado = false }: { pregunta: SiguientePregunta } & Interaccion) {
  if (pregunta.tipo === 'COMPLETO') return null;
  if (pregunta.pista.entrada === 'FLOW') return <p role="note">Esta captura llegará con el simulador de WhatsApp. No escribas datos sensibles en el chat.</p>;
  if (pregunta.pista.entrada !== 'BOTONES' && pregunta.pista.entrada !== 'LISTA') return null;
  return <div className="acciones" aria-label="Opciones de la siguiente pregunta">{pregunta.pista.opciones?.map(opcion => (
    <button key={opcion.id} type="button" disabled={deshabilitado} onClick={() => onElegir(opcion.payload)}>{opcion.titulo}</button>
  ))}</div>;
}
