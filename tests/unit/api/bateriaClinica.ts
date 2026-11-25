import { expect } from 'vitest';
import type { CasosTramite, EventosSinTramite, EmisorTokens, GeneradorId, LecturasPort, RelojAjustable } from '../../../packages/application/src/index.ts';
import type { PacienteId, SedeId, ServicioId } from '../../../packages/domain/src/index.ts';

export async function comprobarClinica(
  { casos, lecturas, ids, reloj, tokens }: { casos: CasosTramite; lecturas: LecturasPort; ids: GeneradorId; reloj: RelojAjustable; tokens: EmisorTokens },
  sinTramite: EventosSinTramite,
  { sedeId, servicioId, pacienteId }: { sedeId: SedeId; servicioId: ServicioId; pacienteId: PacienteId },
) {
  expect(await lecturas.alertasSeguridad()).toEqual([]);
  const comando = () => ({
    canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false, factores: new Set<never>(),
    idempotencyKey: ids.nuevo(), correlationId: ids.nuevo(),
  } as const);
  const ahora = reloj.ahora().getTime();
  async function confirmar(minutos: number) {
    const { tramite: { id } } = await casos.iniciar('AGENDAR', '0000000028', comando());
    await casos.asignarPaciente(id, pacienteId, comando());
    await casos.seleccionarServicio(id, servicioId, comando());
    await casos.seleccionarSede(id, sedeId, comando());
    await casos.cumplirRequisito(id, 'ACEPTAR_PREPARACION', comando());
    await casos.reservar(id, new Date(ahora + minutos * 60_000).toISOString(), comando());
    return (await casos.confirmar(id, comando())).tramite;
  }
  const a = await confirmar(1500);
  const b = await confirmar(1440);
  const c = await confirmar(1560);
  for (const tramite of [a, b]) {
    reloj.adelantar(1_000);
    const ahora = reloj.ahora();
    const token = await tokens.emitir({
      jti: ids.nuevo(), uso: 'LLEGADA', tramiteId: tramite.id, hiloId: tramite.hiloId,
      nivel: 1, canalOrigen: 'app', metodo: 'TOKEN_WEB', emitidoEn: ahora.toISOString(),
      expiraEn: new Date(ahora.getTime() + 60_000).toISOString(),
    });
    await casos.registrarLlegada(token, {
      canal: 'clinica', actor: 'recepcion:demo', nivel: 0, vinculado: false, factores: new Set(),
      idempotencyKey: ids.nuevo(), correlationId: ids.nuevo(),
    });
  }
  const citas = await lecturas.llegadasSede(sedeId, reloj.ahora().toISOString());
  expect(citas.map(({ tramite, posicion }) => [tramite.id, posicion]))
    .toEqual([[b.id, 2], [a.id, 1], [c.id, undefined]]);
  const hiloId = a.hiloId;
  for (let i = 1; i <= 60; i++) {
    await sinTramite.agregar([{
      tipo: 'IntentoVerificacionFallido', tramiteId: null, hiloId, canal: 'whatsapp', actor: 'paciente',
      nivelAuth: 0, version: 0, correlationId: ids.nuevo(), idempotencyKey: ids.nuevo(),
      ts: new Date(ahora + i * 1000).toISOString(),
      payload: { metodo: 'TELEFONO_FECHA_NAC', intentos: i },
    }]);
  }
  const alertas = await lecturas.alertasSeguridad();
  expect(alertas.map(alerta => alerta.intentos)).toEqual(Array.from({ length: 50 }, (_, i) => 60 - i));
  expect(alertas[0]).toEqual({
    id: expect.any(String), tipo: 'INTENTO_VERIFICACION_FALLIDO', canal: 'whatsapp',
    ts: new Date(ahora + 60_000).toISOString(), intentos: 60, bloqueado: true, hiloId,
  });
  return { a, b, c };
}
