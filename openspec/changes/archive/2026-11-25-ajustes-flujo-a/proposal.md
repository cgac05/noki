# Proposal

## Why

El recorrido real del Flujo A (`PLAN.md` §12; `main` `f0d8e70`, web con `VITE_API=real` y `VITE_DEMO=true`, API con `DEMO_MODE=true`) terminó de punta a punta. El frente B corrigió sus fallas en `ajustes-flujo-real` (`c9d18dd`) y entregó tres al frente A:

- **A1, horarios a medianoche y sin día**: WhatsApp lista «00:00 … 04:30» y la cita quedó a medianoche. La causa no es el formato. `sd-mock` y `AgendaExternaMemoria` generan los horarios desde las `07:00Z`, y en Tepic (`America/Mazatlan`, UTC−7) eso son las 00:00. El bot sí convierte bien a la zona de la sede, pero solo muestra `HH:mm`, sin el día.
- **A2, textos crudos del bot**:
  - el resumen al retomar une `tramite.canalOrigen` («· callcenter»);
  - los requisitos sin etiqueta muestran su tipo («CONSENTIMIENTO»);
  - las preguntas de lista usan la casilla («Selecciona horario.»);
  - el paso `CONFIRMAR` dice «Elige una opción.» en lugar de «¿Eres alguna de estas personas?».
- **A3, ficha en solo lectura sin salida**: el hilo pertenece al contacto del call center. Una llamada nueva desde el mismo número inicia un trámite en ese hilo, pero no cambia su último canal. Si el hilo ya había continuado en WhatsApp, el último `CanalCambiado` sigue siendo `callcenter → whatsapp` y `soloLectura` queda verdadero para siempre. El asesor no puede cotizar ni identificar sin `pnpm demo:reset`.

## What Changes

- **Agenda en horario de atención de la sede (A1)**:
  - `ConsultaDisponibilidad` lleva la zona IANA de la sede.
  - `sd-mock` y el adaptador en memoria generan los 15 horarios de 30 minutos desde las 09:00 locales de esa zona.
- **Fechas legibles en WhatsApp (A1)**: cada horario de la lista muestra día y hora en la zona de la sede («jue 26 nov · 09:15»). El resumen, el vencimiento de la reserva y la confirmación usan la fecha larga («jueves 26 de noviembre, 09:15»).
- **Textos del bot en español (A2)**:
  - etiquetas para el canal de origen, cada tipo de requisito y cada casilla;
  - «¿Eres alguna de estas personas?» en `CONFIRMAR`;
  - ningún mensaje ni opción muestra identificadores internos.
- **Llamada nueva recupera el hilo (A3)**:
  - Iniciar un trámite en un canal distinto del último canal del hilo actualiza ese último canal, sin `CanalCambiado`.
  - `soloLectura` se calcula con el último canal del hilo. Así, la ficha vuelve a ser editable con la llamada nueva y otra continuación por WhatsApp la vuelve a bloquear.

### Fuera de alcance

- Contratos, `docs/eventos.md` y cualquier archivo compartido: el vocabulario de `MetodoVinculo` no cambia (design D4).
- `apps/web` (frente B), incluido el guion simulado `guionFlujoA.ts`, que ya muestra «Jueves 26 · 09:15».
- Elegir otro día distinto de mañana en WhatsApp, horarios por servicio o recurso y cerrar trámites viejos del hilo.
- Mostrar el texto de preparación o el documento de consentimiento en WhatsApp.
- El tablero de administración y el check-in en clínica (extra 1 de `PLAN.md` §11): necesitan un cambio compartido de contratos aparte.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `agenda-simulada`: «Agenda simulada en sd-mock» genera la disponibilidad en el horario de atención de la zona de la sede y «Cliente de agenda externa con reintentos» envía esa zona.
- `canal-whatsapp`: «Retomar en WhatsApp», «Preguntas guiadas por siguientePregunta», «Identificación del paciente por pasos en WhatsApp» y «Confirmación por WhatsApp» exigen fechas con día y textos en español sin identificadores internos.
- `continuidad-canales`: requisito nuevo «Último canal del hilo al iniciar un trámite».
- `consultas-api`: «Contenido de cada consulta» define `soloLectura` con el último canal del hilo.

## Impact

- Archivos del frente A:
  - `packages/application/src/ports/nucleo.ts`, `packages/application/src/CasosTramite.ts`;
  - `packages/domain/src/HiloAtencion.ts`;
  - `packages/adapters/in-http/src/{ConversacionWa.ts,identificacionWa.ts}` y un módulo nuevo de textos;
  - `packages/adapters/memory/src/{AgendaExternaMemoria.ts,LecturasMemoria.ts}`;
  - `packages/adapters/out-sd/src/AgendaExternaSd.ts`, `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts`;
  - `apps/sd-mock/src/crearSdMock.ts` y `apps/sd-mock/package.json`, más sus pruebas.
- Dependencia: `date-fns-tz` `3.2.0` en `apps/sd-mock` (ya se usa en el repo, con la misma versión). Cambia `pnpm-lock.yaml`.
- Sin migraciones: `hilo_atencion.ultimo_canal` ya existe.
- Coordinación: `feat/temporizadores` toca `ports/nucleo.ts` y `Tramite.ts`. Si se integra antes, este cambio hace rebase sobre él.
- Frente B: las vistas reciben los mismos contratos. Solo cambian los textos del bot, los instantes de los horarios y cuándo `soloLectura` es verdadero.
- Riesgo: con la llamada nueva, el trámite que siguió en WhatsApp también vuelve a ser editable desde el call center (design D3).
- Responsable: frente A (`J3sus-esb` y `cgac05`); basta uno.
