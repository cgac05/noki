import type { PerfilServicio } from '@noki/domain';

export const idDemo = (numero: number): string => '019b0000-0000-7000-8000-' + numero.toString(16).padStart(12, '0');

export const SEDES_DEMO = [
  { id: idDemo(1), nombre: 'Clínica Tepic', ciudad: 'Tepic', lat: 21.504, lng: -104.895, zonaHoraria: 'America/Mazatlan' },
  { id: idDemo(2), nombre: 'Clínica Bahía de Banderas', ciudad: 'Bahía de Banderas', lat: 20.804, lng: -105.276, zonaHoraria: 'America/Bahia_Banderas' },
  { id: idDemo(3), nombre: 'Clínica Tijuana', ciudad: 'Tijuana', lat: 32.514, lng: -117.038, zonaHoraria: 'America/Tijuana' },
] as const;

interface ServicioDemo {
  id: string; codigo: string; nombre: string; sinonimos: string[]; precioCentavos: number; perfil: PerfilServicio;
}
const comun = { duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 15, limiteCambiosHoras: 4 };
export const SERVICIOS_DEMO: readonly ServicioDemo[] = [
  { id: idDemo(10), codigo: 'QS', nombre: 'Química sanguínea', sinonimos: ['quimica sanguinea', 'perfil quimico', 'analisis de sangre'], precioCentavos: 5500,
    perfil: { ...comun, tipo: 'ESTUDIO', requisitos: [{ tipo: 'ACEPTAR_PREPARACION', texto: 'Preparación de laboratorio de demostración.' }], modoAgenda: 'TURNO', requiereProfesional: false, duracionMin: 15, preparacion: { ayunoHoras: [8,12], texto: 'Ayuno simulado para las pruebas de preparación.' }, anticipacionMinimaHoras: 8, reglasItinerario: { irPrimero: true }, recordatorios: ['T48','PREPARACION','T2','POST'] } },
  { id: idDemo(11), codigo: 'US_ABDOMINAL', nombre: 'Ultrasonido abdominal', sinonimos: ['ultrasonido abdomen', 'eco abdominal'], precioCentavos: 12000,
    perfil: { ...comun, tipo: 'ESTUDIO', requisitos: [{ tipo: 'ORDEN_MEDICA' }, { tipo: 'ACEPTAR_PREPARACION', texto: 'Preparación de ultrasonido de demostración.' }], modoAgenda: 'HORARIO', requiereProfesional: false, preparacion: { ayunoHoras: [6,8], vejigaLlena: true, texto: 'Preparación simulada; sin indicaciones clínicas reales.' }, anticipacionMinimaHoras: 6, recordatorios: ['T48','PREPARACION','T2','POST'] } },
  { id: idDemo(12), codigo: 'NUTRICION', nombre: 'Consulta nutricional', sinonimos: ['nutriologo', 'consulta de nutricion'], precioCentavos: 15000,
    perfil: { ...comun, tipo: 'CONSULTA', requisitos: [{ tipo: 'DATOS_PACIENTE', campos: ['nombre','fechaNac'] }], modoAgenda: 'HORARIO', requiereProfesional: true, anticipacionMinimaHoras: 0, recordatorios: ['T48','T2','POST'] } },
  { id: idDemo(13), codigo: 'PAQUETE_MAMARIO_PAP', nombre: 'Paquete US mamario + Papanicolaou', sinonimos: ['paquete mamario', 'ultrasonido mamario y papanicolaou'], precioCentavos: 25000,
    perfil: { ...comun, tipo: 'ESTUDIO', requisitos: [{ tipo: 'CONSENTIMIENTO', documento: 'consentimiento-demo-v1' }], modoAgenda: 'HORARIO', requiereProfesional: true, elegibilidad: { sexo: 'F' }, componentes: ['US_MAMARIO','PAPANICOLAOU'], duracionMin: 40, anticipacionMinimaHoras: 0, reglasItinerario: { separacionMinMin: 10 }, recordatorios: ['T48','T2','POST'] } },
];
export const PACIENTES_DEMO = [
  { id: idDemo(20), nombre: 'Ana', fechaNac: '1990-01-01', sexo: 'F', wa: '5210000000001', contactoId: idDemo(30), credencialId: idDemo(40) },
  { id: idDemo(21), nombre: 'Beto', fechaNac: '1988-01-01', sexo: 'M', wa: '5210000000002', contactoId: idDemo(31), credencialId: idDemo(41) },
] as const;
export const USUARIOS_DEMO = [
  { id: idDemo(50), usuario: 'asesor1', rol: 'ASESOR', sedeId: null },
  { id: idDemo(51), usuario: 'recepcion.tepic', rol: 'RECEPCION', sedeId: idDemo(1) },
  { id: idDemo(52), usuario: 'admin', rol: 'ADMIN', sedeId: null },
] as const;
