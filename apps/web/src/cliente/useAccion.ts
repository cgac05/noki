import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AccionVista } from './provisional.ts';
import { useCliente } from './ProveedorCliente.tsx';

export function useAccion() {
  const cliente = useCliente();
  const consultas = useQueryClient();
  const operacion = useMutation({
    mutationFn: async ({ accion, clave }: { accion: AccionVista; clave: string }) => {
      if (accion.tipo === 'comando') return await cliente.enviarComando(accion.comando, { idempotencyKey: clave });
      return await cliente.enviarMensajeWa(accion.mensaje);
    },
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['consulta'] }),
  });
  return {
    ...operacion,
    ejecutar: (accion: AccionVista) => operacion.mutate({ accion, clave: crypto.randomUUID() }),
    reintentar: () => { if (operacion.variables) operacion.mutate(operacion.variables); },
  };
}
