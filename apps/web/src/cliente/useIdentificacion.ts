import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ComandoRequest } from '@noki/contracts';
import { useCliente, useRespuestaComando } from './ProveedorCliente.tsx';
import { ErrorCliente } from './errores.ts';

// Solo refs privadas: los datos de identificación nunca pasan por MutationCache.
export function useIdentificacion() {
  const cliente = useCliente(); const consultas = useQueryClient();
  const { recordar } = useRespuestaComando();
  const pendiente = useRef<{ comando: ComandoRequest; clave: string } | undefined>(undefined);
  const bloqueo = useRef(false); const generacion = useRef(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorCliente>();
  const descartar = () => { pendiente.current = undefined; generacion.current++; bloqueo.current = false; setEnviando(false); setError(undefined); };
  useEffect(() => () => { pendiente.current = undefined; generacion.current++; }, []);
  const enviarPendiente = async () => {
    if (bloqueo.current || !pendiente.current) return false;
    bloqueo.current = true; setEnviando(true); setError(undefined);
    const actual = generacion.current;
    try {
      const respuesta = await cliente.enviarComando(pendiente.current.comando, { idempotencyKey: pendiente.current.clave });
      if (actual !== generacion.current) return false;
      pendiente.current = undefined; recordar(respuesta);
      void consultas.invalidateQueries({ queryKey: ['consulta'] });
      return true;
    } catch (fallo) {
      if (actual === generacion.current) setError(fallo instanceof ErrorCliente ? fallo : new ErrorCliente('RED', 'No pudimos enviar la identificación. Intenta de nuevo.'));
      return false;
    } finally {
      if (actual === generacion.current) { bloqueo.current = false; setEnviando(false); }
    }
  };
  return {
    enviando, error, descartar, reintentar: enviarPendiente,
    enviar: (comando: ComandoRequest) => {
      if (bloqueo.current) return Promise.resolve(false);
      // Los comandos ya están normalizados por el contrato: solo el mismo envío reutiliza su clave.
      if (!pendiente.current || JSON.stringify(pendiente.current.comando) !== JSON.stringify(comando)) {
        pendiente.current = { comando, clave: crypto.randomUUID() };
      }
      return enviarPendiente();
    },
  };
}
