# Tasks

Requisito: LC = «Continuación tras llamada cortada» (delta de `canal-whatsapp`). Decisiones D1–D4.

- [x] 1.1 Pruebas en rojo de LC: botón en `/callcenter` (envía `SolicitarContinuacion` una sola vez), conversación WA con el mismo número (mensaje y retomado), otro número, un solo uso. `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1 en `CallCenter.tsx`.
- [x] 1.3 Implementar D2–D4 en el adaptador de WhatsApp (y la lectura en Postgres y memoria si hace falta).
- [x] 1.4 Punto de control: `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000`, `corepack pnpm exec eslint .`, `corepack pnpm -r exec tsc --noEmit` y `corepack pnpm lint:deps`; `evidencias/02-*.txt`.
