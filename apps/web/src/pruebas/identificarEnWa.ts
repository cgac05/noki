import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClienteMock } from '../cliente/mock/ClienteMock.ts';
import { GUION_FLUJO_A } from '../cliente/mock/guionFlujoA.ts';

export async function prepararContinuacionWa() {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  for (const paso of GUION_FLUJO_A.slice(1)) {
    if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
    else if (paso.espera?.tipo === 'comandos') for (const comando of paso.espera.comandos) await cliente.enviarComando(comando);
    else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
    if (paso.paso.id === 'CONTINUACION_SOLICITADA') break;
  }
  return cliente;
}

export async function identificarEnWa(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(await screen.findByRole('button', { name: 'Ver horarios' }));
  await usuario.click(await screen.findByRole('button', { name: 'Ver opciones' }));
  await usuario.click(await screen.findByRole('button', { name: 'Jueves 26 · 09:15' }));
  await usuario.click(await screen.findByRole('button', { name: 'Revisar cita' }));
  await usuario.click(await screen.findByRole('button', { name: 'Para mí' }));
  await usuario.click((await screen.findAllByRole('button', { name: 'Ver opciones' })).find(boton => !(boton as HTMLButtonElement).disabled)!);
  await usuario.click(await screen.findByRole('button', { name: 'Soy Ana P.' }));
  await usuario.click(await screen.findByRole('button', { name: 'Abrir formulario' }));
}
