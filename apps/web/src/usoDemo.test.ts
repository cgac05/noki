// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('el README documenta el enlace, la captura protegida y el borrado de la sesión', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const texto of ['?continuar=', 'Nueva conversación', 'sessionStorage', 'Modo simulado', 'Enviar formulario', 'mensajes iniciados por la empresa']) expect(readme).toContain(texto);
  expect(readme).not.toContain('ConversacionVista');
});

it('cada ejemplo de build del README elige un modo explícito y reproducible', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const ejemplos = [...readme.matchAll(/```powershell\s*([\s\S]*?)```/g)].map(coincidencia => coincidencia[1]!);
  const builds = ejemplos.filter(ejemplo => ejemplo.includes('pnpm --filter @noki/web build'));
  expect(builds.length).toBeGreaterThan(0);
  for (const ejemplo of builds) expect(ejemplo).toMatch(/\$env:VITE_API\s*=\s*'(mock|real)'/);
});
