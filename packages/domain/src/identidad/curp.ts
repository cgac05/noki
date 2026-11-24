export const ENTIDADES_NACIMIENTO = [
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR',
  'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP',
  'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE',
] as const;

export type EntidadNacimiento = typeof ENTIDADES_NACIMIENTO[number];
type Sexo = 'F' | 'M' | 'X';

interface Nombres {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
}

interface DatosNacimiento {
  fechaNac: string;
  sexo: Sexo;
  entidadNacimiento: EntidadNacimiento;
}

const formato = new RegExp(
  '^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HMX](' + ENTIDADES_NACIMIENTO.join('|') +
  ')[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$',
);
const diccionario = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
const particulas = new Set('DA DAS DE DEL DER DI DIE DD EL LA LOS LAS LE LES MAC MC VAN VON Y'.split(' '));
const nombresCompuestos = new Set(['JOSE', 'J', 'MARIA', 'MA', 'M']);
const inconvenientes = new Set((
  'BACA BAKA BUFI BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COGI COJA COJE COJI COJO COLA CULO ' +
  'FALO FETO GETA GUEI GUEY JETA JOTO KACA KACO KAGA KAGO KAKA KAKO KOGE KOGI KOJA KOJE KOJI KOJO ' +
  'KOLA KULO LILO LOCA LOCO LOKA LOKO MAME MAMO MEAR MEAS MEON MIAR MION MOCO MOKO MULA MULO ' +
  'NACA NACO PEDA PEDO PENE PIPI PITO POPO PUTA PUTO QULO RATA ROBA ROBE ROBO RUIN SENO TETA ' +
  'VACA VAGA VAGO VAKA VUEI VUEY WUEI WUEY'
).split(' '));

export function validarCurp(curp: string): DatosNacimiento | undefined {
  if (!formato.test(curp)) return undefined;
  const siglo = /^[0-9]$/.test(curp.charAt(16)) ? 1900 : 2000;
  const anio = siglo + Number(curp.slice(4, 6));
  const mes = Number(curp.slice(6, 8));
  const dia = Number(curp.slice(8, 10));
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dia < 1 || dia > (dias[mes - 1] ?? 0)) return undefined;

  const suma = Array.from(curp.slice(0, 17)).reduce(
    (total, caracter, indice) => total + diccionario.indexOf(caracter) * (18 - indice),
    0,
  );
  if ((10 - suma % 10) % 10 !== Number(curp.charAt(17))) return undefined;
  const marca = curp.charAt(10);
  const sexo = marca === 'H' ? 'M' : marca === 'M' ? 'F' : 'X';
  return {
    fechaNac: anio + '-' + curp.slice(6, 8) + '-' + curp.slice(8, 10),
    sexo,
    entidadNacimiento: curp.slice(11, 13) as EntidadNacimiento,
  };
}

function palabras(valor: string): string[] {
  return valor.toUpperCase().normalize('NFC').replaceAll('Ñ', 'X').normalize('NFD')
    .replace(/\p{M}/gu, '').split(/\s+/u)
    .map((palabra) => palabra.replace(/[^A-Z]/gu, ''))
    .filter((palabra) => palabra.length > 0 && !particulas.has(palabra));
}

function letrasNombres(datos: Nombres): { iniciales: string; consonantes: string } {
  const paterno = palabras(datos.apellidoPaterno)[0] ?? 'X';
  const materno = palabras(datos.apellidoMaterno ?? '')[0] ?? 'X';
  const [primero = 'X', segundo] = palabras(datos.nombre);
  const nombre = nombresCompuestos.has(primero) && segundo ? segundo : primero;
  const vocal = paterno.slice(1).match(/[AEIOU]/u)?.[0] ?? 'X';
  const iniciales = paterno.charAt(0) + vocal + materno.charAt(0) + nombre.charAt(0);
  const consonantes = [paterno, materno, nombre].map(
    (palabra) => palabra.slice(1).match(/[B-DF-HJ-NP-TV-Z]/u)?.[0] ?? 'X',
  ).join('');
  return {
    iniciales: inconvenientes.has(iniciales) ? iniciales.charAt(0) + 'X' + iniciales.slice(2) : iniciales,
    consonantes,
  };
}

export function coincideNombreCurp(curp: string, datos: Nombres): boolean {
  const { iniciales, consonantes } = letrasNombres(datos);
  return curp.slice(0, 4) === iniciales && curp.slice(13, 16) === consonantes;
}

export function curpBase(datos: Nombres & DatosNacimiento): string | undefined {
  if (datos.sexo === 'X') return undefined;
  const { iniciales, consonantes } = letrasNombres(datos);
  const fecha = datos.fechaNac.slice(2).replaceAll('-', '');
  const marca = datos.sexo === 'F' ? 'M' : 'H';
  return iniciales + fecha + marca + datos.entidadNacimiento + consonantes;
}
