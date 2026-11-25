import { ENTIDADES_NACIMIENTO, IdentificarPacienteSchema, type MensajeBot } from '@noki/contracts';
import type { IdentificarPacientePayload } from '@noki/application';
import type { PistaDominio, TramiteId } from '@noki/domain';
import { nombreEntidad } from './textosWa.ts';

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
        tipo: 'lista', texto: '¿Eres alguna de estas personas?', secciones: [{
          filas: (pista.opciones ?? []).map(({ titulo, payload }, indice) => ({
            id: 'opcion-' + indice, titulo,
            payload: registrar({ paso: 'CONFIRMAR', candidato: payload === 'NINGUNO' ? null : payload }),
          })),
        }],
      }];
    case 'FECHA_NAC':
    case 'CURP': {
      const mensajes: MensajeBot[] = [{
        tipo: 'flow', titulo: pista.paso === 'FECHA_NAC' ? 'Fecha de nacimiento' :
          'CURP',
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
  if (paso !== 'FECHA_NAC' && paso !== 'CURP') return undefined;
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

type EsquemaPaso = typeof IdentificarPacienteSchema.shape.payload.options[number];
type EsquemaDatos = Extract<EsquemaPaso, { shape: { nombre: unknown } }>;
const esquemaDatos = IdentificarPacienteSchema.shape.payload.options.find(
  (esquema): esquema is EsquemaDatos => esquema.shape.paso.value === 'DATOS',
);
if (!esquemaDatos) throw new Error('Falta el esquema de identificación DATOS.');
const camposDatos = esquemaDatos.shape;
const entidades = ENTIDADES_NACIMIENTO.filter(clave => clave !== 'NE')
  .sort((a, b) => nombreEntidad[a].localeCompare(nombreEntidad[b], 'es'));
const entidadesOrdenadas = [...entidades, 'NE'] as const;
const opcionesSexo = [['F', 'Mujer'], ['M', 'Hombre'], ['X', 'No binario']] as const;

export function campoPendiente(pista: PistaDominio, datos: Readonly<Record<string, string>>) {
  return pista.campos?.find(({ id }) => !Object.hasOwn(datos, id));
}

export function validarDato(id: string, valor: string | undefined): string | undefined {
  if (id === 'apellidoMaterno' && valor?.trim() === '') return '';
  if (!valor || id === 'paso' || !Object.hasOwn(camposDatos, id)) return undefined;
  const resultado = camposDatos[id as keyof typeof camposDatos].safeParse(valor);
  return resultado.success ? resultado.data : undefined;
}

type OpcionDato = { tipo: 'dato'; campo: string; valor: string } | { tipo: 'paginaEntidad'; pagina: number };

export function mensajeDato(campo: NonNullable<ReturnType<typeof campoPendiente>>, pagina: number,
  opcion: (accion: OpcionDato, titulo: string) => { id: string; titulo: string; payload: string }): MensajeBot[] {
  const elegir = (valor: string, titulo: string) => opcion({ tipo: 'dato', campo: campo.id, valor }, titulo);
  if (campo.id === 'sexo') {
    return [{ tipo: 'botones', texto: '¿Cuál es tu sexo?', botones: opcionesSexo.map(([valor, titulo]) => elegir(valor, titulo)) }];
  }
  if (campo.id === 'entidadNacimiento') {
    const inicio = pagina * 9;
    const filas = entidadesOrdenadas.slice(inicio, inicio + 9).map(clave => elegir(clave, nombreEntidad[clave]));
    if (inicio + 9 < entidadesOrdenadas.length) filas.push(opcion({ tipo: 'paginaEntidad', pagina: pagina + 1 }, 'Más estados'));
    return [{ tipo: 'lista', texto: '¿En qué entidad naciste?', secciones: [{ filas }] }];
  }
  const mensajes: MensajeBot[] = [{ tipo: 'flow', titulo: campo.etiqueta,
    campos: [{ id: campo.id, etiqueta: campo.etiqueta, captura: 'sensitive', requerido: campo.requerido ?? true }] }];
  if (campo.id === 'apellidoMaterno') {
    mensajes.push({ tipo: 'botones', texto: 'Si no tienes apellido materno, puedes omitirlo.', botones: [elegir('', 'No tengo')] });
  }
  return mensajes;
}

export function completarDatos(datos: Readonly<Record<string, string>>) {
  return esquemaDatos?.safeParse({
    ...Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== '')), paso: 'DATOS',
  });
}
