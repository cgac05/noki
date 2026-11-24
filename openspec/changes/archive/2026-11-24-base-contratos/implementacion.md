# Implementación: base-contratos

- Alcance: revisión 3 autorizada en `handoff.md`; los seis hashes SHA-256 coinciden antes de implementar (2026-11-24).
- Instrucción vigente del usuario: avanzar por los puntos de control en orden y registrar cada uno aquí antes del siguiente.
- Base: `e7e1c614801f6506ed9c802b8f8097485171ebb5`; sin commits ni publicación autorizados para este cambio.
- Artefactos consultados: propuesta, diseño D1–D10, los tres specs, tareas, handoff, `AGENTS.md`, `PLAN.md` completo y guía compartida.
- Decisiones: estructura `contracts` autorizada por la revisión 3; la regla del reloj se aplica a `new Date()` sin argumentos según el ajuste de reloj autorizado en el handoff. No se introduce lógica de negocio.
- Estado de las tareas: consultar `tasks.md`; ninguna se marca antes de verificar su comportamiento.

## Punto de control 1 — PASS

Objetivo y criterios: `tasks.md` 1.1–1.7, design D1–D3/D9 y spec `arquitectura-hexagonal`.

| Comprobación inicial | Resultado real |
|---|---|
| Node / corepack / pnpm disponibles | Node 24.20.0, corepack 0.35.0 y pnpm 11.25.0 |
| `corepack pnpm --version` | Primer intento en sandbox: ENOTFOUND. Con acceso de red autorizado y pnpm activado: 11.25.0 |
| Docker antes de empezar | Daemon no disponible: no existe `dockerDesktopLinuxEngine`. No se necesita para este grupo; se resolverá al llegar al punto 3 |

Archivos entregados: manifiesto raíz, lockfile, workspace, `.nvmrc`, configuración TS/ESLint/dependency-cruiser/Vitest, `.gitignore`, `.env.example`, los 13 paquetes de D1 con sus manifiestos/configuración/índices y `tests/unit/workspace.test.ts`.

| Validación | Resultado real y evidencia |
|---|---|
| `corepack enable` | Windows impidió escribir en `Program Files` (EPERM). `corepack enable --install-directory .tools/corepack` y `corepack prepare pnpm@11.25.0 --activate` terminaron correctamente; los shims locales están ignorados |
| `pnpm install --frozen-lockfile` | Código 0. pnpm exigió autorizar esbuild: se ejecutó `pnpm approve-builds esbuild`; `allowBuilds.esbuild: true` queda en el workspace, sin permitir otros scripts |
| `pnpm lint` | Código 0; ESLint y `pnpm -r exec tsc --noEmit` más tipos de las pruebas |
| `pnpm lint:deps` | Código 0; cero violaciones |
| `pnpm test` sin Docker | Código 0; 1 archivo, 3 pruebas aprobadas, sin conexiones externas |
| Pruebas negativas 1.3–1.4 y entorno 1.6 | Las 11 infracciones de lint se rechazan; fecha con valor y expect-error descrito se admiten; las 8 infracciones de dependencias se rechazan y Zod se admite; `.env` no aparece en Git. Ver `evidencias/punto-1-negativas.log` para contenido temporal, comandos, salidas y códigos |
| Instalación limpia 1.7 | Instantánea aislada de los archivos entregados en `.tools/punto-1-limpio`, inicialmente sin `node_modules` ni `.env`, para comprobar la entrega sin crear un commit. `pnpm install --offline --frozen-lockfile`, `pnpm lint`, `pnpm lint:deps`, `pnpm test`: cuatro códigos 0. Ver `evidencias/punto-1-instalacion-limpia.log` |

Corrección descubierta al verificar: excluir `node_modules` del grafo ocultaba dependencias externas resueltas; se retiró esa exclusión y se conservó `doNotFollow` para no recorrer dependencias transitivas. La revalidación del caso de TypeScript resuelto y de las otras fronteras pasó. La importación negativa de Fastify aún no está resuelta en esta etapa y dispara también la regla de importación no resuelta; el caso adicional de TypeScript comprueba el rechazo de un externo que sí está instalado. Todos los archivos temporales fueron retirados.

Este punto queda registrado antes de empezar el 2. Sin cambios en los requisitos ni en los criterios de aceptación; sin commits.

## Punto de control 2 — PASS

Objetivo y criterios: `tasks.md` 2.1–2.9 y design D4–D6. Se escribieron primero las pruebas; `evidencias/punto-2-rojo.log` conserva los fallos antes de implementar. La lógica de negocio sigue fuera de alcance.

