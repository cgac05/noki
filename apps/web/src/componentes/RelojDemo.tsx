import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdelantarRelojSchema } from '@noki/contracts';
import type { ClienteApi } from '../cliente/ClienteApi.ts';
import { EstadoError } from './EstadoError.tsx';

const formatoHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const atajos = [[15, '+15 min'], [60, '+1 h'], [1_440, '+1 día'], [10_080, '+1 semana']] as const;

export function RelojDemo({ reloj }: { reloj: NonNullable<ClienteApi['relojDemo']> }) {
  const consultas = useQueryClient();
  const candado = useRef(false);
  const [enviando, establecerEnviando] = useState(false);
  const [minutos, establecerMinutos] = useState('15');
  const [rangoInvalido, establecerRangoInvalido] = useState(false);
  const [ahora, establecerAhora] = useState<string>();
  const [fallo, establecerFallo] = useState<{ error: unknown; minutos: number }>();

  async function adelantar(valor: number) {
    if (candado.current) return;
    candado.current = true;
    establecerEnviando(true); establecerFallo(undefined);
    try {
      const respuesta = await reloj.adelantar(valor);
      establecerAhora(respuesta.ahora);
      void consultas.invalidateQueries({ queryKey: ['consulta'] });
    } catch (error) {
      establecerFallo({ error, minutos: valor });
    } finally {
      candado.current = false; establecerEnviando(false);
    }
  }

  return <section className="seccion reloj-demo" aria-labelledby="titulo-reloj-demo">
    <h2 id="titulo-reloj-demo">Reloj de demo</h2>
    <p id="aviso-reloj-demo">Adelantar el reloj afecta a toda la demo y no se puede deshacer; usa <code>pnpm demo:reset</code> para volver al inicio.</p>
    <div className="acciones" role="group" aria-label="Adelantos rápidos" aria-describedby="aviso-reloj-demo">
      {atajos.map(([valor, etiqueta]) => <button type="button" className="boton-secundario" key={valor} disabled={enviando} onClick={() => { void adelantar(valor); }}>{etiqueta}</button>)}
    </div>
    <form className="reloj-demo-formulario" noValidate onSubmit={evento => {
      evento.preventDefault();
      const resultado = AdelantarRelojSchema.safeParse({ adelantarMinutos: minutos.trim() === '' ? NaN : Number(minutos) });
      establecerRangoInvalido(!resultado.success);
      if (resultado.success) void adelantar(resultado.data.adelantarMinutos);
    }}>
      <label htmlFor="minutos-reloj-demo">Minutos exactos</label>
      <p id="rango-reloj-demo">Introduce un número entero de 1 a 10 080 minutos.</p>
      <div className="acciones">
        <input id="minutos-reloj-demo" type="number" min={1} max={10_080} step={1} required value={minutos} disabled={enviando} aria-invalid={rangoInvalido} aria-describedby="rango-reloj-demo error-rango-reloj-demo" onChange={evento => { establecerMinutos(evento.target.value); establecerRangoInvalido(false); }} />
        <button type="submit" disabled={enviando}>Adelantar reloj</button>
      </div>
      <div id="error-rango-reloj-demo">{rangoInvalido && <p className="wa-error" role="alert">Usa un número entero de 1 a 10 080 minutos.</p>}</div>
    </form>
    <div role="status" aria-live="polite">
      {enviando && <p>Adelantando reloj…</p>}
      {ahora && <p>Hora del sistema: <time dateTime={ahora}>{formatoHora.format(new Date(ahora))}</time><br />UTC: <time dateTime={ahora}>{ahora}</time></p>}
    </div>
    {fallo && <EstadoError error={fallo.error} onReintentar={() => { void adelantar(fallo.minutos); }} />}
  </section>;
}
