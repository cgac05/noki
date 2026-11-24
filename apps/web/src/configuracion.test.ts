// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { loadEnv } from 'vite';
import config from '../vite.config.ts';
vi.mock('vite', async importar => ({ ...await importar<typeof import('vite')>(), loadEnv: vi.fn(() => ({})) }));

it('Producción sin modo explícito: exige VITE_API y conserva el valor por defecto en desarrollo', async () => {
  vi.stubEnv('VITE_API', undefined);
  try {
    expect(typeof config).toBe('function');
    if (typeof config !== 'function') throw new Error('La configuración debe comprobar el modo al compilar');
    const configurar = config;
    expect(() => configurar({ command: 'build', mode: 'production' })).toThrow(/VITE_API.*mock.*real/);
    expect(() => configurar({ command: 'serve', mode: 'development' })).not.toThrow();
    for (const modo of ['mock', 'real']) { vi.stubEnv('VITE_API', modo); expect(() => configurar({ command: 'build', mode: 'production' })).not.toThrow(); }
    vi.stubEnv('VITE_API', undefined); vi.mocked(loadEnv).mockReturnValue({ VITE_API: 'mock' });
    expect(() => configurar({ command: 'build', mode: 'production' })).not.toThrow();
  } finally { vi.unstubAllEnvs(); vi.mocked(loadEnv).mockReturnValue({}); }
});

it('Sin referer: la política no-referrer está en el documento de toda la aplicación', () => {
  expect(readFileSync(new URL('../index.html', import.meta.url), 'utf8')).toMatch(/<meta\s+name="referrer"\s+content="no-referrer"\s*\/>/);
});
