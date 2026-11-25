# Implementación de callcenter-nueva-cita

- **Revisión entregada**. Revisión 2 autorizada en [handoff.md](handoff.md), sobre `371bc39` con cambios locales. Esta entrega incorpora H-01 a H-05 de la vuelta 1 de [revision.md](revision.md), según el pedido de corrección en el chat.
- **Comportamiento**. El asesor puede conservar el estudio retomado o iniciar otra cita con el ANI de la llamada. La cita nueva hereda el paciente asignado del estudio que se habría retomado y el asesor la cotiza desde la ficha. El asistente queda disponible al salir de `BORRADOR`. La ficha usa la consulta de demo para mostrar la fecha de nacimiento y aplica la casilla de validación a las acciones indicadas en D4.
- **Decisiones menores**. La creación y la asignación se guardan en la misma escritura del agregado y el outbox. El segundo evento usa el sufijo de clave `:2`. La confirmación del asesor se conserva dentro de la llamada si se heredó el paciente y coincide la fecha. La consulta usa la misma selección de trámite abierto que la ficha. La consola decide si puede abrir el asistente a partir del estado del trámite nuevo seleccionado, aunque el hilo también contenga el estudio previo.
- **Tareas**. Las seis casillas tienen evidencia de ejecución. OpenSpec informa 6 de 6 completas.
- **Límite de la comprobación**. La prueba web verifica la cotización y la apertura del asistente con el ANI. El asistente sigue la regla de continuidad por teléfono aprobada en D3. La revisión manual de `/callcenter` queda pendiente porque esta sesión se ejecutó sin levantar servidores.

## Correcciones de la vuelta 1

| Hallazgo | Corrección y evidencia |
|---|---|
| H-01 | `cliente.test.ts` excluye `fechaNacimientoLlamada` de las tablas de consultas que usan las lecturas de los guiones. Las pruebas de consola y de consultas cubren su contrato. |
| H-02 | `rutasComandos.test.ts` verifica la nueva firma de `iniciar` con la bandera ausente, y conserva las comprobaciones del contacto, servicio y sede. |
| H-03 | `consolas.test.tsx` espera que las acciones de retoma estén habilitadas, comprueba que «Nueva cita» se envíe una sola vez y verifica que la ficha pase al trámite nuevo. |
| H-04 | `identidadAsesor.test.tsx` responde con el esquema de la ruta de fecha de nacimiento. Así el reintento de identidad es el único que muestra la prueba de error de red. |
| H-05 | `CallCenter.tsx` oculta «Completar la cita aquí» durante `BORRADOR` y deja cotizar el trámite nuevo. La prueba comprueba la ausencia del botón y luego cotiza servicio y sede con el ID nuevo, comprueba que el botón aparezca y abre el asistente con el ANI. |
| Integración | `llamadaRetomaTramite.test.ts` registra las rutas de consultas al componer la API inyectada. La prueba comprueba la fecha de nacimiento del paciente heredado contra Postgres. |

## Archivos modificados

- `packages/contracts/src/{comandos,consultas}.ts` y `docs/contratos.md`.
- `packages/application/src/CasosTramite.ts` y `packages/application/src/ports/lecturas.ts`.
- `packages/adapters/in-http/src/{rutasComandos,rutasConsultas}.ts`, `packages/adapters/in-http/test/rutasComandos.test.ts`, `packages/adapters/memory/src/LecturasMemoria.ts` y `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts`.
- `apps/web/src/vistas/{CallCenter,consolas.test,identidadAsesor.test}.tsx`, `apps/web/src/cliente/cliente.test.ts` y `apps/web/src/cliente/mock/{ClienteMock,guionFlujoA}.ts`.
- `tests/unit/{contratos,consultas,nucleo/casosTramite,api/sesionWebMemoria}.test.ts` y `tests/integracion/llamadaRetomaTramite.test.ts`.
- `tasks.md`, este informe y los registros de `evidencias/`.

## Validaciones de la vuelta 1

Los controles se ejecutaron en una copia temporal del código local. El ejecutable de Vitest del repositorio devolvió `EPERM`. En la copia, el cargador predeterminado falló con «Access is denied» al resolver `vitest.config.ts`. El cargador `runner` permitió ejecutar las mismas suites. Se reutilizaron Postgres y Redis ya disponibles para la integración.

| Control | Resultado |
|---|---|
| `npx vitest run --configLoader runner --project unitarios --project web --maxWorkers=2` | PASS. 593 pruebas en 87 archivos. |
| `corepack pnpm -r exec tsc --noEmit` | PASS. Código de salida 0. |
| `npx tsc --project tests/tsconfig.json` | PASS. Código de salida 0. |
| `npx eslint .` | PASS. Código de salida 0. |
| `npx depcruise --config .dependency-cruiser.cjs packages apps` | PASS. 268 módulos, 879 dependencias y cero violaciones. |
| `npx vitest run --configLoader runner --project integracion tests/integracion/llamadaRetomaTramite.test.ts` | PASS. Una prueba contra `noki_test`. |
| `pnpm lint`, `pnpm lint:deps` y `pnpm test --configLoader runner --maxWorkers=2` | PASS. Los tres scripts terminaron con código 0. |
| `git diff --check` | PASS. Código de salida 0. |
| `openspec validate callcenter-nueva-cita --type change --strict --no-interactive` | PASS. Cambio válido. |

[Resultados y reproducción de los fallos](evidencias/05-vuelta-1.txt)
