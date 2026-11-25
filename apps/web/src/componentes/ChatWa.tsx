import { useEffect, useRef, useState } from 'react';
import type { MensajeBot as Mensaje } from '@noki/contracts';
import type { EntradaHistorial } from '../cliente/historialWa.ts';
import { MensajeBot } from './MensajeBot.tsx';
import { HojaOpciones } from './HojaOpciones.tsx';
import { ModalFlow } from './ModalFlow.tsx';

export function ChatWa({ entradas, enviando, onElegir, onReintentar, onFlow, onDescartarFlow }: { entradas: EntradaHistorial[]; enviando: boolean; onElegir: (payload: string, titulo: string) => void; onReintentar: (id: string) => void; onFlow: (valores: Record<string, string>, resumen: string) => Promise<boolean>; onDescartarFlow: () => void }) {
  const [lista, setLista] = useState<Extract<Mensaje, { tipo: 'lista' }> | null>(null);
  const [flow, setFlow] = useState<Extract<Mensaje, { tipo: 'flow' }> | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView?.({ block: 'nearest' }); }, [entradas]);
  let ultimoUsuario = entradas.length - 1;
  while (ultimoUsuario >= 0) {
    const entrada = entradas[ultimoUsuario];
    if (entrada?.origen === 'usuario' && entrada.estado !== 'error') break;
    ultimoUsuario--;
  }
  return <>
    <section className="wa-historial" role="log" aria-label="Conversación de WhatsApp" aria-live="polite" aria-relevant="additions text">
      {entradas.length === 0 && <div className="wa-vacio"><h2>Tu conversación empieza aquí</h2><p>Abre el enlace del Call Center para retomar tu atención, o envía un mensaje.</p></div>}
      {entradas.map((entrada, indice) => {
        const mensaje = entrada.mensaje;
        const deshabilitado = enviando || entrada.origen !== 'bot' || indice <= ultimoUsuario;
        return <div className={`wa-burbuja wa-${entrada.origen}`} key={entrada.id}>
          {mensaje?.tipo === 'lista' ? <><p>{mensaje.texto}</p><button type="button" className="boton-secundario" disabled={deshabilitado} onClick={() => setLista(mensaje)}>Ver opciones</button></>
            : mensaje ? <MensajeBot mensaje={mensaje} deshabilitado={deshabilitado} onAbrirFlow={() => { if (mensaje.tipo === 'flow') setFlow(mensaje); }} onElegir={payload => { const titulo = mensaje.tipo === 'botones' ? mensaje.botones.find(opcion => opcion.payload === payload)?.titulo : undefined; onElegir(payload, titulo ?? 'Opción elegida'); }} /> : <p>{entrada.texto}</p>}
          {entrada.estado === 'error' && <div className="wa-error" role="alert"><p>{entrada.error}</p>{entrada.tipo !== 'flow-resumen' && <button type="button" disabled={enviando} onClick={() => onReintentar(entrada.id)}>Reintentar</button>}</div>}
        </div>;
      })}
      {enviando && <p className="wa-escribiendo" role="status">escribiendo…</p>}
      <div ref={fin} />
    </section>
    {lista && <HojaOpciones mensaje={lista} deshabilitado={enviando} onElegir={onElegir} onCerrar={() => setLista(null)} />}
    {flow && <ModalFlow mensaje={flow} onEnviar={onFlow} onDescartar={onDescartarFlow} onCerrar={() => { onDescartarFlow(); setFlow(null); }} />}
  </>;
}
