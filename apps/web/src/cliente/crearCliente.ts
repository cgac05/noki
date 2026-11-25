import type { ClienteApi } from './ClienteApi.ts';
import { ErrorCliente } from './errores.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { ClienteReal } from './real/ClienteReal.ts';

export function crearCliente(opciones: { modo?: string; url?: string } = {}): ClienteApi {
  const modo = opciones.modo ?? import.meta.env.VITE_API ?? 'mock';
  const url = opciones.url ?? import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  const demo = import.meta.env.VITE_DEMO === 'true';
  if (modo === 'mock') return new ClienteMock({ sesionWebDemo: demo });
  if (modo === 'real') return new ClienteReal({ url, demo });
  throw new ErrorCliente('CONFIGURACION', 'VITE_API debe ser mock o real. Corrige la configuración y vuelve a iniciar.');
}
