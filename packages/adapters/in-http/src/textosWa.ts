import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import type { ENTIDADES_NACIMIENTO } from '@noki/contracts';
import type { Canal, Casilla, PerfilServicio } from '@noki/domain';

export const fechaCorta = (inicio: string, zona: string): string =>
  formatInTimeZone(inicio, zona, 'EEE d MMM · HH:mm', { locale: es });

export const fechaLarga = (inicio: string, zona: string): string =>
  formatInTimeZone(inicio, zona, "EEEE d 'de' MMMM, HH:mm", { locale: es });

export const diaCorto = (inicio: string, zona: string): string =>
  formatInTimeZone(inicio, zona, 'EEE d MMM', { locale: es });

export const preguntaDia = '¿Qué día prefieres?';
export const preguntaHora = '¿A qué hora?';

type EntidadNacimiento = typeof ENTIDADES_NACIMIENTO[number];

export const nombreEntidad: Record<EntidadNacimiento, string> = {
  AS: 'Aguascalientes', BC: 'Baja California', BS: 'Baja California Sur', CC: 'Campeche',
  CL: 'Coahuila', CM: 'Colima', CS: 'Chiapas', CH: 'Chihuahua', DF: 'Ciudad de México',
  DG: 'Durango', GT: 'Guanajuato', GR: 'Guerrero', HG: 'Hidalgo', JC: 'Jalisco',
  MC: 'Estado de México', MN: 'Michoacán', MS: 'Morelos', NT: 'Nayarit', NL: 'Nuevo León',
  OC: 'Oaxaca', PL: 'Puebla', QT: 'Querétaro', QR: 'Quintana Roo', SP: 'San Luis Potosí',
  SL: 'Sinaloa', SR: 'Sonora', TC: 'Tabasco', TS: 'Tamaulipas', TL: 'Tlaxcala',
  VZ: 'Veracruz', YN: 'Yucatán', ZS: 'Zacatecas', NE: 'Nací en el extranjero',
};

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

export const avisoLlamadaCortada = (resumen: string, pacienteGuardado: boolean): string =>
  'Parece que la llamada se cortó. ' + resumen + (pacienteGuardado ? ' Paciente: ••••.' : '');
