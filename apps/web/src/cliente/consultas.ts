import { RUTAS_CONSULTAS } from '@noki/contracts';
import type { NombreConsulta, ParametrosConsulta, RespuestaConsulta } from '@noki/contracts';
import type { z } from 'zod';
import { ESQUEMAS_DEMO } from './demo.ts';
import { validar } from './errores.ts';

export type NombreConsultaCliente = NombreConsulta | keyof typeof ESQUEMAS_DEMO;
export type ParametrosConsultaCliente<N extends NombreConsultaCliente> = N extends NombreConsulta ? ParametrosConsulta<N> : Record<string, never>;
export type RespuestaConsultaCliente<N extends NombreConsultaCliente> = N extends NombreConsulta ? RespuestaConsulta<N>
  : N extends keyof typeof ESQUEMAS_DEMO ? z.infer<(typeof ESQUEMAS_DEMO)[N]> : never;
export type LecturasCliente = { [N in NombreConsultaCliente]: RespuestaConsultaCliente<N> };

export function esConsultaCompartida(nombre: NombreConsultaCliente): nombre is NombreConsulta {
  return nombre !== 'web';
}

function esquemaConsulta(nombre: NombreConsultaCliente) {
  return esConsultaCompartida(nombre) ? RUTAS_CONSULTAS[nombre].respuesta : ESQUEMAS_DEMO[nombre];
}

export function validarConsulta<N extends NombreConsultaCliente>(nombre: N, dato: unknown): RespuestaConsultaCliente<N> {
  const esquema = esquemaConsulta(nombre);
  // El índice genérico conserva la relación nombre/esquema que TS no distribuye sobre Zod.
  return validar(esquema, dato) as RespuestaConsultaCliente<N>;
}
