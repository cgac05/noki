# Revisión: contratos-flujo-a

## Resumen y veredicto

- **Veredicto: PASS** (tercera verificación, 2026-11-24). H-01 resuelto por Codex; H-02 y H-03 quedan como sugerencias opcionales. Las verificaciones anteriores (FAIL por H-01) se conservan abajo.
- Revisión inspeccionada: rama `feat/contratos-flujo-a` en `3476dfe` (worktree `noki-contratos`) más el diff sin commit: 15 archivos modificados (+134/−32) y `implementacion.md` sin seguimiento. `git diff --stat main...HEAD` solo contiene los artefactos de planificación (6 archivos de `openspec/changes/contratos-flujo-a/`); todo el código está en el árbol de trabajo, sin commit.
- Artefactos leídos: `proposal.md`, `handoff.md`, `tasks.md`, `specs/contratos-canales/spec.md`, `specs/contratos-consultas/spec.md`, `implementacion.md`. No hay `design.md` (el handoff lo justifica: decisiones de forma del contrato en la propuesta y en `api-comandos/design.md` D12).
- Cambios en artefactos de planificación: `handoff.md` solo registra los dos vistos buenos y `tasks.md` solo marca las casillas; los textos de la revisión 2 autorizada no cambian.

## Tareas 1.1–2.3

| Tarea | Estado | Evidencia comprobada por Claude |
|---|---|---|
| 1.1 | Cumple | `comandos.ts`: `contacto` con `/^\d{10,15}$/` opcional en `IniciarTramite`; `SolicitarContinuacion` con `tramiteId: z.uuidv7()` obligatorio y `destino: z.literal('whatsapp')`; `horario?` `{ reservaId, inicio, expiraEn? }` y `refine` que rechaza `expiraEn` fuera de `HORARIO_RESERVADO`. Pruebas en `tests/unit/contratos.test.ts` (contacto `55-1234` rechazado, continuación sin trámite rechazada, destino `web` rechazado, vista con y sin `horario`, confirmada sin `expiraEn` válida y con `expiraEn` inválida). |
| 1.2 | Cumple | `CodigoErrorSchema` incluye `INTERNO`; `MAPEO_ERRORES_HTTP` agrega `INTERNO: 500` con `satisfies Record<… \| 'INTERNO', number>`; `coherencia.test.ts` exige el mapeo exacto, el tipo de claves y `Object.keys(MAPEO_ERRORES_HTTP)` igual a `CodigoErrorSchema.options`. |
| 1.3 | Cumple | `tiempoReal.ts`: `EVENTOS_CLIENTE_SOCKET` (`sala:unirse`, `sala:salir`) y `ESQUEMAS_EVENTOS_CLIENTE_SOCKET` con `SalaSchema`; la prueba rechaza `tramite:123` y acepta `tramite:<uuidv7>` y `admin`. Ver H-02 (sugerencia). |
| 1.4 | Cumple | `FichaHiloSchema`: `nombrePila` y `telefonoEnmascarado` `.nullable()` conservando `min(1)` y la máscara; `ContextoDemoSchema` con tres UUID v7 nullables; entrada `contextoDemo` en `RUTAS_CONSULTAS` con `soloDemo: true`. Pruebas en `tests/unit/consultas.test.ts` (ficha anónima, contexto con `pacienteId` nulo, campo extra descartado, 10 rutas, `ContextoDemoSchema` incluido en el barrido de campos sensibles). |
| 1.5 | Cumple | Registrado por Codex (146 pruebas); el estado final lo confirma la ejecución de Claude (abajo). |
| 2.1 | Cumple | Ver "Alcance de `apps/web`": tres archivos, todos dentro de lo autorizado; pruebas `web` en verde y build correcto. |
| 2.2 | Cumple (tras corregir H-01) | `docs/contratos.md` coincide con el código (contacto, `SolicitarContinuacion`, `horario`, ficha nullable, `INTERNO`, eventos del cliente, `contextoDemo`, siete claves KPI). `AGENTS.md` §7 (líneas 181, 196 y 212) nombra `SolicitarContinuacion`, `tramiteId`, `/api/demo/contexto`, `sala:unirse`, `sala:salir`, `EVENTOS_CLIENTE_SOCKET` y `SalaSchema` igual que el código. |
| 2.3 | Cumple | `pnpm lint`, `pnpm lint:deps` y `pnpm test` en verde (abajo); `packages/contracts` depende solo de `zod`. |

## Cobertura de specs

