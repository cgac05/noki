# Tasks

Cada grupo es un punto de control: al terminarlo, `pnpm lint && pnpm lint:deps && pnpm test` deben estar en verde y registrados en `implementacion.md` antes de empezar el siguiente. Escribir primero la prueba de cada comportamiento (`AGENTS.md` §12). Pruebas en `tests/unit/nucleo/` salvo que se indique otra ruta (design D10). No modificar archivos compartidos ni `apps/web`; si hace falta, detener la parte afectada (ver `handoff.md`).

## 1. Registro de tipos y entidad Tramite

- [x] 1.1 Definir `DefinicionTipoTramite` y `RegistroTiposTramite` (design D4) con validación al registrar (orden por canal como permutación, dependencias sin ciclos); verificar con pruebas "Orden incompleto rechazado" y "Tipo no registrado". Ref: tramite-nucleo "Registro de tipos de trámite"; siguiente-pregunta "Orden preferido por canal".
- [x] 1.2 Registrar `AGENDAR` en `packages/domain/src/tipos/agendar.ts` con casillas, dependencias, órdenes por canal, pistas y tabla de transiciones (design D2, D4, D6); verificar con una prueba que lee la definición y compara dependencias y órdenes con los requisitos.
- [x] 1.3 Implementar la entidad `Tramite` con casillas, hitos calculados y `ContextoOperacion` (design D1, D5): iniciar, seleccionar servicio (con perfil), seleccionar sede (con precio), asignar paciente, cumplir requisito y aceptar preparación; verificar "Paciente antes que servicio", "Cambio de servicio antes de reservar", "Cotizado" y "Una versión por operación".
- [x] 1.4 Implementar la evaluación de elegibilidad y su reconocimiento (design D3); verificar "Listo para reservar con advertencia de elegibilidad" y "Sin datos sensibles en eventos" (prueba de tipos y de valores sobre los payloads emitidos).
- [x] 1.5 Implementar las transiciones explícitas (apartar, confirmar, expirar hold, registrar llegada, cerrar atención, cancelar, inasistencia, expirar por inactividad) desde la tabla del registro; verificar "Flujo completo", "Apartar sin estar listo", "Transición inválida", "Hold expirado", "Expiración solo antes de confirmar" y "Cancelación con anticipación" (con `RelojFalso`).
- [x] 1.6 Punto de control 1: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 2. siguientePregunta

- [x] 2.1 Implementar `siguientePregunta` y `SiguientePreguntaDominio` (design D6); verificar (prueba obligatoria, nombre reconocible) "Dependencia pendiente se omite", "Requisitos dependen del servicio", "Trámite completo", "Mismo trámite, distinto canal" y "Retoma en el horario", recorriendo los cinco canales.
- [x] 2.2 Implementar las pistas de `AGENDAR`; verificar "Captura sensible del paciente" (todos los campos del paciente con `captura: 'sensitive'`) y que ninguna pista lleva valores iniciales de datos personales.
- [x] 2.3 Verificar "Extensión sin tocar el núcleo": registrar en la prueba un tipo ficticio mínimo y ejercer `siguientePregunta` y una transición; ejecutar `rg "=== '(AGENDAR|ADELANTO|FACTURA)'|case '(AGENDAR|ADELANTO|FACTURA)'" packages/domain packages/application` y registrar que no hay resultados.
- [x] 2.4 Agregar `packages/adapters/in-http/test/siguientePregunta.test.ts` con la comprobación de tipos y la validación con `SiguientePreguntaSchema` de cada casilla y de `COMPLETO`; verificar "Coherencia con el contrato" introduciendo temporalmente una `entrada` inexistente en una pista, registrar el fallo y revertir.
- [x] 2.5 Punto de control 2: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Política de identidad

