import { expect } from 'vitest';
import type { LecturasPort } from '../../../packages/application/src/index.ts';
import type { HiloId, PacienteId, SedeId, TramiteId } from '../../../packages/domain/src/index.ts';

export async function comprobarLecturasApi(lecturas: LecturasPort,
  datos?: { tramiteId: TramiteId; hiloId: HiloId; pacienteId: PacienteId; sedeId: SedeId; inicio: string }) {
  const metricas = await lecturas.metricas();
  expect(metricas.porEstado).toHaveLength(10);
  if (!datos) {
    expect(metricas.porEstado.every(({ cantidad }) => cantidad === 0)).toBe(true);
    expect(Object.values(metricas.kpis)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    return;
  }
  const ficha = await lecturas.fichaHilo(datos.hiloId);
  expect(ficha).toMatchObject({ nombrePila: 'Ana', telefonoEnmascarado: '•••• 0001' });
  const linea = await lecturas.lineaTiempo(datos.hiloId);
  expect(linea).toContainEqual(expect.objectContaining({ tipo: 'IntentoVerificacionFallido' }));
  for (const evento of linea ?? []) expect(evento).not.toHaveProperty('payload');
  expect(metricas.kpis['datosRepetidos']).toBeGreaterThanOrEqual(1);
  const citas = await lecturas.citasPaciente(datos.pacienteId);
  expect(citas.some(({ tramite }) => tramite.id === datos.tramiteId)).toBe(true);
  const fecha = datos.inicio.slice(0, 10);
  const llegadas = await lecturas.llegadasSede(datos.sedeId, fecha + 'T08:00:00Z');
  expect(llegadas).toContainEqual(expect.objectContaining({ inicio: datos.inicio, zonaHoraria: 'America/Mazatlan' }));
  expect(await lecturas.horariosOcupados(datos.sedeId, fecha, fecha + 'T08:00:00Z')).toContain(datos.inicio);
}
