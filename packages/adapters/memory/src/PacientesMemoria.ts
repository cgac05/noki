import type { DatosDeclarados, PacientesPort } from '@noki/application';
import type { DatosElegibilidad, PacienteId } from '@noki/domain';

export class PacientesMemoria implements PacientesPort {
  private readonly pacientes = new Map<PacienteId, DatosDeclarados & DatosElegibilidad>();

  registrar(id: PacienteId, datos: DatosDeclarados & DatosElegibilidad): void {
    this.pacientes.set(id, { ...datos });
  }

  async datosElegibilidad(id: PacienteId): Promise<DatosElegibilidad | undefined> {
    const paciente = this.pacientes.get(id);
    return paciente && { sexo: paciente.sexo, fechaNac: paciente.fechaNac };
  }

  async coincideFechaNac(id: PacienteId, fechaNac: string): Promise<boolean> {
    return this.pacientes.get(id)?.fechaNac === fechaNac;
  }

  async buscarPorDatos(datos: DatosDeclarados): Promise<PacienteId[]> {
    const normalizar = (valor = '') => valor.trim().toLocaleLowerCase('es-MX');
    return [...this.pacientes].filter(([, paciente]) =>
      normalizar(paciente.nombre) === normalizar(datos.nombre)
      && normalizar(paciente.apellidoPaterno) === normalizar(datos.apellidoPaterno)
      && normalizar(paciente.apellidoMaterno) === normalizar(datos.apellidoMaterno)
      && paciente.fechaNac === datos.fechaNac,
    ).map(([id]) => id);
  }
}
