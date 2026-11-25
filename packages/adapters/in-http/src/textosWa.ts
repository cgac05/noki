import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import type { Canal, Casilla, PerfilServicio } from '@noki/domain';

export const fechaCorta = (inicio: string, zona: string): string =>
  formatInTimeZone(inicio, zona, 'EEE d MMM · HH:mm', { locale: es });

export const fechaLarga = (inicio: string, zona: string): string =>
  formatInTimeZone(inicio, zona, "EEEE d 'de' MMMM, HH:mm", { locale: es });

export const canalOrigen: Record<Canal, string> = {
  web: 'en la web', whatsapp: 'por WhatsApp', app: 'en la App',
  callcenter: 'por teléfono', clinica: 'en la clínica',
};

export const requisito: Record<PerfilServicio['requisitos'][number]['tipo'], string> = {
  ORDEN_MEDICA: 'Tengo mi orden médica',
  ACEPTAR_PREPARACION: 'Acepto la preparación',
  DATOS_PACIENTE: 'Confirmo mis datos',
  CONSENTIMIENTO: 'Acepto el consentimiento',
};

export const preguntaCasilla: Partial<Record<Casilla, string>> = {
  servicio: '¿Qué servicio necesitas?',
  sede: '¿En qué clínica te atendemos?',
  horario: '¿Qué horario prefieres?',
};

export function textoAprobacion(cita: { servicio: string; sede: string; inicio: string; zonaHoraria: string }): string {
  return '¿Confirmas que quieres cancelar tu cita de ' + cita.servicio + ' en ' + cita.sede
    + ' del ' + fechaLarga(cita.inicio, cita.zonaHoraria) + '?';
}

export function textoOferta(cita: { servicio: string; sede: string; inicio: string; zonaHoraria: string }): string {
  return 'Se liberó un espacio para ' + cita.servicio + ' en ' + cita.sede + ' el '
    + fechaLarga(cita.inicio, cita.zonaHoraria) + '. ¿Quieres adelantar tu cita?';
}

export const ofertaPerdida = 'Ese espacio ya fue tomado. Te avisaremos si se libera otro.';
export const citaAdelantada = (inicio: string, zona: string): string => 'Listo, tu cita quedó el ' + fechaLarga(inicio, zona) + '.';
