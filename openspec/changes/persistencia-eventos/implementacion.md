# Implementación: persistencia-eventos

- Alcance: revisión 3 autorizada en el handoff.
- Grupo 1: migración incremental, instantánea JSON y repositorios Postgres para trámites, hilos, contactos, pacientes y catálogo.
- Archivos: migración 002, repositorios y migrador de out-postgres, instantánea e identificador del dominio, pruebas de persistencia unitarias y de integración.
- Decisión de implementación: el adaptador de contactos establece el hilo asociado en una transacción para resolver las referencias cruzadas; reutiliza el hilo legado si existe.
- Entorno: Postgres de pruebas aislado en el puerto 55432 y Redis local. El lanzador de integración solo reinició el esquema de noki_test en el Postgres aislado.

| Validación | Resultado real |
|---|---|
| `git diff --exit-code main -- infra/migraciones/001_nucleo.sql` | PASS, sin diferencias. |
| Punto de control 1.5, `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 0 violaciones, 109 pruebas. |
| Punto de control 1.5, `pnpm test:integracion` | PASS, 22 pruebas. Incluye aplicación sobre semilla, claves con sufijo, rollback, concurrencia y batería de puertos. |
| Punto de control 2.4, `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 0 violaciones, 110 pruebas. |
| Punto de control 2.4, `pnpm test:integracion` | PASS, 23 pruebas. Incluye tres intentos concurrentes, bloqueo y sus tres eventos en el outbox. |

## Intentos y continuidad

- El contador solo devuelve intentos y bloqueo. El resolvedor construye y persiste el evento por `EventosSinTramite`. Un folio válido sin fecha recibe la misma respuesta sin que se consulte el folio.
- `tests/unit/nucleo/adaptadores.test.ts` conserva las verificaciones del conteo y de los 15 minutos de bloqueo. La comprobación de los tres eventos se ejecuta en `tests/unit/nucleo/casosTramite.test.ts` por el nuevo puerto y verifica el valor de los tres contadores. `tests/unit/persistencia/folios.test.ts` comprueba que el evento no contiene folio ni fecha.
- Para el grupo 3 queda pendiente resolver la secuencia de la confirmación: 3.1 retira la generación de folio de AgendaPort, pero el reemplazo que requiere CasosTramite llega en 4.2 y 4.3, después del control 3.3.

## Reservas y agenda simulada

- Punto conjunto 3.3 y 4.4, revisión 4: `pnpm lint && pnpm lint:deps && pnpm test` PASS, 113 pruebas y cero violaciones. `pnpm test:integracion` PASS, 27 pruebas en la instancia aislada.
- 3.1 y 3.2: horario ocupado en memoria, confirmación idempotente con el mismo folio, 50 solicitudes concurrentes con un solo ganador en PostgreSQL, vencimiento y reasignación del hold. La primera ejecución concurrente agotó la espera del pool; con 5 s pasó sin modificar el caso de prueba.
- 4.1 y 4.2: registro idempotente, entrada inválida, fallo 100 %, latencia de 300 ms, recuperación al tercer intento y agotamiento de intentos. Se agregó únicamente Zod 4.1.13 al manifiesto de sd-mock y se regeneró el lockfile.
- 4.3: confirmación, hold vencido sin llamadas a la agenda externa, conflicto con compensación, confirmaciones paralelas y agenda caída. La suite también probó confirmación y compensación con Postgres y sd-mock.
- Pruebas adaptadas: `adaptadores.test.ts` verifica el folio emitido por la agenda externa y su aceptación por la local. `casosTramite.test.ts` inyecta el nuevo puerto, mantiene las comprobaciones existentes y agrega hold vencido y compensación.

## Publicación y consumo

