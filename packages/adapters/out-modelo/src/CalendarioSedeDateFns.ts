import type { CalendarioSede } from '@noki/application';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export class CalendarioSedeDateFns implements CalendarioSede {
  local(instante: string, zona: string) {
    const fecha = formatInTimeZone(instante, zona, 'yyyy-MM-dd');
    const [hora, minuto] = formatInTimeZone(instante, zona, 'HH:mm').split(':').map(Number);
    const diaSemana = new Date(fecha + 'T00:00:00Z').getUTCDay();
    return { fecha, hora: hora!, minuto: minuto!, diaSemana };
  }

  aUtc(fecha: string, hora: number, minuto: number, zona: string): string {
    const dosDigitos = (valor: number) => String(valor).padStart(2, '0');
    return fromZonedTime(fecha + 'T' + dosDigitos(hora) + ':' + dosDigitos(minuto) + ':00', zona).toISOString();
  }
}