- [x] 3.1 Definir `Factor`, `AccionProtegida` y `PoliticaIdentidad` con su tabla de requisitos (design D7) en `packages/domain/src/identidad/`; verificar "Cotizar sin verificación", "Ver resultados sin PIN" (parte de la prueba obligatoria de seguridad), "Cancelar sin OTP", "Retomar sin vínculo" y una prueba por cada acción de `PLAN.md` §8 que cubra el caso que cumple y el que no.
- [x] 3.2 Verificar "Asesor opera en nombre del paciente" y "Factor desconocido" (`@ts-expect-error` descrito).
- [x] 3.3 Punto de control 3: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 4. Puertos y adaptadores en memoria

- [x] 4.1 Definir en `packages/application/src/ports/` los puertos de design D9 y exportarlos desde `packages/application/src/index.ts`; verificar con `pnpm lint:deps` que `application` solo depende de `domain`.
- [x] 4.2 Implementar en `packages/adapters/memory/src/` un adaptador por puerto y exportarlos; verificar con pruebas el comportamiento propio de cada uno: "Escritura concurrente" en `TramiteRepoMemoria` (y que el guardado vacía pendientes y conserva eventos), token consumido una sola vez en `VerificadorTokensMemoria`, oferta inexistente en `CatalogoMemoria`, folio de 8–9 dígitos en `AgendaMemoria` y bloqueo de 15 minutos en `RegistroIntentosMemoria` con `RelojFalso`.
- [x] 4.3 Implementar la entidad `HiloAtencion` (último canal y `CanalCambiado`); verificar "Retomar desde otro canal" a nivel de entidad.
- [x] 4.4 Punto de control 4: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 5. Resolvedor de continuidad y casos de uso

- [x] 5.1 Implementar los casos de uso iniciar trámite, seleccionar servicio, seleccionar sede, asignar paciente, cumplir requisito y reconocer advertencia de elegibilidad, consultando `PoliticaIdentidad`; verificar por caso camino feliz, guarda que falla ("Sede sin el servicio" incluida) y concurrencia donde aplique. Ref: tramite-nucleo "Casos de uso del Flujo A con adaptadores en memoria".
- [x] 5.2 Implementar reservar horario y confirmar cita con `AgendaPort`; verificar camino feliz, "Apartar sin estar listo" desde el caso de uso (con `casillas` en los datos del error) y conflicto de versión al confirmar dos veces en paralelo.
- [x] 5.3 Implementar `ResolvedorContinuidad` (design D8); verificar "El token gana", "Token de un solo uso", "Folio sin fecha de nacimiento", "Datos personales con coincidencia única", "Teléfono familiar ambiguo" (comparando el resultado con el de un `wa_id` desconocido), "Varios trámites del mismo paciente" y "Tercer intento bloquea".
- [x] 5.4 Implementar el caso de uso retomar trámite; verificar la prueba obligatoria "Continuidad Call Center → WhatsApp" de extremo a extremo con adaptadores en memoria (asesor llena paciente, servicio, sede y requisitos en `callcenter`, emite token, el paciente lo usa en `whatsapp`, la siguiente pregunta es `horario`, se emiten `CanalCambiado` e `IdentidadVinculada`, y apartar el horario desde `whatsapp` funciona), y "Segunda visita sin token".
- [x] 5.5 Implementar registrar llegada (token de un solo uso) y cancelar cita (política de cancelación); verificar "Llegada con token de un solo uso" y cancelación rechazada sin OTP y aceptada con botón de aprobación.
- [x] 5.6 Verificar "Sin infraestructura": con Docker detenido, `pnpm test` en verde y el tiempo de las pruebas de `tests/unit/nucleo/` menor a 2 s según la salida de Vitest.
- [x] 5.7 Punto de control final: `pnpm lint && pnpm lint:deps && pnpm test` en verde desde el árbol limpio de la rama; registrar comandos y resultados reales en `implementacion.md`, incluidas las reglas nuevas de `ReglaViolada` y los nombres de `Factor` como contratos que `api-comandos` debe conocer. `pnpm test:integracion` no aplica a este cambio (sin infraestructura nueva): registrar NO APLICA con el motivo.
