import { it } from 'vitest';
import { CatalogoMemoria, ContactosMemoria, HiloRepoMemoria, PacientesMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { datos, paciente, probarPuertos, sede, servicio } from './bateriaPuertos.ts';

it('cumple la batería de los puertos de persistencia en memoria', async () => {
  const pacientes = new PacientesMemoria();
  pacientes.registrar(paciente, datos);
  const catalogo = new CatalogoMemoria();
  catalogo.registrar(servicio, {
    tipo: 'ESTUDIO', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 10,
    limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
  }, new Map([[sede, 6200]]));
  await probarPuertos({ pacientes, catalogo, hilos: new HiloRepoMemoria(), contactos: new ContactosMemoria(pacientes) });
});
