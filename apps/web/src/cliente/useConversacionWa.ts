import { useSyncExternalStore } from 'react';
import type { SolicitudMensajeWa } from '@noki/contracts';
import type { ResumenWa } from './historialWa.ts';
import { useHistorialWa } from './ProveedorCliente.tsx';

export function useConversacionWa(waId: string) {
  const historial = useHistorialWa();
  const vista = useSyncExternalStore(recibir => historial.suscribir(waId, recibir), () => historial.leer(waId));
  return { ...vista,
    enviar: (solicitud: SolicitudMensajeWa, resumen: ResumenWa) => historial.enviar(solicitud, resumen),
    continuar: (codigo: string) => historial.continuar(waId, codigo),
    reintentar: (id: string) => historial.reintentar(waId, id),
    borrar: () => historial.borrar(waId),
    descartarPendiente: (id: string) => historial.descartarPendiente(waId, id),
    enviarFlow: (valores: Record<string, string>, resumen: string) => historial.enviarFlow(waId, valores, resumen),
    descartarFlow: () => historial.descartarFlow(waId),
  };
}