| Requisito (spec) | Escenarios | Resultado |
|---|---|---|
| Comando y respuesta comunes a todos los canales (`contratos-canales`) | Payload ligado al comando; Comando válido; Contacto mal formado; Continuación sin trámite; Vista con reserva; Cita confirmada sin vencimiento | 6/6 con prueba. Además, una confirmada con `expiraEn` se rechaza (cumple el MUST NOT). |
| Tiempo real con nombres compartidos (`contratos-canales`) | Sala mal formada; Evento desconocido; Unirse a una sala inválida | 3/3 (los dos primeros, pruebas existentes). |
| Errores de dominio traducidos a HTTP (`contratos-canales`) | Mapeo completo; Códigos esperados; Sin detalles internos | 3/3. |
| Lecturas sin datos sensibles (`contratos-consultas`) | Teléfono completo rechazado; Campos sensibles ausentes; Ficha de un hilo anónimo | 3/3. |
| Tabla de rutas de consulta (`contratos-consultas`) | Ruta construida; Parámetro inválido; Rutas existentes conservadas; Bandeja marcada como demo; Contexto de demo; Contexto fuera de modo demo | 5/6 aquí. "Contexto fuera de modo demo" (404 sin `DEMO_MODE=true`) es del lado del servidor y, según `tasks.md` 1.4, lo verifica el grupo 7 de `api-comandos`: **no aplicable** a este cambio, pendiente allí. |

El dato `contacto` solo existe en el payload del comando; ningún esquema de lectura lo declara.

## Resultados de los comandos

Ejecutados por Claude en `noki-contratos` el 2026-11-24, en este orden, con `corepack pnpm` (pnpm no está en el PATH de esta máquina).

| Comando | Resultado | Salida relevante |
|---|---|---|
| `pnpm lint` | **PASS** (código 0) | `eslint .` y `pnpm typecheck` (`pnpm -r exec tsc --noEmit && tsc --project tests/tsconfig.json`) sin errores. Nota: el primer intento terminó con código 1 porque el script anidado `pnpm typecheck` no encontró `pnpm` en el PATH ("no se reconoce como un comando interno o externo"), después de que ESLint pasara; se repitió con un shim temporal `pnpm → corepack pnpm` en el scratchpad y pasó. Es un problema del entorno, no del cambio. |
| `pnpm lint:deps` | **PASS** (código 0) | `✔ no dependency violations found (140 modules, 344 dependencies cruised)` |
| `pnpm test` | **PASS** (código 0) | `Test Files 25 passed (25)`, `Tests 147 passed (147)`, incluido el proyecto `web` (`vistas.test.tsx`, 15 pruebas). |
| `pnpm --filter @noki/web build` | **PASS** (código 0) | `241 modules transformed`, `dist/assets/index-*.js 433.48 kB`. Solo avisos conocidos de directivas `"use client"` ignoradas en `@tanstack/react-query`. `dist/` está ignorado por git. |

No ejecutado por Claude: `openspec validate --strict` (CLI no instalado aquí; Codex lo registra como PASS con `npx --offline`) y la inspección manual en navegador (bloqueada según Codex; el único cambio visible es el guion para nulos, cubierto por prueba).

## Alcance de `apps/web` (tarea 2.1)

| Archivo | Cambio | ¿Encaja? |
|---|---|---|
| `apps/web/src/cliente/mock/guionFlujoA.ts` | Agrega `contextoDemo` a las lecturas simuladas: ids de demo (`IDS.hilo`, `IDS.paciente`, `IDS.sede`) cuando hay cita, tres `null` antes. | Sí: "datos simulados de `contextoDemo` (desde los ids de la demo)". |
| `apps/web/src/vistas/CallCenter.tsx` | `nombrePila ?? '—'` y `telefonoEnmascarado ?? '—'`; nada más. | Sí: "tolerancia a `null` en las vistas que muestran nombre o teléfono". No inventa valores. |
| `apps/web/src/vistas/vistas.test.tsx` | Prueba nueva: una ficha con ambos nulos muestra dos `—` y no muestra `Ana` ni `•••• 0001`. Ninguna prueba existente cambia. | Sí: verificación de 2.1; las pruebas existentes se conservan sin debilitarse. |

No hay otros archivos tocados en `apps/web`. `CallCenter.tsx` es la única vista que lee `nombrePila` o `telefonoEnmascarado` (`grep` sobre `apps` y `packages`). Coincide con el visto bueno del frente B ("limitada a los datos simulados de contextoDemo y a tolerar null en la ficha").

## Dependencias de `packages/contracts`

- `packages/contracts/package.json`: `dependencies` contiene solo `"zod": "4.1.13"`; no hay otras secciones de dependencias.
- Importaciones en `packages/contracts/src`: únicamente `zod` y módulos relativos del propio paquete (`./vocabulario.ts`, `./comandos.ts`, `./siguientePregunta.ts`, `./mensajesBot.ts`, `./whatsapp.ts`, `./tiempoReal.ts`, `./errores.ts`, `./consultas.ts`). `index.ts` reexporta los ocho módulos con `export *`, así que los símbolos nuevos quedan publicados sin tocar `index.ts`.

