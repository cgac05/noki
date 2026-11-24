import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const variables = { ...loadEnv(mode, import.meta.dirname, ''), ...process.env };
  if (command === 'build' && mode === 'production' && !variables['VITE_API']) {
    throw new Error('Define VITE_API=mock o VITE_API=real antes de compilar producción.');
  }
  return {
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
  };
});
