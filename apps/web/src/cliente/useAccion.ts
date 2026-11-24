import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ComandoRequest, RespuestaComando } from '@noki/contracts';
import { useRef } from 'react';
import { useCliente, useRespuestaComando } from './ProveedorCliente.tsx';

// Operación de UI creada al pulsar un botón; nunca forma parte de una lectura.
type Accion =
  | { tipo: 'comando'; titulo: string; comando: ComandoRequest }
  | { tipo: 'comandos'; titulo: string; comandos: ComandoRequest[] };

export function useAccion() {
  const cliente = useCliente();
  const consultas = useQueryClient();
  const { recordar } = useRespuestaComando();
  const enCurso = useRef(false);
  const operacion = useMutation({
    mutationFn: async ({ accion, claves, progreso }: { accion: Accion; claves: string[]; progreso: { siguiente: number } }) => {
      const comandos = accion.tipo === 'comando' ? [accion.comando] : accion.comandos;
      let respuesta: RespuestaComando | undefined;
      for (const [indice, comando] of comandos.entries()) {
        if (indice < progreso.siguiente) continue;
        respuesta = await cliente.enviarComando(comando, { idempotencyKey: claves[indice]! });
        progreso.siguiente = indice + 1;
        recordar(respuesta);
      }
      return respuesta;
    },
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['consulta'] }),
    onSettled: () => { enCurso.current = false; },
  });
  return {
    ...operacion,
    ejecutar: (accion: Accion) => {
      if (enCurso.current) return;
      enCurso.current = true;
      operacion.mutate({ accion, claves: Array.from({ length: accion.tipo === 'comandos' ? accion.comandos.length : 1 }, () => crypto.randomUUID()), progreso: { siguiente: 0 } });
    },
    reintentar: () => {
      if (!enCurso.current && operacion.variables) { enCurso.current = true; operacion.mutate(operacion.variables); }
    },
  };
}
