import { RegistroTiposTramite, type DefinicionTipoTramite, type PistaDominio } from '../RegistroTiposTramite.ts';
import { CASILLAS, type Casilla } from '../vocabulario.ts';

const campo = (id: string, etiqueta: string, requerido = true) => ({
  id, etiqueta, captura: 'sensitive' as const, requerido,
});

const pistaPaciente: NonNullable<DefinicionTipoTramite['pistaPaciente']> = (paso, identificacion) => {
  const fecha = campo('fechaNac', 'Fecha de nacimiento');
  const opcion = (payload: string, titulo: string) => ({ id: payload, payload, titulo });
  switch (paso) {
    case 'DESTINATARIO':
      return { paso, entrada: 'BOTONES', opciones: [
        opcion('MI', 'Para mí'), opcion('OTRA_PERSONA', 'Para otra persona'),
      ] };
    case 'CONFIRMAR':
      return { paso, entrada: 'LISTA', opciones: [
        ...(identificacion?.candidatos ?? []).map(({ ref, nombreVisible }) => opcion(ref, 'Soy ' + nombreVisible)),
        opcion('NINGUNO', 'No soy ninguno'),
      ] };
    case 'FECHA_NAC':
      return { paso, entrada: 'FLOW', campos: [fecha] };
    case 'CURP':
      return { paso, entrada: 'FLOW', campos: [campo('curp', 'CURP')], opciones: [
        opcion('SIN_CURP', 'No la tengo'),
      ] };
    case 'DATOS': {
      const campos: NonNullable<PistaDominio['campos']> = [
        campo('nombre', 'Nombre'), campo('apellidoPaterno', 'Apellido paterno'),
        campo('apellidoMaterno', 'Apellido materno', false),
      ];
      if (!identificacion?.curp) {
        if (!identificacion?.fechaNac) campos.push(fecha);
        campos.push(campo('sexo', 'Sexo'), campo('entidadNacimiento', 'Entidad de nacimiento'));
      }
      return { paso, entrada: 'FLOW', campos };
    }
  }
};

const remoto = ['servicio', 'sede', 'horario', 'requisitos', 'paciente', 'elegibilidad'] as const;

const agendar: DefinicionTipoTramite = {
  inactividadHoras: 24,
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
  },
  pistaPaciente,
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
  const { hitos, pistaPaciente, ...datos } = agendar;
  registro.registrar('AGENDAR', { ...structuredClone(datos), hitos, ...(pistaPaciente ? { pistaPaciente } : {}) });
  return registro;
}
