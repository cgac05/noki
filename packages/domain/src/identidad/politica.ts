import { StepUpRequerido } from '../errores.ts';
import type { Actor, Canal, NivelAuth } from '../vocabulario.ts';

export type Factor = 'TOKEN' | 'FOLIO_FECHA_NAC' | 'OTP' | 'BOTON_APROBACION'
  | 'PIN' | 'ENLACE_MAGICO' | 'OTP_CONTACTO_ANTERIOR' | 'VINCULO' | 'FOLIO';

export interface ContextoIdentidad {
  actor: Actor;
  canal: Canal;
  nivel: NivelAuth;
  vinculado: boolean;
  factores: ReadonlySet<Factor>;
}

interface Requisito {
  nivel?: NivelAuth;
  grupos?: readonly (readonly Factor[])[];
  web?: boolean;
}

const cambioContacto = { nivel: 1, grupos: [['OTP_CONTACTO_ANTERIOR'], ['PIN']] } as const;
const cambiarCita = { grupos: [['VINCULO'], ['OTP', 'BOTON_APROBACION']] } as const;

const requisitos = {
  cotizar: {},
  verPreparacion: {},
  agendar: {},
  retomar: { grupos: [['FOLIO_FECHA_NAC', 'VINCULO', 'TOKEN']] },
  cancelar: cambiarCita,
  reprogramar: cambiarCita,
  verResultados: { nivel: 1, grupos: [['PIN'], ['ENLACE_MAGICO']], web: true },
  cambiarTelefono: cambioContacto,
  cambiarCorreo: cambioContacto,
  aceptarOfertaHueco: { grupos: [['VINCULO'], ['TOKEN']] },
  responderRecordatorio: { grupos: [['TOKEN']] },
  solicitarFactura: { grupos: [['VINCULO'], ['FOLIO']] },
} as const satisfies Record<string, Requisito>;

export type AccionProtegida = keyof typeof requisitos;

export class PoliticaIdentidad {
  exigir(accion: AccionProtegida, contexto: ContextoIdentidad): void {
    if (contexto.actor !== 'paciente') return;
    const requisito: Requisito = requisitos[accion];
    const nivel = requisito.nivel ?? 0;
    const cumple = (factor: Factor): boolean => {
      if (factor === 'VINCULO') return contexto.vinculado;
      if (factor === 'ENLACE_MAGICO' && requisito.web && contexto.canal !== 'web') return false;
      return contexto.factores.has(factor);
    };
    const faltantes = (requisito.grupos ?? [])
      .filter((grupo) => !grupo.some(cumple))
      .flatMap((grupo) => accion === 'retomar' ? ['FOLIO_FECHA_NAC' as const] : grupo);
    if (contexto.nivel < nivel || faltantes.length > 0) {
      throw new StepUpRequerido(nivel, faltantes);
    }
  }
}
