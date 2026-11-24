import { reiniciarDemo } from './reiniciarDemo.ts';
const modo = process.env['DEMO_MODE'];
if (modo !== 'true') {
  process.stderr.write('El reinicio requiere DEMO_MODE=true; no se abrió ninguna conexión.\n'); process.exitCode = 1;
} else {
  const url = process.env['DATABASE_URL'];
  if (!url) { process.stderr.write('Falta DATABASE_URL.\n'); process.exitCode = 1; }
  else {
    try { await reiniciarDemo(url, modo); process.stdout.write('Demo reiniciada: migración y semilla aplicadas.\n'); }
    catch { process.stderr.write('No se pudo reiniciar la demo. Comprueba PostgreSQL y DATABASE_URL.\n'); process.exitCode = 1; }
  }
}
