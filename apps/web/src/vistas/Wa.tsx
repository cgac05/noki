import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { useConversacionWa } from '../cliente/useConversacionWa.ts';
import { ChatWa } from '../componentes/ChatWa.tsx';

export function Wa() {
  const [numero, setNumero] = useState(CONTACTO_DEMO);
  const [texto, setTexto] = useState('');
  const conversacion = useConversacionWa(numero);
  const [parametros] = useSearchParams(); const navegar = useNavigate();
  const codigo = parametros.get('continuar');
  const numeroValido = /^\d{10,15}$/.test(numero);
  useEffect(() => {
    if (codigo === null) return;
    if (codigo.trim() && numeroValido) void conversacion.continuar(codigo);
    void navegar('/wa', { replace: true });
  }, [codigo, numeroValido, conversacion.continuar, navegar]);
  const enviar = () => {
    if (!numeroValido || !texto.trim() || conversacion.enviando) return;
    void conversacion.enviar({ waId: numero, texto: texto.trim() }, { tipo: 'texto', texto: texto.trim() });
    setTexto('');
  };
  return <div className="wa-simulador">
    <h1>WhatsApp</h1><p className="introduccion">Tu atención continúa donde la dejaste.</p>
    <div className="wa-herramientas">
      <div><label htmlFor="numero-wa">Número de WhatsApp</label><input id="numero-wa" type="tel" inputMode="numeric" autoComplete="off" value={numero} disabled={conversacion.enviando} aria-invalid={!numeroValido} aria-describedby={!numeroValido ? 'error-numero-wa' : undefined} onChange={evento => setNumero(evento.target.value)} /></div>
      <button type="button" className="boton-secundario" onClick={() => { conversacion.borrar(); setTexto(''); }}>Nueva conversación</button>
    </div>
    {!numeroValido && <p id="error-numero-wa" className="wa-error" role="alert">Escribe un número de 10 a 15 dígitos, sin espacios ni signos.</p>}
    <ChatWa entradas={conversacion.entradas} enviando={conversacion.enviando} onElegir={(payload, titulo) => { if (numeroValido) void conversacion.enviar({ waId: numero, payloadBoton: payload }, { tipo: 'opcion', texto: titulo }); }} onReintentar={id => { void conversacion.reintentar(id); }} onFlow={conversacion.enviarFlow} onDescartarFlow={conversacion.descartarFlow} />
    <form className="enviar-mensaje wa-compositor" onSubmit={evento => { evento.preventDefault(); enviar(); }}>
      <label htmlFor="mensaje-wa">Mensaje</label><div><input id="mensaje-wa" value={texto} disabled={conversacion.enviando || !numeroValido} onChange={evento => setTexto(evento.target.value)} autoComplete="off" placeholder="Escribe un mensaje" /><button type="submit" disabled={conversacion.enviando || !numeroValido || !texto.trim()}>Enviar</button></div>
    </form>
  </div>;
}
