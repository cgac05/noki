export interface PerfilServicio {
  tipo: 'ESTUDIO' | 'CONSULTA';
  requisitos: Array<
    { tipo: 'ORDEN_MEDICA' } |
    { tipo: 'ACEPTAR_PREPARACION'; texto: string } |
    { tipo: 'DATOS_PACIENTE'; campos: string[] } |
    { tipo: 'CONSENTIMIENTO'; documento: string }
  >;
  modoAgenda: 'HORARIO' | 'TURNO';
  requiereProfesional: boolean;
  elegibilidad?: { sexo?: 'F' | 'M'; edadMin?: number; edadMax?: number };
  componentes?: string[];
  duracionMin: number;
  ttlReservaMin: number;
  toleranciaMin: number;
  limiteCambiosHoras: number;
  preparacion?: { ayunoHoras?: [number, number]; vejigaLlena?: boolean; texto: string };
  anticipacionMinimaHoras: number;
  reglasItinerario?: { irPrimero?: boolean; separacionMinMin?: number; incompatibleAntesDe?: string[] };
  recordatorios: Array<'T48' | 'PREPARACION' | 'T2' | 'POST'>;
}
