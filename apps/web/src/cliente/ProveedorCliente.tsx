import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { EVENTOS_SOCKET } from '@noki/contracts';
import type { ClienteApi } from './ClienteApi.ts';
import type { ConsultasProvisionales, ParametrosConsulta } from './provisional.ts';

const ContextoCliente = createContext<ClienteApi | null>(null);

export function ProveedorCliente({ cliente, children }: { cliente: ClienteApi; children: ReactNode }) {
  const [consultas] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  useEffect(() => {
    const actualizar = () => { void consultas.invalidateQueries(); };
    const dejar = cliente.demo ? [cliente.demo.alCambiar(actualizar)]
      : Object.values(EVENTOS_SOCKET).map(nombre => cliente.suscribir(nombre, actualizar));
    return () => { dejar.forEach(cancelar => cancelar()); consultas.clear(); };
  }, [cliente, consultas]);

  return <ContextoCliente.Provider value={cliente}><QueryClientProvider client={consultas}>{children}</QueryClientProvider></ContextoCliente.Provider>;
}

export function useCliente(): ClienteApi {
  const cliente = useContext(ContextoCliente);
  if (!cliente) throw new Error('La vista debe estar dentro de ProveedorCliente.');
  return cliente;
}

export function useConsulta<K extends keyof ConsultasProvisionales>(nombre: K, parametros: ParametrosConsulta[K]) {
  const cliente = useCliente();
  return useQuery({ queryKey: ['consulta', nombre, parametros], queryFn: () => cliente.consultar(nombre, parametros) });
}
