import { expect, it } from 'vitest';
import { HiloAtencion } from '../../../packages/domain/src/index.ts';
import type { HiloId } from '../../../packages/domain/src/index.ts';

it('registra un cambio de canal al retomar un hilo y evita duplicarlo en el mismo canal', () => {
  const hilo = new HiloAtencion('hilo' as HiloId, 'contacto', 'callcenter');
  expect(hilo.retomar('whatsapp', 'TOKEN_CC')).toEqual({ de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC' });
  expect(hilo.ultimoCanal).toBe('whatsapp');
  expect(hilo.retomar('whatsapp', 'TOKEN_CC')).toBeUndefined();
});
