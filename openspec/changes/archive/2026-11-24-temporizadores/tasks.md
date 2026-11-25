# Tasks

Cada grupo es un punto de control: al terminarlo, `pnpm lint && pnpm lint:deps && pnpm test && pnpm test:integracion` deben estar en verde (Postgres y Redis de `infra/docker-compose.yml`); registrar resultados reales en `implementacion.md`. Escribir primero la prueba de cada comportamiento (`AGENTS.md` §12.3). Los escenarios citados son los de `specs/temporizadores-tramite/spec.md` y `specs/reloj-demo/spec.md`.

## 1. Dominio, puertos y memoria

- [x] 1.1 Agregar `Tramite.ultimaActividad` (se fija en `anotar`, forma parte de la instantánea) y `inactividadHoras` obligatorio en `DefinicionTipoTramite`, con 24 en `AGENDAR` (design D4, D7). Hidratar `ultimaActividad` desde la columna `ultima_actividad` en `TramiteRepoPostgres` cuando la instantánea no la tenga. Verificar con pruebas unitarias de dominio y con la batería de repositorios existente en memoria y Postgres.
- [x] 1.2 Agregar `AgendaPort.expirar(reservaId)` en memoria y Postgres (design D7): solo `APARTADA` → `EXPIRADA`, idempotente. Verificar con la batería de agenda en ambos adaptadores, incluido que una reserva `CONFIRMADA` no cambia.
- [x] 1.3 Definir en `application` `ProgramadorTemporizadores`, `Temporizador`, `RelojAjustable` (design D1, D6) y `ProgramadorMemoria` en `adapters/memory` con `vencidos(ahora)`. Verificar con una batería del puerto que luego correrá también contra BullMQ (2.1): programar reemplaza, programar con los mismos datos no duplica, cancelar, `adelantarVencidos` solo toma los vencidos.
- [x] 1.4 Implementar `TemporizadoresTramite` en `application` con `reconciliar(tramiteId)` (tabla de D3) y `ejecutar(temporizador)` (D4: `APLICADO`, `SIN_EFECTO`, `REPROGRAMAR`), con contexto `sistema` de D4. Verificar con memoria y `RelojFalso` todos los escenarios de los requisitos "Programación desde los eventos publicados", "Vencimiento automático del hold", "Inasistencia tras la tolerancia" y "Expiración por inactividad", más "Trámite borrado por el reinicio de la demo" y la carrera confirmar contra `HOLD` (`ConflictoVersion`).
- [x] 1.5 Implementar `RelojDemo.adelantar(minutos)` (design D6). Verificar "Hold vencido al adelantar" y "Trabajo aún en el futuro" con memoria.
- [x] 1.6 Punto de control 1: los cuatro controles en verde; registrar en `implementacion.md`.

## 2. BullMQ

- [x] 2.1 Agregar `bullmq` con versión exacta a `out-redis` y `in-events`; implementar `ProgramadorBullMQ` (design D1, D2) con `jobId` `${tipo}-${tramiteId}` para el identificador lógico `${tipo}:${tramiteId}` (revisión 2) y pasarle la batería de 1.3 contra el Redis de integración, incluido el reemplazo de un trabajo activo y una comprobación de que el trabajo `HOLD` de un UUID real se crea sin error y se encuentra por su `jobId`.
- [x] 2.2 Implementar `WorkerTemporizadores` en `in-events` (design D2, D5): valida `job.data` con Zod, `REPROGRAMAR` con `moveToDelayed` sin gastar intentos, 3 intentos con espera exponencial y registro `TEMPORIZADOR_FALLIDO` sin datos personales. Verificar con integración: un trabajo vencido se ejecuta, uno reprogramado no se ejecuta antes, y "Fallo persistente" (log sin datos personales).
- [x] 2.3 Punto de control 2: los cuatro controles en verde; registrar en `implementacion.md`.

## 3. Composición, consumidor y endpoint de demo

- [x] 3.1 Sustituir `RelojSistema` por `RelojAjustable` en `apps/api` (desfase siempre 0 fuera de `DEMO_MODE=true`) y compartir una sola instancia (design D6). Componer en `main.ts` la cola, el worker y el consumidor del grupo `temporizadores` sobre `ConsumidorStreams`, y cerrarlos en orden en `cerrar()` (design D2, D3). Agregar el equivalente en memoria a `@noki/api/pruebas`. Verificar "Evento repetido" y "Evento antiguo reprocesado" con el consumidor real en integración.
- [x] 3.2 Agregar `POST /api/demo/reloj` en `in-http` con Zod local (design D6). Verificar "Adelanto válido", "Cuerpo inválido" y "Fuera de modo demo".
- [x] 3.3 Prueba de integración de punta a punta con la API compuesta (design D8): apartar, adelantar 11 min y comprobar en menos de 5 s el trámite, `ReservaExpirada` con actor `sistema` en el event store y la reserva `EXPIRADA`; y "Hold que vence con la API apagada" deteniendo y volviendo a crear el worker y el consumidor. Verificar también "Reinicio de la API con el reloj adelantado" (unitaria o de integración).
- [x] 3.4 Prueba manual con `pnpm dev`: en `/callcenter` o `/wa` apartar un horario, `POST /api/demo/reloj` con `{ "adelantarMinutos": 11 }` (curl o PowerShell) y comprobar que `/admin` actualiza el estado sin recargar y muestra `ReservaExpirada` en la línea de tiempo del hilo. En `/wa` el chat no cambia solo (no hay aviso proactivo, ver proposal "Fuera de alcance"); comprobar en cambio que al siguiente mensaje del paciente el bot vuelve a ofrecer horarios sin error (revisión 4). Registrar los pasos y el resultado, sin datos personales.
- [x] 3.5 Actualizar `docs/persistencia.md` con el estado `EXPIRADA` que ahora escribe el temporizador y con los trabajos `HOLD`, `INASISTENCIA` e `INACTIVIDAD`. No tocar `README.md` (lo usan ambos frentes): dejar en `implementacion.md` el texto propuesto para explicar cómo adelantar el reloj, para el cambio compartido posterior.
- [x] 3.6 Punto de control 3: los cuatro controles en verde y las pruebas obligatorias de `AGENTS.md` §9 sin `skip`; registrar en `implementacion.md`.
