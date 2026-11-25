# Revisión: ajustes-flujo-a

## Primera vuelta (2026-11-25)

- **Dictamen: FAIL.** El comportamiento de A1–A3 es correcto y los controles están en verde, pero varios textos no son los que fija el spec, falta la prueba de un escenario y el hilo se guarda antes que el trámite.
- **Base revisada:** árbol `noki-identidad`, rama `feat/ajustes-flujo-a` sobre `c9d18dd`, cambios sin commit (19 archivos modificados y 2 nuevos), revisión 1 autorizada en `handoff.md`.
- **Controles repetidos por Claude**, con código 0:
  - `corepack pnpm lint`;
  - `corepack pnpm lint:deps`;
  - `corepack pnpm test`: 312/312 en 55 archivos;
  - `tests/integracion/ejecutar.ts`: 38/38 en 14 archivos, con `DATABASE_URL` en el Postgres de prueba de 55432 y `REDIS_URL` local. El `.env` del árbol apunta a 5432 y hay que sobrescribirlo.
- **Recorrido real (4.2):** no lo repetí. Vale la evidencia de Codex en `evidencias/flujo-real.md`.

### Comprobado sin hallazgos

- A1: `ConsultaDisponibilidad.zonaHoraria`. `sd-mock` y `AgendaExternaMemoria` usan `fromZonedTime(fecha + 'T09:00:00', zona)` y `sd-mock` rechaza una zona vacía o inválida con 400. Pruebas de Tepic (16:00Z–23:00Z), de Tijuana (17:00Z) y de equivalencia con memoria en `sdAgenda.test.ts`.
- A1/A2: `fechaCorta` y `fechaLarga` dan exactamente «jue 26 nov · 09:15» y «jueves 26 de noviembre, 09:15» (`textosWa.test.ts`). El resumen, la confirmación y el vencimiento usan la fecha larga. `CONFIRMAR` dice «¿Eres alguna de estas personas?». La prueba del recorrido comprueba que no aparezcan identificadores de canal o requisito ni instantes ISO.
- A3: `HiloAtencion.atenderEn` no devuelve evento. `soloLectura` usa `ultimo_canal` en memoria y en Postgres, la batería compartida cubre los dos estados, y hay prueba de la segunda continuación con `CanalCambiado` y `cambiosCanal` + 1, y de la llamada nueva que cotiza por HTTP.
- Alcance: sin cambios en `packages/contracts`, `apps/web`, `docs/` ni `pnpm-workspace.yaml`. Única dependencia nueva: `date-fns-tz` `3.2.0` en `apps/sd-mock`.

### Hallazgos

| ID | Gravedad | Requisito | Hallazgo | Corrección |
|---|---|---|---|---|
| H-01 | Media | canal-whatsapp «Textos del bot en español» y «Preguntas guiadas por siguientePregunta» | `textosWa.ts` usa textos distintos de los que fija el spec: «en el sitio web» por «en la web», «en la app» por «en la App», «Aceptar preparación» por «Acepto la preparación», «Completar datos del paciente» por «Confirmo mis datos» y «¿En qué clínica prefieres atenderte?» por «¿En qué clínica te atendemos?». | Usar los textos del spec. Si el responsable prefiere los de Codex, hay que cambiar el spec con su autorización antes, no después. |
| H-02 | Baja | canal-whatsapp, escenario «Requisitos con etiqueta» | Ninguna prueba comprueba los botones de un servicio con `CONSENTIMIENTO` y `ORDEN_MEDICA`. `textosWa.test.ts` solo revisa las claves. | Agregar la prueba del escenario: etiquetas exactas y ningún tipo de requisito en el mensaje. |
| H-03 | Baja | continuidad-canales «Último canal del hilo al iniciar un trámite» («en la misma operación que guarda el trámite nuevo») | `CasosTramite.iniciar` guarda el hilo **antes** que el trámite. Si falla el guardado del trámite, el hilo queda en `callcenter` sin trámite nuevo y la ficha pierde `soloLectura` sin llamada efectiva. | Guardar el hilo después de que `this.guardar(tramite, …)` termine bien, y probar que un fallo al guardar el trámite deja el hilo igual. |
| H-04 | Condición de integración | `docs/trabajo-paralelo.md` (reglas de integración) | `main` avanzó a `465f944`, que también cambia `apps/api/src/pruebas.ts`, `packages/application/src/ports/nucleo.ts`, `pnpm-lock.yaml`, `tests/integracion/comandosHttp.test.ts` y `tests/unit/nucleo/casosTramite.test.ts`. Los controles de 4.1 se corrieron sobre `c9d18dd`. | Después de corregir: rebase sobre `main` vigente, `corepack pnpm install --frozen-lockfile` y repetir 4.1. |

### Siguiente paso

Codex corrige H-01 a H-03 dentro de la revisión 1 (no cambian el alcance). Después se pide autorización para el commit, se hace el rebase de H-04 y Claude repite la revisión.

## Segunda vuelta (2026-11-25)

- **Dictamen: PASS** sobre `c9d18dd` (sin commit). Queda pendiente la condición de integración H-04.
- **H-01, resuelto:** `textosWa.ts` usa exactamente los textos del spec: «en la web», «en la App», «Acepto la preparación», «Confirmo mis datos» y «¿En qué clínica te atendemos?».
- **H-02, resuelto:** `consultasWaMemoria.test.ts` recorre Química → Tepic → horario y comprueba los botones «Acepto el consentimiento» y «Tengo mi orden médica», sin `CONSENTIMIENTO` ni `ORDEN_MEDICA` en los mensajes.
- **H-03, resuelto:** `CasosTramite.iniciar` actualiza el hilo solo después de guardar bien el trámite. La prueba «un fallo al guardar el trámite nuevo conserva el último canal del hilo» deja el hilo en `whatsapp` y sin trámite nuevo.
- **Controles repetidos por Claude**, con código 0: `lint`, `lint:deps`, `test` (314/314) e integración (38/38, Postgres 55432 y Redis).
- **H-04, abierto:** antes de integrar, commit, rebase sobre `main` vigente (`465f944` o posterior; conflicto esperado en 5 archivos), `pnpm install --frozen-lockfile` y repetir 4.1. Claude comprueba el resultado del rebase antes del archivado.
- **Riesgo residual** (design D3): con la llamada nueva, el trámite viejo que siguió en WhatsApp también se puede editar desde el call center.

## Integración (2026-11-25)

- **H-04, resuelto:** rebase sobre `main` `465f944`. Hubo dos conflictos mecánicos, los dos resueltos uniendo ambos lados sin cambiar comportamiento:
  - `apps/api/src/pruebas.ts`: `relojDemo` de temporizadores más `solicitarContinuacion`;
  - `tests/unit/nucleo/casosTramite.test.ts`: el retorno de `escenario()` incluye `agenda`, `registro`, `ids` y `hilos`.
- **Controles sobre la rama rebasada**, con código 0: `pnpm install --frozen-lockfile` (sin cambios en `pnpm-workspace.yaml`), `lint`, `lint:deps`, `test` (327/327) e integración (45/45, Postgres 55432 y Redis).
- **Dictamen final: PASS.**
