# Revisión: wa-una-pregunta

## Vuelta 1 — 2026-11-25 — PASS

Revisor: Claude (revisión independiente). Base: rama `claude/project-thread-kdenjy` sobre `0b59599`, revisión 3, sin commit. Implementación de Codex: 9/9 tareas.

### Alcance del diff
Archivos de este cambio: `apps/sd-mock/src/crearSdMock.ts`, `packages/adapters/in-http/src/{ConversacionWa,identificacionWa,textosWa}.ts`, `tests/unit/api/{preguntasWa.test.ts,bateriaIdempotenciaWa.ts,consultasWaMemoria.test.ts,identificacionWaHttp.test.ts}`, `tests/integracion/{comandosHttp,sdAgenda}.test.ts`. Los demás cambios del árbol (`apps/web/**`, `docs/trabajo-paralelo.md`, `CasosTramite.ts`, `LecturasComandosPostgres.ts`, `puertosApiPostgres.test.ts`, `casosTramite.test.ts`, `openspec/changes/web-modo-real/`) son de otro trabajo en la misma carpeta y NO entran en este cambio ni en su commit.

### Contraste con requisitos y diseño
- D1 (WA «Preguntas guiadas»): días desde hoy en la zona de la sede, hasta 7 con horario libre en máximo 14 fechas; horas `HH:mm` paginadas (8 + «Ver más horarios» + «Elegir otro día», máximo 10 filas); `dia`/`paginaHora` se borran al reservar, confirmar o retomar. Cumple.
- D2–D4 (WA «Identificación por pasos»): `DATOS` pregunta un campo por mensaje; Flow de un campo `sensitive`; «No tengo» en apellido materno; sexo con 3 botones `F/M/X`; entidad con lista alfabética 9 + «Más estados», `NE` al final; validación por campo con el esquema del contrato; un solo `IdentificarPaciente` al completar; `estado.datos` se borra al enviar, al cambiar de trámite y al salir del paso. Cumple.
- D5 (AS): bloque de 1000 folios por segundo con ciclo 899 999 s; reloj inyectable. Cumple (revisión 3).
- D6: `AGENDA_NO_DISPONIBLE` → «La agenda no respondió…». Cumple.
- Sin cambios en contratos, dominio, web, migraciones ni dependencias en los archivos de este cambio.

### Controles independientes
| Control | Resultado |
|---|---|
| Unitarias WhatsApp (`preguntasWa`, `consultasWaMemoria`, `identificacionWaHttp`, `idempotenciaWaMemoria`, `textosWa`) | 19/19 |
| Integración `comandosHttp` + `sdAgenda` (Postgres 55432, incluye «Registro nuevo concluye después de reiniciar sd-mock») | 10/10 |
| `eslint` de los archivos del cambio, `tsc --noEmit` de `in-http` | 0 errores |
| Integración completa en el checkout compartido | 30 pasan, 6 fallan en archivos ajenos a WhatsApp (relay, consumidor, puertos, intentos, clínica); al repetirlos aislados pasan (4/4). Se atribuyen a carga y Redis compartidos con la demo y otro trabajo simultáneo. Codex obtuvo 55/55 en copia aislada. |
| Recorrido en vivo | No aplicable en :4000: la demo se movió a `noki-identidad` (`main`) por decisión de Christian y no sirve este código. Cubierto por la prueba de integración HTTP anterior y por `evidencias/05-recorrido.json` de Codex. |

### Hallazgos
- H-01 (sugerencia): `preguntarHorario` consulta las fechas en serie (hasta 14 llamadas). Aceptable con `sd-mock` local.
- H-02 (riesgo residual, ya en design): reserva atascada si falla la confirmación local; ciclo de folios de ~10 días; datos parciales en `conversacion_wa`.
- H-03 (para integrar): repetir `test:integracion` completo con el árbol ya integrado y sin carga concurrente.

### Dictamen
PASS. Recomiendo commit solo de los archivos listados arriba más la carpeta del cambio, e integración en `main`.
