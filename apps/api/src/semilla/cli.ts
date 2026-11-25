import { sembrar } from './sembrar.ts';
const url = process.env['DATABASE_URL'];
if (!url) { process.stderr.write('Falta DATABASE_URL.\n'); process.exitCode = 1; }
else {
  try { await sembrar(url); process.stdout.write('Semilla de demo lista: 3 sedes, 4 servicios, 3 pacientes y 3 usuarios internos.\n'); }
  catch { process.stderr.write('No se pudo sembrar la base. Comprueba PostgreSQL y ejecuta pnpm db:migrate.\n'); process.exitCode = 1; }
}
