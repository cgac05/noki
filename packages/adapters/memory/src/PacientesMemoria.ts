import type { DatosDeclarados, DatosRegistroPaciente, PacientesPort } from '@noki/application';
import type { DatosElegibilidad, PacienteId } from '@noki/domain';

export class PacientesMemoria implements PacientesPort {
  private readonly pacientes = new Map<PacienteId, DatosRegistroPaciente>();

  async registrar(id: PacienteId, datos: DatosRegistroPaciente): Promise<boolean> {
    if (this.pacientes.has(id) || (datos.curp && this.idConCurp(datos.curp))) return false;
    this.pacientes.set(id, { ...datos });
    return true;
  }

  nombres(id: PacienteId): Pick<DatosDeclarados, 'nombre' | 'apellidoPaterno'> | undefined {
    const datos = this.pacientes.get(id);
    return datos && { nombre: datos.nombre, apellidoPaterno: datos.apellidoPaterno };
  }

  async buscarPorCurp(curp: string): Promise<PacienteId | undefined> {
    return this.idConCurp(curp);
  }

  async buscarPorCurpBase(base: string): Promise<PacienteId[]> {
    return [...this.pacientes].filter(([, datos]) => !datos.curp && datos.curpBase === base).map(([id]) => id);
  }

  async baseDe(id: PacienteId): Promise<string | undefined> {
    return this.pacientes.get(id)?.curpBase;
  }

  async completarCurp(id: PacienteId, curp: string): Promise<boolean> {
    const datos = this.pacientes.get(id);
    if (!datos || (datos.curp && datos.curp !== curp)) return false;
    const existente = this.idConCurp(curp);
    if (existente && existente !== id) return false;
    datos.curp = curp;
    return true;
  }

  private idConCurp(curp: string): PacienteId | undefined {
    return [...this.pacientes].find(([, datos]) => datos.curp === curp)?.[0];
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