Archivos: tipos/constantes, IDs con marca, `TramiteRegistro`, `PerfilServicio`, 27 eventos y errores en `packages/domain/src/`; puertos en `application/src/ports/`; dos adaptadores en memoria; implementaciones reales del reloj y UUID v7 en `apps/api/src/sistema/`; los siete módulos Zod de `contracts`; mapeo HTTP y prueba de coherencia en `in-http`; pruebas unitarias; `docs/eventos.md`, `docs/contratos.md`, y solo los ajustes de estructura/fronteras autorizados en `PLAN.md` §4 y `AGENTS.md` §4–§5. Los manifiestos y el lockfile incluyen uuid y el enlace de aplicación en API, y Zod en el adaptador HTTP.

| Validación | Resultado real y evidencia |
|---|---|
| `pnpm lint` | Código 0; incluye pruebas de tipos y mapeo exhaustivo de errores |
| `pnpm lint:deps` | Código 0; 35 módulos, 46 dependencias, cero violaciones |
| `pnpm test` | Código 0; 5 archivos, 19 pruebas aprobadas, 859 ms, sin infraestructura |
| Divergencia temporal de estado | Añadir `ESTADO_PRUEBA` solo al dominio hizo fallar tanto `pnpm lint` como `pnpm test` señalando `coherencia.test.ts`; se restauró el archivo y todos los controles volvieron a verde. Ver `evidencias/punto-2-divergencia.log` |
| Cobertura documental | Comprobación de 27 eventos y siete módulos contra los documentos: PASS; `git diff --check` limpio |

La evidencia final del grupo está en `evidencias/punto-2-validacion.log`. Decisiones menores del contrato, detalladas en `docs/contratos.md`: `codigo` discrimina familias de error y `ReglaViolada.regla` conserva la regla concreta; los payloads de llegada reciben un token, no un folio; las vistas exponen identificadores y metadatos públicos. No se crearon endpoints, transiciones ni emisores de eventos.

Este punto queda registrado antes de empezar el 3. Sin cambios de alcance ni commits.

## Punto de control 3 — PASS

Objetivo y criterios: `tasks.md` 3.1–3.5 y design D7/D10. Docker Desktop se inició para este grupo. `evidencias/punto-3-rojo.log` conserva el fallo inicial antes de implementar el migrador; el fallo de preparación produjo pruebas no ejecutadas, sin tratarlo como éxito.

Archivos: `infra/docker-compose.yml`, `infra/migraciones/001_nucleo.sql`, migrador/proveedor SQL y CLI de `out-postgres`, ejecutor de integración y `tests/integracion/nucleo.test.ts`, manifiestos/lockfile. Se creó un `.env` local ignorado a partir del ejemplo, sin sobrescribir otro existente. No se agregaron tablas excluidas ni lógica de negocio.

| Validación | Resultado real y evidencia |
|---|---|
| `docker compose -f infra/docker-compose.yml up -d --wait postgres redis` y `ps` | Código 0; Postgres y Redis saludables. Ver `evidencias/punto-3-infraestructura.log` |
| `pnpm db:migrate` inicial y segunda ejecución | Primera: `001_nucleo` aplicada; segunda: ninguna pendiente. Tras restaurar Docker, dos ejecuciones adicionales finalizaron con código 0 y sin reaplicar migraciones |
| `pnpm test:integracion` | Código 0; 8 pruebas contra Postgres y Redis reales, sin omitidas: tablas presentes/excluidas, tipo obligatorio, repetibilidad, reserva activa única, reservas liberadas, 50 intentos concurrentes con exactamente 1 éxito y 49 errores 23505, eventos idempotentes, consumidor por clave, jti de un uso e índices. Ver `evidencias/punto-3-validacion.log` |
| Sin Docker | Solo estaban activos los dos contenedores del proyecto. Se detuvo Docker Desktop: `pnpm test:integracion` terminó en código 1 con explicación de infraestructura faltante, sin declarar éxito ni omitir pruebas como aprobadas. Ver `evidencias/punto-3-sin-infraestructura.log` |
| Unitarias sin Docker | 19 pruebas aprobadas, código 0. Después se volvió a iniciar Docker y ambos servicios quedaron saludables |
| Regresión | `pnpm lint`, `pnpm lint:deps`, `pnpm test` en verde; 41 módulos, 52 dependencias sin violaciones |

La suite usa exclusivamente `noki_test`, crea la base si falta y reinicia su esquema al comenzar. La base de desarrollo `noki` no se borra al ejecutar integración. `usuario_interno` es la adición al modelo autorizada por D7. `localidad` conserva su clave normalizada y coordenadas según `PLAN.md`; la asociación de Xalisco con Tepic se podrá verificar por proximidad en la semilla. `001_nucleo` debe permanecer inmutable después de integrarse.

Este punto queda registrado antes de empezar el 4. Sin cambios de alcance ni commits.

## Punto de control 4 — PASS

Objetivo y criterios: `tasks.md` 4.1–4.7. Se escribieron primero las pruebas de aplicaciones y semilla; `evidencias/punto-4-rojo.log` conserva los fallos antes de implementar esas funciones.

