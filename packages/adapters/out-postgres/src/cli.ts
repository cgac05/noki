import { migrar } from './migrar.ts';

const url = process.env['DATABASE_URL'];
if (!url) {
  process.stderr.write('Falta DATABASE_URL en el entorno.\n');
  process.exitCode = 1;
} else {
  try {
    const aplicadas = await migrar(url);
    process.stdout.write(aplicadas.length ? 'Migraciones aplicadas: ' + aplicadas.join(', ') + '\n' : 'La base ya está actualizada; ninguna migración pendiente.\n');
  } catch {
    process.stderr.write('No se pudo migrar. Comprueba PostgreSQL y DATABASE_URL.\n');
    process.exitCode = 1;
  }
}
