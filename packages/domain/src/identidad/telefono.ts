export const VIGENCIA_VINCULO_DIAS = 180;

export function normalizarTelefono(valor: string): string | undefined {
  const digitos = valor.replace(/[^0-9]/gu, '');
  return digitos.length >= 10 ? digitos.slice(-10) : undefined;
}
