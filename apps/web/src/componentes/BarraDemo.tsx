import { NavLink } from 'react-router';
import { useSyncExternalStore } from 'react';
import { useCliente } from '../cliente/ProveedorCliente.tsx';

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
  const { demo } = useCliente();
  const paso = useSyncExternalStore(demo?.alCambiar ?? sinCambios, demo?.paso ?? sinPaso);
  return (
    <nav className="barra-demo" aria-label="Canales de la demo">
      <ul>
        {canales.map(({ ruta, nombre }) => (
          <li key={ruta}><NavLink to={ruta}>{nombre}</NavLink></li>
        ))}
      </ul>
      {paso && <div className="control-demo"><p role="status">Paso {paso.numero} de {paso.total} · {paso.titulo}</p><button type="button" onClick={() => demo?.reiniciar()}>Reiniciar guion</button></div>}
    </nav>
  );
}
