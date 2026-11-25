# Tasks

Requisito: HM = `simulador-whatsapp` «Hora de envío en cada mensaje».

- [x] 1.1 En rojo: los cuatro escenarios de HM (con reloj falso de Vitest) en `historialWa.test.tsx` o `wa.test.tsx`. Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar: `enviadoEn` opcional en `EntradaSchema`, asignado al crear entradas del usuario y del bot (no al reintentar); la hora en `ChatWa.tsx` con un `<time dateTime>` accesible; estilo en `styles.css` coherente con la identidad visual vigente. Verificación: 1.1 en verde y las pruebas de `/wa`, `flow` y asistentes en verde.
- [x] 1.3 Controles en serie: `vitest run --project web --maxWorkers=2`, `eslint` y `tsc --noEmit` de `apps/web`. Si el sandbox lo bloquea, anotarlo: el revisor los corre.
