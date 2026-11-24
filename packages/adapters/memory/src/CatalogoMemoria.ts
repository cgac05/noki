import type { CatalogoPort } from '@noki/application';
import type { PerfilServicio, SedeId, ServicioId } from '@noki/domain';

export class CatalogoMemoria implements CatalogoPort {
  private readonly servicios = new Map<ServicioId, PerfilServicio>();
  private readonly precios = new Map<ServicioId, Map<SedeId, number>>();

  registrar(id: ServicioId, perfil: PerfilServicio, ofertas: ReadonlyMap<SedeId, number>): void {
    this.servicios.set(id, structuredClone(perfil));
    this.precios.set(id, new Map(ofertas));
  }

  async oferta(servicioId: ServicioId, sedeId: SedeId): Promise<number | null> {
    return this.precios.get(servicioId)?.get(sedeId) ?? null;
  }

  async sedesQueOfrecen(servicioId: ServicioId): Promise<SedeId[]> {
    return [...(this.precios.get(servicioId)?.keys() ?? [])];
  }

  async perfil(servicioId: ServicioId): Promise<PerfilServicio | null> {
    return structuredClone(this.servicios.get(servicioId) ?? null);
  }
}
