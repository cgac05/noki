import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CONTACTO_DEMO } from '../cliente/ClienteApi.ts';
import { useConversacionWa } from '../cliente/useConversacionWa.ts';
import { ChatWa } from '../componentes/ChatWa.tsx';
import { useHistorialWa } from '../cliente/ProveedorCliente.tsx';

export function Wa() {
  const [numero, setNumero] = useState(CONTACTO_DEMO);
  const [texto, setTexto] = useState('');
  const conversacion = useConversacionWa(numero);
  const historial = useHistorialWa();
  const nuevos = useSyncExternalStore(historial.suscribirSesion, historial.numerosNuevos);
  useEffect(() => { historial.mostrar(numero); return () => historial.ocultar(numero); }, [historial, numero]);
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
    {nuevos.length > 0 && <div className="seccion" aria-label="Mensajes nuevos"><p role="status">Hay mensajes nuevos en otro número.</p>{nuevos.map(waId => <button key={waId} type="button" className="boton-secundario" disabled={conversacion.enviando} onClick={() => { setNumero(waId); setTexto(''); }}>Ver mensajes de {waId}</button>)}</div>}
    <ChatWa entradas={conversacion.entradas} enviando={conversacion.enviando} onElegir={(payload, titulo) => { if (numeroValido) void conversacion.enviar({ waId: numero, payloadBoton: payload }, { tipo: 'opcion', texto: titulo }); }} onReintentar={id => { void conversacion.reintentar(id); }} onFlow={conversacion.enviarFlow} onDescartarFlow={conversacion.descartarFlow} />
    <form className="enviar-mensaje wa-compositor" onSubmit={evento => { evento.preventDefault(); enviar(); }}>
      <label htmlFor="mensaje-wa">Mensaje</label><div><input id="mensaje-wa" value={texto} disabled={conversacion.enviando || !numeroValido} onChange={evento => setTexto(evento.target.value)} autoComplete="off" placeholder="Escribe un mensaje" /><button type="submit" disabled={conversacion.enviando || !numeroValido || !texto.trim()}>Enviar</button></div>
    </form>
  </div>;
}
