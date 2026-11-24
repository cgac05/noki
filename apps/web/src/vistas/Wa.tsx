import { useState } from 'react';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { useConsulta } from '../cliente/ProveedorCliente.tsx';
import { useAccion } from '../cliente/useAccion.ts';
import { EstadoCarga } from '../componentes/EstadoCarga.tsx';
import { EstadoError } from '../componentes/EstadoError.tsx';
import { EntradaPregunta, MensajeBot } from '../componentes/MensajeBot.tsx';

export function Wa() {
  const conversacion = useConsulta('conversacion', {});
  const accion = useAccion();
  const [texto, setTexto] = useState('');
  const enviarPayload = (payload: string) => accion.ejecutar({ tipo: 'wa', titulo: 'Elegir opción', mensaje: { waId: CONTACTO_DEMO, payloadBoton: payload } });
  const datos = conversacion.data;
  const preguntaConBotones = datos?.siguientePregunta.tipo === 'PREGUNTA' && datos.siguientePregunta.pista.entrada === 'BOTONES';
  const listaEnMensajes = datos?.mensajes.some(mensaje => mensaje.tipo === 'lista');

  return <>
    <h1>WhatsApp</h1><p className="introduccion">Tu atención continúa donde la dejaste.</p>
    {conversacion.isPending && <EstadoCarga />}
    {conversacion.isError && <EstadoError error={conversacion.error} onReintentar={() => { void conversacion.refetch(); }} />}
    {datos && <div className="conversacion">
      <section aria-label="Conversación simulada">
        {datos.mensajes.map((mensaje, indice) => <MensajeBot key={indice} mensaje={mensaje} onElegir={enviarPayload} deshabilitado={accion.isPending} mostrarBotones={!preguntaConBotones} />)}
        {!listaEnMensajes && <EntradaPregunta pregunta={datos.siguientePregunta} onElegir={enviarPayload} deshabilitado={accion.isPending} />}
      </section>
      <form className="enviar-mensaje" onSubmit={evento => {
        evento.preventDefault();
        if (!texto.trim()) return;
        accion.ejecutar({ tipo: 'wa', titulo: 'Enviar mensaje', mensaje: { waId: CONTACTO_DEMO, texto: texto.trim() } });
        setTexto('');
      }}>
        <label htmlFor="mensaje-wa">Mensaje</label>
        <div><input id="mensaje-wa" value={texto} onChange={evento => setTexto(evento.target.value)} autoComplete="off" placeholder="Escribe un mensaje de demo" disabled={accion.isPending} /><button type="submit" disabled={accion.isPending || !texto.trim()}>Enviar</button></div>
      </form>
      {accion.isPending && <EstadoCarga texto="Enviando mensaje…" />}
      {accion.isError && <EstadoError error={accion.error} onReintentar={accion.reintentar} />}
    </div>}
  </>;
}
