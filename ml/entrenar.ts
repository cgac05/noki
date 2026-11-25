import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { FACTORES_RIESGO, vectorFactores } from '../packages/domain/src/prediccion/factores.ts';
import { probabilidadPorReglas } from '../packages/domain/src/prediccion/nivel.ts';
import { evaluar } from './evaluar.ts';
import { aleatorioConSemilla, generarDatos } from './generarDatos.ts';

const SEMILLA = 20261125;
const CANTIDAD = 6000;
const TASA = 0.15;
const L2 = 0.01;
const ITERACIONES = 400;

function sigmoide(valor: number): number {
  return 1 / (1 + Math.exp(-valor));
}

function combinacion(vector: readonly number[], coeficientes: readonly number[], intercepto: number): number {
  return vector.reduce((suma, valor, i) => suma + valor * coeficientes[i]!, intercepto);
}

export function entrenar(semilla = SEMILLA, cantidad = CANTIDAD) {
  const datos = generarDatos(semilla, cantidad);
  const aleatorio = aleatorioConSemilla(semilla ^ 0x9e3779b9);
  for (let i = datos.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [datos[i], datos[j]] = [datos[j]!, datos[i]!];
  }
  const corte = Math.floor(datos.length * 0.8);
  const entrenamiento = datos.slice(0, corte);
  const validacion = datos.slice(corte);
  const vectores = entrenamiento.map(({ factores }) => vectorFactores(factores));
  const medias = FACTORES_RIESGO.map((_, i) => vectores.reduce((suma, vector) => suma + vector[i]!, 0) / corte);
  const desviaciones = medias.map((media, i) =>
    Math.sqrt(vectores.reduce((suma, vector) => suma + (vector[i]! - media) ** 2, 0) / corte) || 1);
  const normalizar = (vector: readonly number[]) =>
    vector.map((valor, i) => (valor - medias[i]!) / desviaciones[i]!);
  const normalizados = vectores.map(normalizar);
  const coeficientes = medias.map(() => 0);
  let intercepto = 0;
  for (let paso = 0; paso < ITERACIONES; paso++) {
    const gradientes = medias.map(() => 0);
    let gradienteIntercepto = 0;
    for (const [indice, vector] of normalizados.entries()) {
      const error = sigmoide(combinacion(vector, coeficientes, intercepto)) - entrenamiento[indice]!.inasistencia;
      gradienteIntercepto += error;
      for (const [i, valor] of vector.entries()) gradientes[i]! += error * valor;
    }
    intercepto -= TASA * gradienteIntercepto / corte;
    for (const [i, gradiente] of gradientes.entries()) {
      coeficientes[i]! -= TASA * (gradiente / corte + L2 * coeficientes[i]!);
    }
  }
  const etiquetas = validacion.map(({ inasistencia }) => inasistencia);
  return {
    modelo: { version: 'riesgo-inasistencia@1', factores: FACTORES_RIESGO, medias, desviaciones, coeficientes, intercepto },
    metricas: {
      sinteticos: true, semilla, entrenamiento: corte, validacion: validacion.length,
      modelo: evaluar(etiquetas, validacion.map(({ factores }) =>
        sigmoide(combinacion(normalizar(vectorFactores(factores)), coeficientes, intercepto)))),
      reglas: evaluar(etiquetas, validacion.map(({ factores }) => probabilidadPorReglas(factores))),
    },
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { modelo, metricas } = entrenar();
  const directorio = new URL('../packages/adapters/out-modelo/modelo/', import.meta.url);
  mkdirSync(directorio, { recursive: true });
  writeFileSync(new URL('riesgo-inasistencia.json', directorio), JSON.stringify(modelo, null, 2) + '\n');
  writeFileSync(new URL('metricas.json', import.meta.url), JSON.stringify(metricas, null, 2) + '\n');
}
