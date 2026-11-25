import { NavLink } from 'react-router';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useCliente } from '../cliente/ProveedorCliente.tsx';
import { IdGuionSchema } from '../cliente/demo.ts';

const sinCambios = () => () => {};
const sinPaso = () => null;

const canales = [
  { ruta: '/web', nombre: 'Web' },
  { ruta: '/wa', nombre: 'WhatsApp' },
  { ruta: '/app', nombre: 'App' },
  { ruta: '/callcenter', nombre: 'Call Center' },
  { ruta: '/clinica', nombre: 'Clínica' },
  { ruta: '/admin', nombre: 'Admin' },
  { ruta: '/bandeja', nombre: 'Bandeja' },
];

export function BarraDemo() {
  const barra = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!barra.current || typeof ResizeObserver === 'undefined') return;
    const actualizar = () => document.documentElement.style.setProperty('--alto-barra-demo', `${barra.current!.getBoundingClientRect().height}px`);
    const observador = new ResizeObserver(actualizar); observador.observe(barra.current); actualizar();
    return () => { observador.disconnect(); document.documentElement.style.removeProperty('--alto-barra-demo'); };
  }, []);
  const { demo } = useCliente();
  const paso = useSyncExternalStore(demo?.alCambiar ?? sinCambios, demo?.paso ?? sinPaso);
  return (
    <nav className="barra-demo" aria-label="Canales de la demo" ref={barra}>
      <ul>
        {canales.map(({ ruta, nombre }) => (
          <li key={ruta}><NavLink to={ruta}>{nombre}</NavLink></li>
        ))}
      </ul>
      {paso && <div className="control-demo"><label>Guion de demo <select value={demo?.guion()} onChange={evento => demo?.elegirGuion(IdGuionSchema.parse(evento.target.value))}><option value="flujoA">Flujo A</option><option value="flujoC">Flujo C</option></select></label><p role="status">Paso {paso.numero} de {paso.total} · {paso.titulo}</p><button type="button" onClick={() => demo?.reiniciar()}>Reiniciar guion</button></div>}
    </nav>
  );
}