Archivos: factories y procesos de Fastify en API/sd-mock, comprobaciones de disponibilidad en `out-postgres` y `out-redis`, página índice React/Vite/Tailwind, datos/semilla/reset/CLIs en `apps/api/src/semilla/`, pruebas de aplicaciones y semilla, scripts de desarrollo y entrega, manifiestos/lockfile y `README.md`. El inventario y los hashes de los archivos entregados están en `evidencias/entrega.sha256`; ese inventario incluye archivos nuevos que Git aún no sigue y excluye únicamente los artefactos de planificación/informe de este cambio, cuyos estados siguen actualizándose.

| Validación | Resultado real y evidencia |
|---|---|
| Salud y disponibilidad | `/health` de ambos procesos responde 200 sin depender de infraestructura. `/ready` consulta SELECT 1/PING en paralelo; responde 200 con ambos disponibles y 503 ante una caída, dentro del límite, sin URL ni credenciales. Cuatro pruebas reales en `aplicaciones.test.ts` |
| Semilla | Tres sedes, cuatro servicios/perfiles/sinónimos, 12 ofertas y 12 recursos, Xalisco más cercano a Tepic, dos pacientes/contactos/vínculos/PIN y tres usuarios internos. Dos ejecuciones conservan los recuentos; cinco pruebas en `semilla.test.ts` verifican además hashes argon2id, búsqueda difusa y reinicio protegido |
| Comandos de demo | `pnpm seed` finalizó con código 0. `pnpm demo:reset` en la entrega aislada finalizó con código 0; con `DEMO_MODE=false`, código 1 antes de conectarse. El caso bloqueado también comprueba que no se modificaron los recuentos de la base |
| Comprobación manual 4.3 | `pnpm dev` inició API 4000, mock 4001 y web 5173. Los cuatro GET devolvieron 200; ver `evidencias/punto-4-http.json`. Navegador a 1280×900 y 375×812: sin desbordamiento horizontal ni errores/advertencias de consola, con los cinco canales y el alcance de demostración visibles. Ver `evidencias/punto-4-manual.json` |
| Validación final 4.7 | Copia nueva `.tools/punto-4-limpio` de los archivos entregados, inicialmente sin `node_modules` ni `.env`; se copió `.env.example` como indica README. `pnpm install --offline --frozen-lockfile`, `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm demo:reset`, `pnpm test:integracion`, `pnpm --filter @noki/web build`: siete códigos 0. Ver `evidencias/punto-4-validacion-limpia.log` |
| Resultados finales | 19 pruebas unitarias/contratos/coherencia, más comprobación explícita de tipos en `pnpm test`; Vitest unitario 1.10 s. Integración: 17 pruebas, cero omitidas, 8.67 s; incluye 50 reservas concurrentes con un único éxito. Frontend: 108 módulos, build aprobado |
| Artefactos y diff | `openspec validate base-contratos --type change --strict --no-interactive`: válido. `git diff --check`: limpio. No se modificaron las habilidades generadas de OpenSpec |

Decisiones menores: comprobación de dependencia limitada a 1 s con limpieza de conexión; se autorizaron solo los scripts nativos de esbuild y argon2 en pnpm. El sistema de UI se mantuvo en la página índice mínima aprobada, sin rutas ni comportamientos de los canales. La consulta local de UI no pudo ejecutarse porque Python no está disponible; se aplicaron las guías generales y se comprobó el resultado en navegador. El detector de interfaz terminó sin hallazgos. No se añadieron fuentes, imágenes, sistemas de diseño ni dependencias visuales fuera de lo previsto.

## Entrega para revisión de Claude

- Resumen: cuatro puntos de control completados y registrados en orden; workspace reproducible, contratos coherentes, migración e integridad reales, semilla y aplicaciones mínimas verificadas.
- Revisión entregada: base Git `e7e1c614801f6506ed9c802b8f8097485171ebb5` más archivos de `evidencias/entrega.sha256` y cambios de estado/informe en este directorio. Sin commits ni publicación de este cambio.
- Tareas: 1.1–4.7 completadas; el estado detallado reside en `tasks.md`.
- Desviaciones de requisitos/diseño: ninguna. La instalación limpia se comprobó en instantáneas aisladas del árbol entregado, sin crear commits; rutas y comandos reales constan en los logs.
- Limitaciones: el núcleo de negocio, continuidad, endpoints de comandos, canales, Socket.IO, workers y familias/tablas reservadas siguen fuera de alcance conforme a la propuesta. No se simula una revisión independiente de Claude.
- Próximo paso: Claude revisa de forma independiente con los artefactos, el código y la evidencia. La autorización de cierre y sincronización/archivo continúa PENDIENTE en `handoff.md`.
