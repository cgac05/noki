export function evaluar(etiquetas: readonly number[], probabilidades: readonly number[]) {
  const ordenadas = probabilidades.map((probabilidad, indice) => ({ probabilidad, etiqueta: etiquetas[indice]! }))
    .sort((a, b) => a.probabilidad - b.probabilidad);
  let positivos = 0;
  let negativos = 0;
  let pares = 0;
  let error = 0;
  let inicio = 0;
  while (inicio < ordenadas.length) {
    const probabilidad = ordenadas[inicio]!.probabilidad;
    let fin = inicio;
    let positivosEmpatados = 0;
    while (fin < ordenadas.length && ordenadas[fin]!.probabilidad === probabilidad) {
      const etiqueta = ordenadas[fin]!.etiqueta;
      positivosEmpatados += etiqueta;
      error += (probabilidad - etiqueta) ** 2;
      fin++;
    }
    const negativosEmpatados = fin - inicio - positivosEmpatados;
    pares += positivosEmpatados * (negativos + negativosEmpatados / 2);
    positivos += positivosEmpatados;
    negativos += negativosEmpatados;
    inicio = fin;
  }
  return {
    auc: positivos && negativos ? pares / (positivos * negativos) : null,
    brier: ordenadas.length ? error / ordenadas.length : null,
  };
}
