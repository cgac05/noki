import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { FACTORES_RIESGO } from '@noki/domain';
import type { ModeloRiesgo } from '@noki/application';

const largo = FACTORES_RIESGO.length;
const esquema = z.object({
  version: z.string().trim().min(1),
  factores: z.array(z.string()).length(largo).refine((factores) =>
    FACTORES_RIESGO.every((factor, indice) => factores[indice] === factor), 'Los factores deben coincidir en orden'),
  medias: z.array(z.number().finite()).length(largo),
  desviaciones: z.array(z.number().finite().positive()).length(largo),
  coeficientes: z.array(z.number().finite()).length(largo),
  intercepto: z.number().finite(),
});

export class ModeloInvalido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'ModeloInvalido';
  }
}

export function leerModeloRiesgo(texto: string): z.infer<typeof esquema> {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new ModeloInvalido('El modelo no es un JSON válido.');
  }
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ModeloInvalido(resultado.error.issues
      .map(({ path, message }) => path.join('.') + ': ' + message).join('; '));
  }
  return resultado.data;
}

export class ModeloRiesgoLogistico implements ModeloRiesgo {
  constructor(private readonly modelo: z.infer<typeof esquema>) {}

  async estimar(vector: readonly number[]) {
    if (vector.length !== largo || !Array.from(vector).every(Number.isFinite)) {
      throw new ModeloInvalido('El vector debe contener todos los factores como números finitos.');
    }
    const { medias, desviaciones, coeficientes, intercepto, version } = this.modelo;
    const logit = vector.reduce((suma, valor, indice) =>
      suma + coeficientes[indice]! * ((valor - medias[indice]!) / desviaciones[indice]!), intercepto);
    const probabilidad = 1 / (1 + Math.exp(-logit));
    if (!Number.isFinite(probabilidad)) throw new ModeloInvalido('El cálculo del modelo no produjo una probabilidad.');
    return { probabilidad, versionModelo: version };
  }
}

export async function cargarModeloRiesgo(ruta: string): Promise<ModeloRiesgoLogistico> {
  return new ModeloRiesgoLogistico(leerModeloRiesgo(await readFile(ruta, 'utf8')));
}
