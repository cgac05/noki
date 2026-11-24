export function fechaEnSede(inicio: string, zonaHoraria: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: zonaHoraria, dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
  }).format(new Date(inicio));
}

export function dinero(centavos: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(centavos / 100);
}
