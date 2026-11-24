import { writeFile } from 'node:fs/promises';
import { ClienteMock } from '../../../../apps/web/src/cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from '../../../../apps/web/src/cliente/mock/guionFlujoA.ts';

const cliente = new ClienteMock({ latenciaMs: 0 });
const pasos = [];
for (const paso of GUION_FLUJO_A) {
  if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
  else if (paso.espera?.tipo === 'comandos') for (const comando of paso.espera.comandos) await cliente.enviarComando(comando);
  else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
  const tramite = await cliente.consultar('tramite', { tramiteId: IDS.tramite });
  const ficha = await cliente.consultar('fichaHilo', { hiloId: IDS.hilo });
  pasos.push({ paso: cliente.demo.paso().id, numero: cliente.demo.paso().numero, total: cliente.demo.paso().total,
    estado: tramite.estado, version: tramite.version, codigoDisponible: Boolean(ficha.codigoContinuacion),
    eventos: paso.respuesta.eventos.map(evento => ({ tipo: evento.tipo, canal: evento.canal })) });
}
const llegadas = await cliente.consultar('llegadasSede', { sedeId: IDS.sede });
await writeFile(new URL('./04-recorrido-automatizado.json', import.meta.url), JSON.stringify({
  tipo: 'Recorrido automático del cliente simulado, sin navegador',
  resultado: cliente.demo.paso().id === 'EN_CLINICA' && llegadas[0]?.registrada ? 'PASS' : 'FAIL',
  pasos, llegadaRegistrada: llegadas[0]?.registrada,
}, null, 2) + '\n');
