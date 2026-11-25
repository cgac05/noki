# Revisión: callcenter-nueva-cita

## Vuelta 1 — 2026-11-25 (Claude)

**Dictamen: FAIL.** Codex no pudo ejecutar controles (`EPERM`); los ejecutó el revisor sobre `371bc39` + diff. Las tareas siguen sin marcar.

| Control | Resultado |
|---|---|
| `tsc --project tests/tsconfig.json` | sin errores |
| `pnpm -r exec tsc --noEmit` | 4 errores TS7053 en `apps/web/src/cliente/cliente.test.ts` (70, 101, 222, 224) |
| `eslint .` / `depcruise` | sin errores / sin violaciones |
| `vitest --project unitarios` | 302/303 |
| `vitest --project web` | 5 fallos |

### Hallazgos

- **H-01 (alta):** `cliente.test.ts` líneas 70, 101, 222 y 224. Las pruebas que recorren todas las consultas no excluyen la nueva consulta solo de demo `fechaNacimientoLlamada`, como sí lo hacen con `sesionWebDemo`. Eso causa los 4 TS7053 y 3 fallos de ejecución: «Flujo C…» y «Datos simulados…» esperan `undefined` y reciben `{ fechaNacimiento: null }`; «Ruta de la tabla…» da `Value is not JSON serializable`. Corrección: tratar `fechaNacimientoLlamada` igual que `sesionWebDemo` en esas pruebas, o darle parámetros y respuesta válidos en las tablas del cliente real y simulado.
- **H-02 (media):** `packages/adapters/in-http/test/rutasComandos.test.ts` «Cotizar desde el call center conserva el contacto y delega servicio y sede» espera `iniciar('AGENDAR', '0000000001', ctx)` y ahora recibe un argumento más (`nuevo`). Corrección: ajustar la prueba a la nueva firma sin perder lo que comprueba, o pasar la opción sin cambiar la llamada cuando `nuevo` es falso.
- **H-03 (alta, EC/D3):** `consolas.test.tsx` «permite elegir Nueva cita al retomar» no encuentra «Completar la cita aquí» después de «Nueva cita». La propia prueba de Codex falla.
- **H-04 (media):** `identidadAsesor.test.tsx` «H-01: tras fallar Para mí envía Para otra persona…» encuentra varios botones «Reintentar». Pasaba en `371bc39`, así que es una regresión de `CallCenter.tsx`: probablemente el error de la acción se muestra en dos lugares.
- **H-05 (media, D3):** el límite que señaló Codex. Después de «Nueva cita», «Completar la cita aquí» abre el asistente por número, que elige el trámite en proceso más reciente que no esté en `BORRADOR`, es decir, el estudio anterior. Corrección dentro del alcance: mostrar «Completar la cita aquí» para el trámite nuevo solo cuando ya no esté en `BORRADOR` (el asesor cotiza primero en la ficha). Así el nuevo es el más reciente con actividad y el asistente lo retoma. Una prueba debe cubrirlo.

## Vuelta 2 — 2026-11-25 (Claude)

**Dictamen: PASS.** H-01 a H-05 corregidos. Con H-05, «Completar la cita aquí» del trámite nuevo aparece solo cuando ya no está en `BORRADOR`. El revisor repitió los controles: `tsc` (paquetes y `tests/tsconfig.json`) sin errores, `eslint` sin errores, `depcruise` sin violaciones, unitarias 303/303, web 290/290. Integración Postgres 57/58: el único fallo es `rellenoHuecos` oleada, ya presente en `main`. Pendiente: prueba manual en la demo.
