import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { rutas } from './rutas.tsx';
import { crearCliente } from './cliente/crearCliente.ts';
import { ErrorCliente } from './cliente/errores.ts';
import { ProveedorCliente } from './cliente/ProveedorCliente.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación.');
const aplicacion = createRoot(root);
try {
  const cliente = crearCliente();
  const router = createBrowserRouter(rutas);
  aplicacion.render(<StrictMode><ProveedorCliente cliente={cliente}><RouterProvider router={router} /></ProveedorCliente></StrictMode>);
} catch (error) {
  const mensaje = error instanceof ErrorCliente ? error.mensaje : 'No pudimos iniciar la aplicación. Revisa la configuración.';
  aplicacion.render(<main className="contenido" role="alert"><h1>No pudimos iniciar</h1><p className="introduccion">{mensaje}</p></main>);
}
