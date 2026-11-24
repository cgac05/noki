import { it } from 'vitest';
import {
  BandejaMemoria, ConversacionesWaMemoria, RegistroComandosMemoria, RegistroTokensUsadosMemoria,
} from '../../../packages/adapters/memory/src/index.ts';
import { probarPuertosApi } from './bateriaPuertosApi.ts';

it('Concurrencia con la misma clave, dos usos simultáneos y almacenamiento de API en memoria', async () => {
  await probarPuertosApi(new RegistroComandosMemoria(), new ConversacionesWaMemoria(),
    new BandejaMemoria(), new RegistroTokensUsadosMemoria(), 'contacto');
});
