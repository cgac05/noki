# Tasks

Requisito: IW = «Identificación del paciente en la web» (delta de `navegacion-canales`). Decisiones D1–D4.

- [x] 1.1 Pruebas en rojo de IW con el cliente real y `fetch` falso (teléfono, fecha, CURP, sin CURP con selectores, sin teléfono) y prueba de que `/callcenter` sigue enviando canal `callcenter`. `evidencias/01-rojo.txt` registra el intento bloqueado por EPERM; queda pendiente confirmar el rojo.
- [x] - [ ] 1.2 Implementar D1–D4.
- [x] - [ ] 1.3 Punto de control: `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000`, `corepack pnpm exec eslint .`, `corepack pnpm -r exec tsc --noEmit` y `corepack pnpm lint:deps`; `evidencias/02-*.txt`.

## Revisión 2 (sustituida por la revisión 3; no hacer)

- [ ] 2.1 Pruebas en rojo de D5 (unitarias del adaptador HTTP con la API de pruebas: web+paciente en demo pasa; con demo falso sigue `STEP_UP_REQUERIDO`; otros canales sin cambio) y de D6 (orden web en el dominio). `evidencias/03-rojo.txt`.
- [ ] 2.2 Implementar D5 y D6.
- [ ] 2.3 Pruebas e implementación de D7–D8 en `/web` (explorar y cotizar varios, «Volver», agendar uno, identificar, continuar). Completar 1.2.
- [ ] 2.4 Punto de control de 1.3.

## Revisión 3

- [x] 3.1 Pruebas en rojo de D9–D12 en `webReal.test.tsx` (teléfono inválido sin consultas; con contexto muestra la cita y su precio; pagar → confirmar → recibo simulado; «Volver» en cada paso; sin paciente, mensaje y enlaces; modo simulado sin cambios). `evidencias/04-rojo.txt` registra EPERM antes de cargar las pruebas.
- [x] 3.2 Implementar D9–D12 solo en `apps/web`. Quitar o ajustar las pruebas de 1.1 que ya no aplican (identificación completa en web), anotándolo.
- [x] 3.3 Punto de control de 1.3 intentado. Los controles quedaron bloqueados por EPERM. Resultados en `implementacion.md`.
- [x] 3.4 Implementar D13 y cubrir el pago con QR de CoDi por clic, Enter y Espacio, y «Volver» sin pagar. Ejecución bloqueada por EPERM, documentada en `implementacion.md`.
