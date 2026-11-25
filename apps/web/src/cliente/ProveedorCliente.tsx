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
  const [revisionVista, reiniciarVistas] = useState(() => cliente.demo?.revision() ?? 0);
  const [historial] = useState(() => new HistorialWa(cliente, { alResponder: () => { void consultas.invalidateQueries({ queryKey: ['consulta'] }); } }));
  useEffect(() => {
    const salas = new Map<string, () => void>();
    const unirNumeros = () => {
      for (const numero of historial.numerosSesion()) if (!salas.has(numero)) salas.set(numero, cliente.unirse(`wa:${numero}`));
    };
    const dejarMensajes = cliente.suscribir('wa:mensajes', ({ waId, mensajes }) => historial.recibirMensajes(waId, mensajes));
    const dejarSesion = historial.suscribirSesion(unirNumeros);
    unirNumeros();
    return () => { dejarMensajes(); dejarSesion(); salas.forEach(dejar => dejar()); };
  }, [cliente, historial]);
  useEffect(() => {
    let revisionGuion = cliente.demo?.revision();
    const actualizar = () => {
      if (cliente.demo?.paso().numero === 1 && cliente.demo.revision() !== revisionGuion) {
        recordar(undefined); historial.reiniciar(); reiniciarVistas(cliente.demo.revision());
      }
      revisionGuion = cliente.demo?.revision();
      void consultas.invalidateQueries();
    };
    const dejar = cliente.demo ? [cliente.demo.alCambiar(actualizar)]
      : Object.values(EVENTOS_SOCKET).map(nombre => cliente.suscribir(nombre, actualizar));
    return () => { dejar.forEach(cancelar => cancelar()); consultas.clear(); };
  }, [cliente, consultas, historial]);

  return <ContextoCliente.Provider value={cliente}><ContextoHistorial.Provider value={historial}><ContextoRespuesta.Provider key={revisionVista} value={{ respuesta, recordar }}><QueryClientProvider client={consultas}>{children}</QueryClientProvider></ContextoRespuesta.Provider></ContextoHistorial.Provider></ContextoCliente.Provider>;
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
  const consultas = useQuery({
    queryKey: ['consulta', 'contextoDemo', {}], enabled: cliente.modo === 'real', staleTime: 0,
    queryFn: async () => {
      try { return await cliente.consultar('contextoDemo', {}); }
      catch (error) {
        if (error instanceof ErrorCliente && error.tipo === 'NO_DISPONIBLE') return null;
        throw error;
      }
    },
  });
  return {
    hiloId: cliente.demo?.ids.hiloId ?? respuesta?.tramite.hiloId ?? consultas.data?.hiloId ?? undefined,
    pacienteId: cliente.demo?.ids.pacienteId ?? consultas.data?.pacienteId ?? undefined,
    sedeId: cliente.demo?.ids.sedeId ?? respuesta?.tramite.sedeId ?? consultas.data?.sedeId ?? undefined,
    cargando: cliente.modo === 'real' && consultas.isPending,
    error: consultas.error,
    actualizar: () => { void consultas.refetch(); },
  };
}

export function useConsulta<N extends NombreConsultaCliente>(nombre: N, parametros: ParametrosConsultaCliente<N> | undefined) {
  const cliente = useCliente();
  return useQuery({ queryKey: ['consulta', nombre, parametros], enabled: parametros !== undefined, queryFn: () => {
    if (parametros === undefined) throw new ErrorCliente('NO_DISPONIBLE', 'Todavía no hay contexto para esta consulta. Inicia la atención o usa la demo.');
    return cliente.consultar(nombre, parametros);
  } });
}
