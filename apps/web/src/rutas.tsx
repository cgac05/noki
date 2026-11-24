import type { RouteObject } from 'react-router';
import { Layout } from './componentes/Layout.tsx';
import { Admin } from './vistas/Admin.tsx';
import { App } from './vistas/App.tsx';
import { Bandeja } from './vistas/Bandeja.tsx';
import { CallCenter } from './vistas/CallCenter.tsx';
import { Clinica } from './vistas/Clinica.tsx';
import { NoEncontrado } from './vistas/NoEncontrado.tsx';
import { Portada } from './vistas/Portada.tsx';
import { Wa } from './vistas/Wa.tsx';
import { Web } from './vistas/Web.tsx';

export const rutas: RouteObject[] = [{
  element: <Layout />,
  children: [
    { index: true, element: <Portada /> },
    { path: 'web', element: <Web /> },
    { path: 'wa', element: <Wa /> },
    { path: 'app', element: <App /> },
    { path: 'callcenter', element: <CallCenter /> },
    { path: 'clinica', element: <Clinica /> },
    { path: 'admin', element: <Admin /> },
    { path: 'bandeja', element: <Bandeja /> },
    { path: '*', element: <NoEncontrado /> },
  ],
}];
