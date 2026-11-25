import { ENTIDADES_NACIMIENTO } from '@noki/contracts';

type EntidadNacimiento = (typeof ENTIDADES_NACIMIENTO)[number];

const nombres: Record<EntidadNacimiento, string> = {
  AS: 'Aguascalientes', BC: 'Baja California', BS: 'Baja California Sur', CC: 'Campeche',
  CL: 'Coahuila', CM: 'Colima', CS: 'Chiapas', CH: 'Chihuahua', DF: 'Ciudad de México',
  DG: 'Durango', GT: 'Guanajuato', GR: 'Guerrero', HG: 'Hidalgo', JC: 'Jalisco',
  MC: 'Estado de México', MN: 'Michoacán', MS: 'Morelos', NT: 'Nayarit', NL: 'Nuevo León',
  OC: 'Oaxaca', PL: 'Puebla', QT: 'Querétaro', QR: 'Quintana Roo', SP: 'San Luis Potosí',
  SL: 'Sinaloa', SR: 'Sonora', TC: 'Tabasco', TS: 'Tamaulipas', TL: 'Tlaxcala',
  VZ: 'Veracruz', YN: 'Yucatán', ZS: 'Zacatecas', NE: 'Nací en el extranjero',
};

const estados = ENTIDADES_NACIMIENTO.filter(clave => clave !== 'NE')
  .sort((a, b) => nombres[a].localeCompare(nombres[b], 'es'));

export const opcionesEntidadNacimiento = [...estados, 'NE' as const]
  .map(valor => ({ valor, etiqueta: nombres[valor] }));
