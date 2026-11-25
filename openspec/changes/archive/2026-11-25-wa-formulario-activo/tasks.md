# Tasks

Requisito: FA = `simulador-whatsapp` «Formulario y alternativa activos en la misma respuesta».

- [x] 1.1 En rojo: los tres escenarios de FA en la prueba de `ChatWa` o en `apps/web/src/vistas/wa.test.tsx`. Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.2 Corregir `ChatWa.tsx`: habilitado = la entrada pertenece a la última respuesta del bot (después de la última entrada del usuario) y no se está enviando. Verificación: 1.1 en verde y las pruebas existentes de `/wa` en verde (incluida «Opciones de mensajes anteriores»). [Evidencia](evidencias/02-verde.txt).
- [x] 1.3 Controles: `vitest run --project web` de los archivos tocados, `eslint` y `tsc --noEmit` de `apps/web`. Si el sandbox lo bloquea, anotarlo. [Vitest](evidencias/02-verde.txt), [ESLint](evidencias/03-eslint.txt) y [TypeScript](evidencias/04-tsc.txt).
