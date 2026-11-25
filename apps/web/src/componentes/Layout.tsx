import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { BarraDemo } from './BarraDemo.tsx';
import { useCliente } from '../cliente/ProveedorCliente.tsx';

export function Layout() {
  const { pathname } = useLocation();
  const cliente = useCliente();
  const contenido = useRef<HTMLElement>(null);

  useEffect(() => {
    contenido.current?.focus();
  }, [pathname]);

  return (
    <div className="layout min-h-dvh flex flex-col">
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>
      <header className="cabecera flex items-center justify-between gap-6">
        <Link className="marca" to="/" aria-label="Salud Digna 360 · Portada">Salud Digna 360</Link>
        <div className="contexto">HackaTec{cliente.modo === 'mock' && <span className="insignia-mock">Modo simulado</span>}</div>
      </header>
      <BarraDemo />
      <main className="contenido flex-1" id="contenido" ref={contenido} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="pie flex flex-wrap justify-between gap-3">
        <span>Base en desarrollo</span><span>Entorno de demostración · Datos ficticios</span>
      </footer>
    </div>
  );
}
