import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ComandoRequest, RespuestaComando } from '@noki/contracts';
import { useRef } from 'react';
import { useCliente, useRespuestaComando } from './ProveedorCliente.tsx';

// Operación de UI creada al pulsar un botón; nunca forma parte de una lectura.
type PasoComando = ComandoRequest | ((previa: RespuestaComando | undefined) => ComandoRequest);
type Progreso = { siguiente: number; respuesta?: RespuestaComando };
type Accion =
  | { tipo: 'comando'; titulo: string; comando: ComandoRequest }
  | { tipo: 'comandos'; titulo: string; comandos: PasoComando[] };

export function useAccion() {
  const cliente = useCliente();
  const consultas = useQueryClient();
  const { recordar } = useRespuestaComando();
  const enCurso = useRef(false);
  const operacion = useMutation({
    mutationFn: async ({ accion, claves, progreso }: { accion: Accion; claves: string[]; progreso: Progreso }) => {
      const comandos = accion.tipo === 'comando' ? [accion.comando] : accion.comandos;
      for (const [indice, paso] of comandos.entries()) {
        if (indice < progreso.siguiente) continue;
        const comando = typeof paso === 'function' ? paso(progreso.respuesta) : paso;
        const respuesta = await cliente.enviarComando(comando, { idempotencyKey: claves[indice]! });
        progreso.respuesta = respuesta;
        progreso.siguiente = indice + 1;
        recordar(respuesta);
      }
      return progreso.respuesta;
    },
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['consulta'] }),
    onSettled: () => { enCurso.current = false; },
  });
  return {
    ...operacion,
    ejecutar: (accion: Accion) => {
      if (enCurso.current) return false;
      enCurso.current = true;
      operacion.mutate({ accion, claves: Array.from({ length: accion.tipo === 'comandos' ? accion.comandos.length : 1 }, () => crypto.randomUUID()), progreso: { siguiente: 0 } });
      return true;
    },
    reintentar: () => {
      if (!enCurso.current && operacion.variables) { enCurso.current = true; operacion.mutate(operacion.variables); }
    },
  };
}
