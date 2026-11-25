import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ModalFlow } from './ModalFlow.tsx';
import '../pruebas/dialogo.ts';

afterEach(cleanup);
it('marca formato sin enviar ni mostrar el valor fuera de su campo protegido', () => {
  const enviar = vi.fn(async () => true);
  render(<ModalFlow mensaje={{ tipo: 'flow', titulo: 'Identificar paciente', campos: [{ id: 'curp', etiqueta: 'CURP', captura: 'sensitive', requerido: true }] }} validar={() => ['curp']} onEnviar={enviar} onCerrar={() => {}} onDescartar={() => {}} />);
  const campo = screen.getByLabelText('CURP');
  fireEvent.change(campo, { target: { value: 'captura-invalida' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar formulario' }));
  expect(campo.getAttribute('aria-invalid')).toBe('true');
  expect(campo.getAttribute('type')).toBe('password');
  expect(screen.getByText('Revisa el formato de este campo')).toBeDefined();
  expect(document.body.textContent).not.toContain('captura-invalida');
  expect(enviar).not.toHaveBeenCalled();
});
