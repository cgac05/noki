import { useEffect } from 'react';
import { useCliente } from './ProveedorCliente.tsx';

export function useSala(sala: string | undefined) {
  const cliente = useCliente();
  useEffect(() => sala === undefined ? undefined : cliente.unirse(sala), [cliente, sala]);
}
