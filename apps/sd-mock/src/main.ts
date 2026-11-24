import { crearSdMock } from './crearSdMock.ts';

const app = crearSdMock();
try { await app.listen({ host: '0.0.0.0', port: 4001 }); }
catch { app.log.error({ codigo: 'ARRANQUE_MOCK_FALLIDO' }, 'No se pudo iniciar el simulador.'); process.exitCode = 1; }
for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(senal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
}
