export function enmascararNombre(nombre: string, apellidoPaterno: string): string {
  const primero = nombre.trim().split(/\s+/u)[0] ?? '';
  const inicial = apellidoPaterno.trim().charAt(0).toUpperCase();
  const pila = primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
  return inicial ? pila + ' ' + inicial + '.' : pila;
}
