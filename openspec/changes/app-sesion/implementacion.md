# Implementación de app-sesion

- **Resumen.** En modo demo, `/app` comparte con `/web` el formulario de teléfono y contraseña. Consulta las citas y se suscribe a la sala del paciente devuelto por `sesionWebDemo`. Conserva el estado, el QR y el flujo de cancelación. Un registro sin paciente o un 404 de sesión muestra enlaces a Web y WhatsApp. «Salir» desmonta el panel de citas y vuelve al formulario.
- **Revisión entregada.** Revisión 1, diff local sobre `8233ff3` y los cambios previos de `retoma-por-telefono` y `wa-formulario-activo`. Autorización en [handoff.md](handoff.md) y en la solicitud de esta sesión («revisión 1, autorizada»).
- **Archivos modificados.** En `apps/web/src/`, `componentes/SesionDemo.tsx`, `vistas/App.tsx`, `vistas/Web.tsx` y `cliente/mock/ClienteMock.ts`. Pruebas en `vistas/appSesion.test.tsx`, `vistas/cancelarCita.test.tsx`, `vistas/consolas.test.tsx`, `vistas/vistas.test.tsx`, `cliente/contexto.test.tsx` y `cliente/refrescoReal.test.tsx`, con el auxiliar `pruebas/entrarSesionDemo.ts`. En OpenSpec, [tasks.md](tasks.md), este informe y [las evidencias](evidencias/).
- **Tareas.** 1.1, 1.2 y 1.3 completas. OpenSpec devuelve `all_done` con 3 de 3 tareas.
- **Decisiones menores.** El cliente simulado reconoce a Beto con una cita propia y filtra citas por el ID pedido. El formulario conserva el teléfono al regresar y borra la contraseña al enviarlo. Si la revalidación recibe un 404, el aviso de registro ausente tiene prioridad sobre el resultado en caché. Fuera de demo, App indica la disponibilidad del modo demo.
- **Limitaciones.** La verificación de la interfaz se hizo con jsdom, con cliente simulado y cliente real con HTTP y Socket.IO de prueba. La comprobación manual quedó pendiente por la restricción de ejecutar sin servidores. Las dependencias del árbol original devolvieron `EPERM`. Los controles se ejecutaron en una copia temporal con el mismo lockfile y se verificaron por SHA-256 los 11 archivos de producto y pruebas del cambio contra esa copia. Allí esbuild devolvió «Access is denied» al cargar la configuración de Vitest, y el cargador nativo permitió ejecutar las suites con la configuración del repo.

| Validación | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1 · Rojo | `npx vitest run --configLoader native --project web --maxWorkers=2 apps/web/src/vistas/appSesion.test.tsx` | 9 fallos esperados antes de implementar | [Salida](evidencias/01-rojo.txt) |
| 1.2 y 1.3 · Vitest web | `npx vitest run --project web --maxWorkers=2 --configLoader native` | PASS · 247 pruebas en 29 archivos, incluidas 9 de sesión, 21 de Web y el recorrido del Flujo A | [Salida](evidencias/02-vitest.txt) |
| 1.3 · ESLint web | `npx eslint apps/web` | PASS | [Salida](evidencias/03-eslint.txt) |
| 1.3 · TypeScript web | `npx tsc --noEmit -p apps/web` | PASS | [Salida](evidencias/04-tsc.txt) |
| Lint del repositorio | `pnpm lint` | PASS con el ejecutable de pnpm habilitado en la copia temporal | [Salida](evidencias/05-lint-repo.txt) |
| Fronteras hexagonales | `pnpm lint:deps` | PASS · 259 módulos, 851 dependencias | [Salida](evidencias/06-deps-repo.txt) |
| Pruebas del repositorio | `pnpm test` y `npx vitest run --project unitarios --maxWorkers=2 --configLoader native` | El script exacto quedó BLOQUEADO al cargar la configuración de Vitest después de pasar TypeScript. Con el cargador nativo pasaron 297 pruebas unitarias en 53 archivos y las 247 pruebas web de arriba | [Salida](evidencias/07-test-repo.txt) |
| OpenSpec | `openspec validate app-sesion --strict --no-interactive` | PASS | `Change 'app-sesion' is valid` |

Pendiente de revisión independiente de Claude Code.
