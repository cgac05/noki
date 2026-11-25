import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

export async function entrarSesionDemo(usuario: ReturnType<typeof userEvent.setup>, telefono = '5210000000001', clave = 'prueba123') {
  const campo = screen.getByLabelText('Teléfono', { exact: true });
  await usuario.clear(campo);
  await usuario.type(campo, telefono);
  await usuario.type(screen.getByLabelText('Contraseña de demostración'), clave);
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
}
