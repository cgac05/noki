import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { RegistroComandos, Reloj } from '@noki/application';

export interface RespuestaHttp {
  codigo: number;
  cuerpo: unknown;
}

export interface DependenciasIdempotencia {
  registro: RegistroComandos;
  reloj: Reloj;
  tieneEventos(clave: string): Promise<boolean>;
}

const claveSchema = z.uuid();

function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([clave, dato]) => [clave, canonico(dato)]));
  }
  return valor;
}

export async function ejecutarIdempotente(deps: DependenciasIdempotencia, cabecera: unknown, ruta: string,
  cuerpo: unknown, ejecutar: (clave: string) => Promise<RespuestaHttp>,
  mapearError: (error: unknown) => RespuestaHttp,
  guardarError?: (error: unknown) => boolean): Promise<RespuestaHttp> {
  const clave = claveSchema.parse(cabecera);
  const huella = createHash('sha256').update(JSON.stringify([ruta, canonico(cuerpo)])).digest('hex');
  const reserva = await deps.registro.reservar(clave, huella, deps.reloj.ahora().toISOString());
  if (reserva.estado === 'COMPLETADA') return { codigo: reserva.codigo, cuerpo: reserva.respuesta };
  if (reserva.estado === 'HUELLA_DISTINTA') {
    return { codigo: 400, cuerpo: { error: { codigo: 'VALIDACION', mensaje: 'La clave corresponde a otra solicitud.' } } };
  }
  if (reserva.estado === 'EN_CURSO') {
    return { codigo: 409, cuerpo: { error: { codigo: 'CONFLICTO_VERSION', mensaje: 'Solicitud en curso.' } } };
  }
  let respuesta: RespuestaHttp;
  let persistirError = false;
  try {
    respuesta = await ejecutar(clave);
  } catch (error) {
    respuesta = mapearError(error);
    persistirError = guardarError?.(error) ?? false;
  }
  if (persistirError || (respuesta.codigo >= 200 && respuesta.codigo < 300) || await deps.tieneEventos(clave)) {
    await deps.registro.completar(clave, respuesta.codigo, respuesta.cuerpo);
  } else {
    await deps.registro.soltar(clave);
  }
  return respuesta;
}
