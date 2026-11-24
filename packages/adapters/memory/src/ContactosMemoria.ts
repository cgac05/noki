import type { Contacto, ContactosPort, PacientePorTelefono, Vinculo } from '@noki/application';
import type { Canal, HiloId, PacienteId } from '@noki/domain';

import { normalizarTelefono } from '@noki/domain';
import type { PacientesMemoria } from './PacientesMemoria.ts';

export class ContactosMemoria implements ContactosPort {
  private readonly contactos = new Map<string, Contacto>();
  private readonly vinculos = new Map<string, Map<PacienteId, Vinculo>>();

  constructor(private readonly pacientes?: Pick<PacientesMemoria, 'nombres'>) {}

  async buscar(canal: Canal, valor: string): Promise<Contacto | null> {
    const contacto = this.contactos.get(JSON.stringify([canal, valor]));
    return contacto ? { ...contacto } : null;
  }

  async crear(contacto: Contacto): Promise<Contacto> {
    const llave = JSON.stringify([contacto.canal, contacto.valor]);
    const existente = this.contactos.get(llave);
    if (existente) return { ...existente };
    this.contactos.set(llave, { ...contacto });
    return { ...contacto };
  }

  async vinculosDe(contactoId: string): Promise<Vinculo[]> {
    return structuredClone([...(this.vinculos.get(contactoId)?.values() ?? [])]);
  }

  async vincular(contactoId: string, vinculo: Vinculo): Promise<void> {
    const vinculados = this.vinculos.get(contactoId) ?? new Map<PacienteId, Vinculo>();
    const previo = vinculados.get(vinculo.pacienteId);
    if (!previo || vinculo.nivel >= previo.nivel) vinculados.set(vinculo.pacienteId, { ...vinculo });
    this.vinculos.set(contactoId, vinculados);
  }

  async pacientesPorTelefono(numero: string, desde: number): Promise<PacientePorTelefono[]> {
    const encontrados = new Map<PacienteId, PacientePorTelefono>();
    for (const contacto of this.contactos.values()) {
      if (normalizarTelefono(contacto.valor) !== numero) continue;
      for (const vinculo of this.vinculos.get(contacto.id)?.values() ?? []) {
        if (Date.parse(vinculo.ultimoUso) < desde) continue;
        const nombres = this.pacientes?.nombres(vinculo.pacienteId);
        if (nombres) encontrados.set(vinculo.pacienteId, { pacienteId: vinculo.pacienteId, ...nombres });
      }
    }
    return [...encontrados.values()].sort((a, b) => a.pacienteId.localeCompare(b.pacienteId));
  }

  async buscarTelefonoCapturado(numero: string): Promise<HiloId[]> {
    const normalizado = normalizarTelefono(numero);
    if (!normalizado) return [];
    return [...new Set([...this.contactos.values()]
      .filter(({ canal, valor }) => canal === 'callcenter' && normalizarTelefono(valor) === normalizado)
      .map(({ hiloId }) => hiloId))];
  }
}
