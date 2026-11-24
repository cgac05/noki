import type { CodigoErrorDominio, EstadoTramite, NivelAuth } from './vocabulario.ts';

export abstract class ErrorDominio extends Error {
  abstract readonly codigo: CodigoErrorDominio;
  constructor(mensaje: string, readonly datos: Readonly<Record<string, unknown>>) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ReglaViolada extends ErrorDominio {
  readonly codigo = 'REGLA_VIOLADA';
  constructor(readonly regla: string, datos: Readonly<Record<string, unknown>> = {}) {
    super('No se cumple una regla del trámite.', { ...datos, regla });
  }
}
export class StepUpRequerido extends ErrorDominio {
  readonly codigo = 'STEP_UP_REQUERIDO';
  constructor(readonly nivel: NivelAuth, readonly factores: readonly string[]) {
    super('Se requiere una verificación adicional.', { nivel, factores });
  }
}
export class ConflictoVersion extends ErrorDominio {
  readonly codigo = 'CONFLICTO_VERSION';
  constructor(readonly esperada: number, readonly actual: number) {
    super('El trámite cambió; vuelve a cargar su estado.', { esperada, actual });
  }
}
export class NoEncontrado extends ErrorDominio {
  readonly codigo = 'NO_ENCONTRADO';
  constructor(readonly entidad: string, readonly id: string) {
    super('No se encontró el recurso.', { entidad, id });
  }
}
export class TransicionInvalida extends ErrorDominio {
  readonly codigo = 'TRANSICION_INVALIDA';
  constructor(readonly de: EstadoTramite, readonly comando: string) {
    super('La acción no está permitida en el estado actual.', { de, comando });
  }
}
