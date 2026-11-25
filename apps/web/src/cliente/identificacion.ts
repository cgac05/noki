import { ComandoRequestSchema, SiguientePreguntaSchema } from '@noki/contracts';
import type { ComandoRequest, SiguientePregunta } from '@noki/contracts';
import { ErrorCliente } from './errores.ts';

export type PistaIdentificacion = Extract<SiguientePregunta, { tipo: 'PREGUNTA' }>['pista'];
type RespuestaIdentificacion = { opcion?: string; valores?: Record<string, string>; reiniciar?: boolean };
type Resultado = { valido: true; comando: ComandoRequest } | { valido: false; campos: string[] };

export function armarIdentificacion(tramiteId: string, pista: PistaIdentificacion, respuesta: RespuestaIdentificacion): Resultado {
  const pregunta = SiguientePreguntaSchema.safeParse({ tipo: 'PREGUNTA', casilla: 'paciente', pista });
  if (!pregunta.success || !pista.paso) throw new ErrorCliente('CONTRATO', 'La pregunta de identificación no tiene el formato esperado.');
  let payload: Record<string, unknown> = { paso: pista.paso };
  if (respuesta.reiniciar) payload = { paso: 'REINICIAR' };
  else if (respuesta.opcion !== undefined) {
    const opcion = respuesta.opcion;
    if (!pista.opciones?.some(dato => dato.payload === opcion)) throw new ErrorCliente('CONTRATO', 'La opción no pertenece a esta pregunta.');
    if (pista.paso === 'DESTINATARIO') payload.para = opcion;
    else if (pista.paso === 'CONFIRMAR') payload.candidato = opcion === 'NINGUNO' ? null : opcion;
    else if (pista.paso === 'CURP' && opcion === 'SIN_CURP') payload.curp = null;
    else throw new ErrorCliente('CONTRATO', 'La opción no corresponde al contrato de identificación.');
  } else {
    for (const campo of pista.campos ?? []) {
      let valor = respuesta.valores?.[campo.id]?.trim() ?? '';
      if (!valor && !campo.requerido) continue;
      if (['curp', 'sexo', 'entidadNacimiento'].includes(campo.id)) valor = valor.toUpperCase();
      payload[campo.id] = valor;
    }
  }
  const resultado = ComandoRequestSchema.safeParse({ tipo: 'IdentificarPaciente', canal: 'callcenter', actor: 'asesor:asesor1', tramiteId, payload });
  if (resultado.success) return { valido: true, comando: resultado.data };
  const campos = [...new Set(resultado.error.issues.flatMap(error => error.path[0] === 'payload' && typeof error.path[1] === 'string' && pista.campos?.some(campo => campo.id === error.path[1]) ? [error.path[1]] : []))];
  if (!campos.length) throw new ErrorCliente('CONTRATO', 'La respuesta no corresponde al contrato de identificación.');
  return { valido: false, campos };
}
