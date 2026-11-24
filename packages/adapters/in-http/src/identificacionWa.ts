import { IdentificarPacienteSchema, type MensajeBot } from '@noki/contracts';
import type { IdentificarPacientePayload } from '@noki/application';
import type { PistaDominio, TramiteId } from '@noki/domain';

type RegistrarOpcion = (payload: IdentificarPacientePayload) => string;

export function mensajesIdentificacion(pista: PistaDominio, registrar: RegistrarOpcion): MensajeBot[] {
  switch (pista.paso) {
    case 'DESTINATARIO':
      return [{
        tipo: 'botones', texto: '¿Para quién es la cita?', botones: [
          { id: 'MI', titulo: 'Para mí', payload: registrar({ paso: 'DESTINATARIO', para: 'MI' }) },
          { id: 'OTRA_PERSONA', titulo: 'Para otra persona', payload: registrar({ paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }) },
        ],
      }];
    case 'CONFIRMAR':
      return [{
        tipo: 'lista', texto: 'Elige una opción.', secciones: [{
          filas: (pista.opciones ?? []).map(({ titulo, payload }, indice) => ({
            id: 'opcion-' + indice, titulo,
            payload: registrar({ paso: 'CONFIRMAR', candidato: payload === 'NINGUNO' ? null : payload }),
          })),
        }],
      }];
    case 'FECHA_NAC':
    case 'CURP':
    case 'DATOS': {
      const mensajes: MensajeBot[] = [{
        tipo: 'flow', titulo: pista.paso === 'FECHA_NAC' ? 'Fecha de nacimiento' :
          pista.paso === 'CURP' ? 'CURP' : 'Datos del paciente',
        campos: (pista.campos ?? []).map(({ id, etiqueta, requerido }) => ({
          id, etiqueta, captura: 'sensitive',
          ...(requerido !== undefined ? { requerido } : {}),
        })),
      }];
      if (pista.paso === 'CURP') mensajes.push({
        tipo: 'botones', texto: 'Si no tienes la CURP, puedes continuar con tus datos.',
        botones: [{ id: 'SIN_CURP', titulo: 'No la tengo', payload: registrar({ paso: 'CURP', curp: null }) }],
      });
      return mensajes;
    }
    default:
      return [];
  }
}

export function respuestaFlowIdentificacion(tramiteId: TramiteId, pista: PistaDominio,
  respuesta: Readonly<Record<string, string>>): IdentificarPacientePayload | undefined {
  const { paso } = pista;
  if (paso !== 'FECHA_NAC' && paso !== 'CURP' && paso !== 'DATOS') return undefined;
  const campos = pista.campos ?? [];
  if (campos.some(({ id, requerido }) => requerido && !respuesta[id]?.trim())) return undefined;
  const entradas = Object.fromEntries(campos.flatMap(({ id }) => {
    const valor = respuesta[id]?.trim();
    return valor ? [[id, valor]] : [];
  }));
  const validado = IdentificarPacienteSchema.safeParse({
    canal: 'whatsapp', actor: 'paciente', tipo: 'IdentificarPaciente', tramiteId, payload: { ...entradas, paso },
  });
  return validado.success ? validado.data.payload : undefined;
}
