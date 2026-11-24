import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { EVENTOS_SOCKET } from '@noki/contracts';
import type { RespuestaComando } from '@noki/contracts';
import type { ClienteApi } from './ClienteApi.ts';
import type { NombreConsultaCliente, ParametrosConsultaCliente } from './consultas.ts';
import { ErrorCliente } from './errores.ts';
import { HistorialWa } from './historialWa.ts';

const ContextoCliente = createContext<ClienteApi | null>(null);
const ContextoHistorial = createContext<HistorialWa | null>(null);
const ContextoRespuesta = createContext<{ respuesta: RespuestaComando | undefined; recordar: (respuesta: RespuestaComando) => void } | null>(null);

export function ProveedorCliente({ cliente, children }: { cliente: ClienteApi; children: ReactNode }) {
  const [consultas] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  const [respuesta, recordar] = useState<RespuestaComando>();
  const [historial] = useState(() => new HistorialWa(cliente));
  useEffect(() => {
    let revisionGuion = cliente.demo?.revision();
    const actualizar = () => {
      if (cliente.demo?.paso().id === 'INICIO' && cliente.demo.revision() !== revisionGuion) { recordar(undefined); historial.reiniciar(); }
      revisionGuion = cliente.demo?.revision();
      void consultas.invalidateQueries();
    };
    const dejar = cliente.demo ? [cliente.demo.alCambiar(actualizar)]
      : Object.values(EVENTOS_SOCKET).map(nombre => cliente.suscribir(nombre, actualizar));
    return () => { dejar.forEach(cancelar => cancelar()); consultas.clear(); };
  }, [cliente, consultas, historial]);

  return <ContextoCliente.Provider value={cliente}><ContextoHistorial.Provider value={historial}><ContextoRespuesta.Provider value={{ respuesta, recordar }}><QueryClientProvider client={consultas}>{children}</QueryClientProvider></ContextoRespuesta.Provider></ContextoHistorial.Provider></ContextoCliente.Provider>;
}

export function useHistorialWa() {
  const historial = useContext(ContextoHistorial);
  if (!historial) throw new Error('La vista debe estar dentro de ProveedorCliente.');
  return historial;
}

export function useCliente(): ClienteApi {
  const cliente = useContext(ContextoCliente);
  if (!cliente) throw new Error('La vista debe estar dentro de ProveedorCliente.');
  return cliente;
}

export function useRespuestaComando() {
  const contexto = useContext(ContextoRespuesta);
  if (!contexto) throw new Error('La vista debe estar dentro de ProveedorCliente.');
  return contexto;
}

export function useContextoConsulta() {
  const cliente = useCliente();
  const { respuesta } = useRespuestaComando();
  return {
    hiloId: cliente.demo?.ids.hiloId ?? respuesta?.tramite.hiloId,
    pacienteId: cliente.demo?.ids.pacienteId,
    sedeId: cliente.demo?.ids.sedeId ?? respuesta?.tramite.sedeId,
  };
}

export function useConsulta<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N> | undefined) {
  const cliente = useCliente();
  return useQuery({ queryKey: ['consulta', nombre, parametros], queryFn: () => {
    if (parametros === undefined) throw new ErrorCliente('NO_DISPONIBLE', 'Todavía no hay contexto para esta consulta. Inicia la atención o usa la demo.');
    return cliente.consultar(nombre, parametros);
  } });
}
