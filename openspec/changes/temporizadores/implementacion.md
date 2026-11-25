# Implementación de temporizadores

Se aplicó la revisión 4 autorizada en `handoff.md` en la rama `feat/temporizadores` sobre `d7f7590`. Los cinco hashes iniciales coincidieron. Los cambios se entregan en el árbol de trabajo, sin commits.

## Comportamiento implementado

- El consumidor de Redis Streams reconcilia `HOLD`, `INASISTENCIA` e `INACTIVIDAD` con el estado persistido. BullMQ 5.81.6 usa `${tipo}-${tramiteId}` y el puerto conserva el identificador lógico `${tipo}:${tramiteId}`.
- Los trabajos vuelven a comprobar el estado y el reloj antes de aplicar la transición. BullMQ reprograma una ejecución anticipada y reintenta fallos hasta agotar tres intentos. El aviso final contiene código, tipo e ID del trámite.
- El reloj ajustable es compartido por la API. `POST /api/demo/reloj` promueve los trabajos que ya vencieron. Las operaciones sin efectos conservan la versión, la última actividad y el plazo, según la revisión 3.

**Progreso:** 15 de 15 tareas. En la revisión 4 se completaron 1.4, 1.6, 3.4 y 3.6.

## Aceptación y riesgo residual

- La prueba «Compensación imposible en la carrera» verifica que se intenta cancelar la cita externa, llega al canal el error original `HORARIO_NO_DISPONIBLE`, el trámite queda `LISTO_PARA_RESERVAR` y se registra una sola vez `COMPENSACION_AGENDA_FALLIDA` con `correlation_id` como único dato adicional. La posibilidad de un folio externo activo cuando la agenda rechaza la cancelación es el riesgo residual autorizado en la revisión 4. El caso con cancelación disponible comprueba que el folio queda inactivo.
- Con `corepack pnpm dev`, se apartó un horario ficticio en WhatsApp y se adelantó el reloj 11 minutos. En la primera pasada, Admin actualizó los contadores sin recarga y mostró `ReservaExpirada` en la línea de tiempo del hilo. En la repetición de la revisión 4, al enviar «Hola» en el mismo chat tras el POST, WhatsApp deshabilitó la confirmación anterior y volvió a mostrar «Selecciona horario» y «Ver opciones» sin error.
- Los controles 1.6 y 3.6 se ejecutaron sobre la revisión 4. Pasaron todas las pruebas existentes, con cero omisiones. Los escenarios de huecos de AGENTS.md §9 siguen fuera del alcance de temporizadores y carecen de pruebas en la batería actual.

## Archivos

- Se conservaron las modificaciones de 1.1 y 1.2 en dominio, `AgendaPort`, los adaptadores de agenda y `TramiteRepoPostgres`, con sus pruebas.
- Aplicación y memoria: `packages/application/src/{TemporizadoresTramite,RelojDemo,index}.ts`, `ports/{ProgramadorTemporizadores,Reloj}.ts`, `packages/adapters/memory/src/{ProgramadorMemoria,index}.ts`.
- BullMQ y HTTP: `packages/adapters/out-redis/src/ProgramadorBullMQ.ts`, `packages/adapters/in-events/src/WorkerTemporizadores.ts`, `packages/adapters/in-http/src/rutaRelojDemo.ts` y sus exportaciones. Los dos manifiestos de Redis y eventos fijan BullMQ, y el de eventos declara Zod con la versión ya usada en el repositorio. Se actualizó `pnpm-lock.yaml`.
- Composición: `apps/api/src/{main,componerComandos,crearApi,pruebas}.ts` y `apps/api/src/sistema/RelojAjustable.ts`.
- Evidencia: `tests/unit/persistencia/{bateriaProgramador,programador,temporizadores}.ts` (los dos últimos con sufijo `.test.ts`), `tests/unit/nucleo/casosTramite.test.ts`, `tests/unit/api/relojDemo.test.ts`, `tests/integracion/{temporizadoresBullMQ,comandosHttp}.test.ts`.
- Documentación y seguimiento: `docs/persistencia.md`, `tasks.md`, `implementacion.md`.

## Validaciones

| Control | Resultado | Evidencia |
|---|---|---|
| OpenSpec CLI 1.14.0 | BLOQUEADO | La llamada con `npx --offline` devolvió `ENOTCACHED`. Se siguieron el handoff y el seguimiento local. |
| Instalación con Corepack | PASS con configuración local | pnpm 11.25.0 advierte por el script nativo opcional de `msgpackr-extract`. La instalación ordinaria devolvió `ERR_PNPM_IGNORED_BUILDS`. Se usó `pnpm_config_strict_dep_builds=false` en la instalación y `pnpm_config_verify_deps_before_run=ignore` para ejecutar con las dependencias ya instaladas. La extensión nativa quedó sin compilar. Se retiró la entrada provisional que pnpm escribió en la configuración compartida. |
| `corepack pnpm lint` y `corepack pnpm lint:deps` | PASS | ESLint, TypeScript y 202 módulos sin violaciones de dependencias. |
| `corepack pnpm test` | PASS | 280 pruebas unitarias y web en 51 archivos. Incluye el escenario de compensación imposible de la revisión 4. |
| `corepack pnpm test:integracion` | PASS | 45 pruebas en 15 archivos. Incluye duplicados, reproceso tras confirmar y reinicio de worker y consumidor. Postgres en `127.0.0.1:55432` y Redis local. |
| Demo 3.4 | PASS | Admin mostró los contadores en vivo y `ReservaExpirada`. Tras repetir el adelanto en la revisión 4, WhatsApp ofreció horarios al siguiente mensaje. |

## Texto para el cambio compartido del README

Con la API en `DEMO_MODE=true`, aparta un horario y envía `POST /api/demo/reloj` con el cuerpo JSON `{"adelantarMinutos":11}`. La respuesta devuelve `ahora` en UTC. El hold de diez minutos vence y el trámite vuelve a `LISTO_PARA_RESERVAR`. Consulta `ReservaExpirada` en la línea de tiempo de Admin. Reiniciar la API restablece el desfase de demo.