- 5.1: los adaptadores en memoria verifican orden, fallo genérico, conservación de filas pendientes y exclusión de particiones tomadas.
- 5.2: Postgres y Redis verifican publicación ordenada, dos relays con pools distintos, republicación después de publicar sin marcar, recuperación después de cerrar la sesión con el bloqueo y almacenamiento del fallo sin payload ni URL.
- 5.3: Redis y Postgres verifican reinicio, deduplicación, grupos independientes y cola de fallidos al tercer intento. Se agregó ioredis 5.8.2 a in-events y se regeneró el lockfile.
- 5.4: con `pnpm dev`, Postgres aislado `noki_test` y Redis DB 13, se guardó un trámite ficticio con `TramiteRepoPostgres.guardar`. `redis-cli -n 13 --raw XRANGE eventos:0 - +` devolvió una entrada `TramiteIniciado` con la clave `043cb935-3c9e-4663-9817-16a587d6004b` y payload `{"tipoTramite":"AGENDAR"}`. Los logs observados no incluyeron datos personales. Se detuvo el proceso de desarrollo.
- 5.5: `docs/persistencia.md` documenta la migración, el contrato de publicación y consumo, las reglas de agenda, la configuración de sd-mock y la integración pendiente de api-comandos.

| Validación final sobre el árbol de trabajo | Resultado real |
|---|---|
| `pnpm install` | PASS usando pnpm 11.25.0. |
| `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 0 violaciones y 114 pruebas. |
| `pnpm test:integracion` | PASS, 30 pruebas. |
| `pnpm exec vitest run --project unitarios tests/unit/nucleo tests/unit/persistencia --pool=threads --no-isolate --maxWorkers=1` | PASS, 53 pruebas, duración total de 1.77 s. |
| `openspec validate persistencia-eventos --type change --strict --no-interactive` | PASS. |
| 5.6 desde un checkout limpio | PASS en `b59cdaed83d759cf15ab13ed9e2e7ba3731db755`. Detalle en la evidencia de 5.6. |

La entrega local parte de la rama feat/persistencia-eventos y de los artefactos de la revisión 4. Los cambios de producto abarcan la migración 002, el agregado y los puertos de dominio y aplicación, los adaptadores de memoria, Postgres, Redis, agenda externa y consumidor, el arranque del relay en API y la agenda de sd-mock. Las dependencias añadidas son Zod 4.1.13 para sd-mock e ioredis 5.8.2 para in-events. La evidencia de 5.6 queda disponible para la revisión independiente.

Contratos para api-comandos: `SolicitudReserva.recursoId` es opcional, `AgendaPort.confirmar` recibe el folio externo, `AgendaExternaPort` registra y cancela citas, y `RegistroIntentos` solo cuenta y bloquea. Conectar los casos de uso a los repositorios Postgres y el cliente con `SD_MOCK_URL`, y traducir `HORARIO_NO_DISPONIBLE` y `AGENDA_NO_DISPONIBLE` a HTTP 422. Los consumidores de negocio usarán `ConsumidorStreams` y `RegistroProcesadosPostgres`.

## Evidencia de la tarea 5.6 y del hallazgo H-01

Se validó el commit `b59cdaed83d759cf15ab13ed9e2e7ba3731db755` en un worktree separado, creado fuera del repositorio con `git worktree add --detach`. `git status --porcelain` quedó vacío antes y después de los controles. La integración usó Postgres aislado en `55432` con `noki_test` y Redis local.

| Comando | Salida registrada |
|---|---|
| `pnpm install` | 14 proyectos, 371 paquetes instalados, lockfile vigente, `Done in 4.1s using pnpm v11.25.0`. |
| `pnpm lint` | `eslint . && pnpm typecheck` y `pnpm -r exec tsc --noEmit && tsc --project tests/tsconfig.json` terminaron con código 0. |
| `pnpm lint:deps` | `no dependency violations found (138 modules, 327 dependencies cruised)`. |
| `pnpm test` | Vitest 4.0.14, 24 archivos y 114 pruebas aprobados, duración 6.97 s. |
| `pnpm test:integracion` | 11 archivos y 30 pruebas aprobados en 19.07 s. La prueba de 50 solicitudes concurrentes obtuvo un solo ganador. |
| `pnpm exec vitest run --project unitarios tests/unit/nucleo tests/unit/persistencia --pool=threads --no-isolate --maxWorkers=1` | 14 archivos y 53 pruebas aprobados en 1.15 s. |
