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
