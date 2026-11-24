import type { Contacto, ContactosPort, Vinculo } from '@noki/application';
import type { Canal, HiloId, PacienteId } from '@noki/domain';

export class ContactosMemoria implements ContactosPort {
  private readonly contactos = new Map<string, Contacto>();
  private readonly vinculos = new Map<string, Map<PacienteId, Vinculo>>();

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
    vinculados.set(vinculo.pacienteId, { ...vinculo });
    this.vinculos.set(contactoId, vinculados);
  }

  async buscarTelefonoCapturado(numero: string): Promise<HiloId[]> {
    const normalizar = (valor: string) => valor.replace(/\D/g, '');
    const normalizado = normalizar(numero);
    if (!normalizado) return [];
    return [...new Set([...this.contactos.values()]
      .filter(({ canal, valor }) => canal === 'callcenter' && normalizar(valor) === normalizado)
      .map(({ hiloId }) => hiloId))];
  }
}
