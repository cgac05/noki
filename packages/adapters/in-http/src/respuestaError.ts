import type { CuerpoError } from '@noki/contracts';
import { ErrorDominio } from '@noki/domain';
import { ZodError } from 'zod';
import { MAPEO_ERRORES_HTTP } from './mapeoErroresHttp.ts';

export function respuestaError(error: unknown, registrar: () => void): { codigo: number; cuerpo: CuerpoError } {
  if (error instanceof ZodError) {
    return { codigo: 400, cuerpo: { error: { codigo: 'VALIDACION', mensaje: 'La solicitud no es válida.',
      datos: { campos: error.issues.map(({ path }) => path.map(String).join('.')) } } } };
  }
  if (error instanceof ErrorDominio) {
    return { codigo: MAPEO_ERRORES_HTTP[error.codigo], cuerpo: {
      error: { codigo: error.codigo, mensaje: error.message, datos: error.datos },
    } };
  }
  registrar();
  return { codigo: 500, cuerpo: { error: { codigo: 'INTERNO', mensaje: 'No se pudo completar la solicitud.' } } };
}