## Archivos fuera de alcance

Ninguno. Los 15 archivos modificados están en la lista de restricciones de `handoff.md` (contratos, pruebas de contratos, `in-http`, `apps/web` según 2.1, `docs/contratos.md`, `AGENTS.md` §7 y los artefactos del propio cambio).

## Hallazgos (por gravedad)

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria |
|---|---|---|---|---|
| H-01 | WARNING — **Resuelto** (tercera verificación) | Tarea 2.2 ("nombres de la documentación coinciden con el código"); `AGENTS.md` §7 | `AGENTS.md:181` dice `- SolicitarContinuacion requiere <TAB>ramiteId y payload: { destino: 'whatsapp' } …`: un `` `t `` se convirtió en tabulación (`grep -n $'\t' AGENTS.md` devolvía solo esa línea) y faltaban las comillas invertidas. Corregido en `AGENTS.md` a las 10:30; `grep -n $'\t' AGENTS.md` ya no devuelve nada. | Hecho: reescribir la línea como: ``- `SolicitarContinuacion` requiere `tramiteId` y `payload: { destino: 'whatsapp' }` para solicitar la continuación por WhatsApp.`` y comprobar que `grep -n $'\t' AGENTS.md` no devuelve nada. Volver a ejecutar `pnpm lint`. |
| H-02 | SUGGESTION | contratos-canales "Tiempo real con nombres compartidos" | `tiempoReal.ts`: `ESQUEMAS_EVENTOS_CLIENTE_SOCKET` no usa `satisfies Record<…, z.ZodType>` como `ESQUEMAS_EVENTOS_SOCKET`. | Opcional: agregar el `satisfies` para que un evento de cliente nuevo sin esquema falle en tipos. |
| H-03 | SUGGESTION | Registro de evidencia | `implementacion.md` declara `git diff --check` PASS; es cierto, pero esa comprobación no detecta una tabulación a mitad de línea, por eso no vio H-01. | Opcional: en 2.2, contrastar también el texto renderizado de `AGENTS.md` §7. |

## Riesgos residuales

- El 404 de `/api/demo/contexto` fuera de `DEMO_MODE=true` no se verifica aquí; lo implementa y prueba `api-comandos` (grupo 7).
- `TramiteVistaSchema` ahora tiene un `refine`; en Zod 4.1, `.extend()`, `.pick()` u `.omit()` sobre un objeto con refinamientos lanzan error. Quien lo derive debe usar `safeExtend` o una forma base.
- El código sigue sin commit en el worktree `noki-contratos`; una limpieza de ese worktree lo perdería.

## Historial

- Primera verificación (2026-11-24, 10:25): `FAIL` por H-01, con H-02 como sugerencia.
- Segunda verificación (2026-11-24): H-01 seguía abierto; el resto se confirmó con los cuatro comandos en verde.
- Tercera verificación (2026-11-24, Claude): `AGENTS.md:181` dice ahora ``- `SolicitarContinuacion` requiere `tramiteId` y `payload: { destino: 'whatsapp' }` para solicitar la continuación por WhatsApp.``; `AGENTS.md` no contiene tabulaciones; los demás archivos del diff no cambiaron respecto a la segunda verificación. Repetidos `pnpm lint` (0), `pnpm lint:deps` (sin violaciones, 140 módulos) y `pnpm test` (25 archivos, 147/147). Dictamen PASS. Próximo responsable: los responsables de ambos frentes, para autorizar el cierre.
- Confirmación (2026-11-24, Claude, a petición de Christian Avila con `/opsx:verify`): `git diff --shortstat` sigue en 15 archivos (+134/−32), solo `AGENTS.md` cambió respecto a la segunda verificación. Repetidos los cuatro comandos con `corepack pnpm` y el shim: `pnpm lint` (0), `pnpm lint:deps` (sin violaciones, 140 módulos, 344 dependencias), `pnpm test` (25 archivos, 147/147) y `pnpm --filter @noki/web build` (0, 241 módulos). Se mantiene PASS.

## Autorizaciones de cierre

Cambio **compartido**: el cierre (commit del código, integración en `main`, sincronización de los specs `contratos-canales` y `contratos-consultas` y archivado) requiere, después de resolver H-01, la autorización explícita de:

- Un responsable del frente A: `J3sus-esb` o Christian Avila (`cgac05`) — **PENDIENTE**.
- El responsable del frente B: `LuisMaster119` — **PENDIENTE**.

Los vistos buenos registrados en `handoff.md` autorizan la implementación de la revisión 2, no el cierre. Esta revisión no crea commits, no hace push ni archiva el cambio.
