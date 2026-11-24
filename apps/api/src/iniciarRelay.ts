type CodigoRelay = 'RELAY_OUTBOX_FALLIDO' | 'RELAY_OUTBOX_RECUPERADO';

export function iniciarRelay(publicar: () => Promise<boolean>, avisar: (codigo: CodigoRelay) => void): () => Promise<void> {
  let espera = 250;
  let fallando = false;
  let detenido = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let enCurso: Promise<void>;

  function ejecutar(): void {
    enCurso = publicar().catch(() => false).then(exito => {
      if (exito === fallando) {
        avisar(exito ? 'RELAY_OUTBOX_RECUPERADO' : 'RELAY_OUTBOX_FALLIDO');
      }
      espera = exito || !fallando ? 250 : Math.min(espera * 2, 5000);
      fallando = !exito;
      if (!detenido) temporizador = setTimeout(ejecutar, espera);
    });
  }

  ejecutar();
  return async () => {
    detenido = true;
    clearTimeout(temporizador);
    await enCurso;
  };
}
