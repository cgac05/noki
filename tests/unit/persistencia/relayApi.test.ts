import { expect, it, vi } from 'vitest';
import { iniciarRelay } from '../../../apps/api/src/iniciarRelay.ts';

it('espacia los fallos y avisa una sola vez hasta recuperarse', async () => {
  vi.useFakeTimers();
  const publicar = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
  const avisar = vi.fn();
  const detener = iniciarRelay(publicar, avisar);
  try {
    await vi.advanceTimersByTimeAsync(0);
    expect(publicar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(249);
    expect(publicar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 500 + 1000 + 2000 + 4000);
    expect(publicar).toHaveBeenCalledTimes(6);
    expect(avisar.mock.calls).toEqual([['RELAY_OUTBOX_FALLIDO']]);
    publicar.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(4999);
    expect(publicar).toHaveBeenCalledTimes(6);
    await vi.advanceTimersByTimeAsync(1 + 250);
    expect(publicar).toHaveBeenCalledTimes(8);
    expect(avisar.mock.calls).toEqual([['RELAY_OUTBOX_FALLIDO'], ['RELAY_OUTBOX_RECUPERADO']]);
  } finally {
    await detener();
    vi.useRealTimers();
  }
});
