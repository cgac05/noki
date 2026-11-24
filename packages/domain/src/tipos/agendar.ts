import { RegistroTiposTramite, type DefinicionTipoTramite } from '../RegistroTiposTramite.ts';
import { CASILLAS, type Casilla } from '../vocabulario.ts';

const remoto = ['servicio', 'sede', 'horario', 'requisitos', 'paciente', 'elegibilidad'] as const;

const agendar: DefinicionTipoTramite = {
  casillas: CASILLAS,
  dependencias: {
    servicio: [],
    sede: [],
    paciente: [],
    horario: ['servicio', 'sede'],
    requisitos: ['servicio'],
    elegibilidad: ['servicio', 'paciente'],
  },
  ordenPorCanal: {
    whatsapp: remoto,
    web: remoto,
    app: remoto,
    callcenter: ['paciente', 'servicio', 'sede', 'horario', 'requisitos', 'elegibilidad'],
    clinica: ['paciente', 'servicio', 'sede', 'requisitos', 'horario', 'elegibilidad'],
  },
  pistas: {
    servicio: { entrada: 'LISTA' },
    sede: { entrada: 'LISTA' },
    horario: { entrada: 'LISTA' },
    requisitos: { entrada: 'BOTONES' },
    elegibilidad: { entrada: 'BOTONES' },
    paciente: {
      entrada: 'FLOW',
      campos: [
        { id: 'nombre', etiqueta: 'Nombre', captura: 'sensitive', requerido: true },
        { id: 'apellidoPaterno', etiqueta: 'Apellido paterno', captura: 'sensitive', requerido: true },
        { id: 'apellidoMaterno', etiqueta: 'Apellido materno', captura: 'sensitive' },
        { id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true },
      ],
    },
  },
  transiciones: {
    apartar: { LISTO_PARA_RESERVAR: 'HORARIO_RESERVADO' },
    confirmar: { HORARIO_RESERVADO: 'CONFIRMADA' },
    expirarHold: { HORARIO_RESERVADO: 'LISTO_PARA_RESERVAR' },
    registrarLlegada: { CONFIRMADA: 'EN_CLINICA' },
    cerrarAtencion: { EN_CLINICA: 'ATENDIDA' },
    cancelar: { CONFIRMADA: 'CANCELADA' },
    marcarInasistencia: { CONFIRMADA: 'NO_ASISTIO' },
    expirarPorInactividad: {
      BORRADOR: 'EXPIRADO',
      COTIZADO: 'EXPIRADO',
      LISTO_PARA_RESERVAR: 'EXPIRADO',
      HORARIO_RESERVADO: 'EXPIRADO',
    },
  },
  hitos: (llena) => {
    const cotizacion: Casilla[] = ['servicio', 'sede'];
    const requisitos: Casilla[] = ['paciente', 'requisitos'];
    if (!cotizacion.every(llena)) return 'BORRADOR';
    return requisitos.every(llena) ? 'LISTO_PARA_RESERVAR' : 'COTIZADO';
  },
};

export function crearRegistroTiposTramite(): RegistroTiposTramite {
  const registro = new RegistroTiposTramite();
  const { hitos, ...datos } = agendar;
  registro.registrar('AGENDAR', { ...structuredClone(datos), hitos });
  return registro;
}
