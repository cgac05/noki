import type { z } from 'zod';

type TipoError = 'CONTRATO' | 'RED' | 'API' | 'CONFIGURACION' | 'NO_DISPONIBLE';

export class ErrorCliente extends Error {
  readonly codigo: string | undefined;

  constructor(readonly tipo: TipoError, readonly mensaje: string, codigo?: string) {
    super(mensaje);
    this.name = 'ErrorCliente';
    this.codigo = codigo;
  }
}

export function validar<S extends z.ZodType>(esquema: S, dato: unknown): z.output<S> {
  const resultado = esquema.safeParse(dato);
  if (!resultado.success) {
    throw new ErrorCliente('CONTRATO', 'La información recibida no tiene el formato esperado. Intenta de nuevo.');
  }
  return resultado.data as z.output<S>;
}
