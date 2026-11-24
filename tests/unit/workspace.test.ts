import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const leerManifiesto = (ruta: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(ruta, 'package.json'), 'utf8')) as Record<string, unknown>;

describe('base reproducible del workspace', () => {
  it('declara versiones de herramientas compatibles y pnpm exacto', () => {
    const raiz = leerManifiesto('.');
    expect(raiz['packageManager']).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    expect(raiz['engines']).toEqual({ node: '>=20' });
    expect(Number(readFileSync('.nvmrc', 'utf8').trim())).toBeGreaterThanOrEqual(20);
    expect(raiz['private']).toBe(true);
    expect(raiz['type']).toBe('module');
  });

  it('conserva el dominio sin dependencias y los contratos solo con zod', () => {
    expect(leerManifiesto('packages/domain')).not.toHaveProperty('dependencies');
    expect(Object.keys(leerManifiesto('packages/contracts')['dependencies'] as Record<string, unknown>)).toEqual(['zod']);
  });

  it('documenta todas las variables del proyecto sin versionar el entorno local', () => {
    const ejemplo = readFileSync('.env.example', 'utf8');
    for (const variable of ['DATABASE_URL', 'REDIS_URL', 'SD_MOCK_URL', 'TOKEN_SECRET', 'DEMO_MODE', 'PUBLIC_BASE_URL', 'LOG_LEVEL']) {
      expect(ejemplo).toContain(variable + '=');
    }
    expect(readFileSync('.gitignore', 'utf8').split(/\r?\n/)).toContain('.env');
  });
});
