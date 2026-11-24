# Tasks

Cambio compartido: no empezar sin el visto bueno de ambos frentes registrado en `handoff.md`. Escribir primero cada prueba. Al terminar cada grupo, `pnpm lint && pnpm lint:deps && pnpm test` en verde (incluye el proyecto `web`); registrar resultados reales en `implementacion.md`. Las pruebas existentes de `tests/unit/` y `apps/web` se conservan; si una cambia por el tipo nullable de la ficha, registrar cuál y por qué, sin debilitar sus comprobaciones.

## 1. Contrato

- [ ] 1.1 `comandos.ts`: `contacto?` (`/^\d{10,15}$/`) en `IniciarTramite`, comando `SolicitarContinuacion` y `horario?` en `TramiteVistaSchema` con `expiraEn` opcional. Verificar "Contacto mal formado", "Continuación sin trámite", "Vista con reserva", "Cita confirmada sin vencimiento" y que "Payload ligado al comando" y "Comando válido" siguen en verde. Ref: contratos-canales "Comando y respuesta comunes a todos los canales".
- [ ] 1.2 `vocabulario.ts`: `INTERNO` en `CodigoErrorSchema`; en `in-http`, `INTERNO: 500` en `MAPEO_ERRORES_HTTP`. Verificar "Códigos esperados" y la prueba de coherencia. Ref: contratos-canales "Errores de dominio traducidos a HTTP".
- [ ] 1.3 `tiempoReal.ts`: `EVENTOS_CLIENTE_SOCKET` (`sala:unirse`, `sala:salir`) con `SalaSchema` como dato. Verificar "Unirse a una sala inválida". Ref: contratos-canales "Tiempo real con nombres compartidos".
- [ ] 1.4 `consultas.ts`: `nombrePila` y `telefonoEnmascarado` nullables en `FichaHiloSchema`; entrada `contextoDemo` con `soloDemo`. Verificar "Ficha de un hilo anónimo", "Contexto de demo" (el escenario "Contexto fuera de modo demo" lo verifica `api-comandos` en su grupo 7) y que las pruebas de rutas existentes siguen en verde. Ref: contratos-consultas.
- [ ] 1.5 Punto de control 1.

## 2. Web y documentación

- [ ] 2.1 `apps/web`: datos simulados de `contextoDemo` (desde los ids de la demo) y tolerancia a `null` en las vistas que muestran nombre o teléfono de la ficha, sin otros cambios de UI. Verificar con las pruebas del proyecto `web` y `pnpm --filter @noki/web build`.
- [ ] 2.2 `docs/contratos.md`: contacto, `SolicitarContinuacion`, `horario`, ficha nullable, `INTERNO`, eventos del cliente de Socket.IO, `contextoDemo` y las claves de `metricas.kpis` del spec `consultas-api` de `api-comandos`. `AGENTS.md` §7: el comando nuevo, la unión a salas y la consulta de demo. Verificar que los nombres coinciden con el código.
- [ ] 2.3 Punto de control final: `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` en verde; `packages/contracts` sigue dependiendo solo de `zod`.
