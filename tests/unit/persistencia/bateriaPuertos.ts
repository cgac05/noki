import { expect } from 'vitest';
import type { CatalogoPort, ContactosPort, HiloRepo, PacientesPort } from '../../../packages/application/src/index.ts';
import { HiloAtencion, type HiloId, type PacienteId, type SedeId, type ServicioId } from '../../../packages/domain/src/index.ts';

export const paciente = '84ca2db0-70f1-7cf4-ab68-16ecf18d39ac' as PacienteId;
export const servicio = '84ca2db0-70f1-7cf4-ab68-16ecf18d39ad' as ServicioId;
export const sede = '84ca2db0-70f1-7cf4-ab68-16ecf18d39ae' as SedeId;
export const hilo = '84ca2db0-70f1-7cf4-ab68-16ecf18d39af' as HiloId;
export const contacto = '84ca2db0-70f1-7cf4-ab68-16ecf18d39b1';
export const datos = { nombre: 'Paciente', apellidoPaterno: 'Prueba persistencia', fechaNac: '2000-01-01', sexo: 'F' } as const;

export async function probarPuertos(puertos: {
  hilos: HiloRepo; contactos: ContactosPort; pacientes: PacientesPort; catalogo: CatalogoPort;
}): Promise<void> {
  const { hilos, contactos, pacientes, catalogo } = puertos;
  const ficha = { id: contacto, hiloId: hilo, canal: 'callcenter', valor: '+52 100 123 4567' } as const;
  expect(await contactos.buscar(ficha.canal, ficha.valor)).toBeNull();
  expect(await contactos.crear(ficha)).toEqual(ficha);
  expect(await contactos.crear(ficha)).toEqual(ficha);
  await hilos.guardar(new HiloAtencion(hilo, contacto, 'callcenter'));
  expect((await hilos.porContacto(contacto))?.id).toBe(hilo);
  const cargado = await hilos.obtener(hilo);
  if (!cargado) throw new Error('Falta el hilo.');
  cargado.retomar('whatsapp', 'TOKEN_CC');
  await hilos.guardar(cargado);
  expect((await hilos.obtener(hilo))?.ultimoCanal).toBe('whatsapp');
  expect(await contactos.buscarTelefonoCapturado('521001234567')).toEqual([hilo]);
  const vinculo = { pacienteId: paciente, metodo: 'TOKEN_CC', relacion: 'TITULAR', nivel: 2 } as const;
  await contactos.vincular(contacto, vinculo);
  expect(await contactos.vinculosDe(contacto)).toEqual([vinculo]);
  expect(await pacientes.coincideFechaNac(paciente, datos.fechaNac)).toBe(true);
  expect(await pacientes.coincideFechaNac(paciente, '2000-01-02')).toBe(false);
  expect(await pacientes.buscarPorDatos({ ...datos, nombre: '  pACIENTE  ' })).toEqual([paciente]);
  expect(await pacientes.buscarPorDatos({ ...datos, nombre: "' OR true --" })).toEqual([]);
  expect(await pacientes.datosElegibilidad(paciente)).toEqual({ sexo: 'F', fechaNac: datos.fechaNac });
  expect(await catalogo.oferta(servicio, sede)).toBe(6200);
  expect(await catalogo.sedesQueOfrecen(servicio)).toEqual([sede]);
  expect(await catalogo.perfil(servicio)).toMatchObject({ tipo: 'ESTUDIO' });
}
