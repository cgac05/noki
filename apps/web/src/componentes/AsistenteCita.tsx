import { useEffect, useId, useRef, useState } from 'react';
import { useConversacionWa } from '../cliente/useConversacionWa.ts';
import { ChatWa } from './ChatWa.tsx';

export function AsistenteCita({ telefono }: { telefono: string }) {
  const conversacion = useConversacionWa(telefono);
  const { enviar, enviando } = conversacion;
  const saludoEnviado = useRef(false);
  const mensajeId = useId();
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (saludoEnviado.current || enviando) return;
    saludoEnviado.current = true;
    void enviar({ waId: telefono, texto: 'Hola' }, { tipo: 'texto', texto: 'Hola' });
  }, [enviar, enviando, telefono]);

  return <>
    <ChatWa entradas={conversacion.entradas} enviando={enviando}
      onElegir={(payload, titulo) => {
        void enviar({ waId: telefono, payloadBoton: payload }, { tipo: 'opcion', texto: titulo });
      }}
      onReintentar={id => { void conversacion.reintentar(id); }}
      onFlow={conversacion.enviarFlow}
      onDescartarFlow={conversacion.descartarFlow} />
    <form className="enviar-mensaje wa-compositor" onSubmit={evento => {
      evento.preventDefault();
      const mensaje = texto.trim();
      if (enviando || !mensaje) return;
      void enviar({ waId: telefono, texto: mensaje }, { tipo: 'texto', texto: mensaje });
      setTexto('');
    }}>
      <label htmlFor={mensajeId}>Mensaje</label>
      <div>
        <input id={mensajeId} value={texto} onChange={evento => setTexto(evento.target.value)}
          disabled={enviando} autoComplete="off" placeholder="Escribe un mensaje" />
        <button type="submit" disabled={enviando || !texto.trim()}>Enviar</button>
      </div>
    </form>
  </>;
}
