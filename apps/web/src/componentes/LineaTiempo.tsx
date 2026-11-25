import type { EventoVista } from '@noki/contracts';
import { fechaEnSede } from './formato.ts';

export const NOMBRES_CANAL: Record<EventoVista['canal'], string> = { web: 'Web', whatsapp: 'WhatsApp', app: 'App', callcenter: 'Call Center', clinica: 'Clínica' };

export function LineaTiempo({ eventos }: { eventos: EventoVista[] }) {
  return (
    <section className="seccion" aria-labelledby="titulo-linea-tiempo">
      <h2 id="titulo-linea-tiempo">Línea de tiempo</h2>
      {eventos.length === 0 ? <p className="estado-vacio">Aún no hay eventos en este hilo.</p> : (
        <ol className="linea-tiempo" aria-label="Eventos del hilo">
          {eventos.map(evento => <li key={evento.id}>
            <strong>{evento.tipo}</strong><span>{NOMBRES_CANAL[evento.canal]}</span>
            <time dateTime={evento.ts}>{fechaEnSede(evento.ts, 'UTC')} UTC</time>
          </li>)}
        </ol>
      )}
    </section>
  );
}
