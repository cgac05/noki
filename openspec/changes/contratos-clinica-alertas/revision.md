# Revisión: contratos-clinica-alertas

## Primera vuelta (2026-11-25)

- **Dictamen: PASS**, con una sugerencia que no bloquea (H-01).
- **Base revisada:** checkout `noki`, rama local `feat/contratos-clinica-alertas` rebasada sobre `main` `0b06351` (commits `db24883` y `8ea1e23`, reescrituras de `d9929d9` y `267dad2`). Implementación sin commit. Revisión 1 con vistos buenos A y B en `handoff.md`.
- **Controles repetidos por Claude**, con código 0:
  - `corepack pnpm lint` y `corepack pnpm lint:deps`;
  - `corepack pnpm test`: 333/333;
  - `tests/integracion/ejecutar.ts`: 45/45, con Postgres de prueba en 55432 y Redis;
  - `openspec validate contratos-clinica-alertas --type change --strict`: válido.
- **Alcance:** los archivos cambiados fuera de `openspec/` son exactamente los de `proposal.md` (Impact): `packages/contracts/src/{comandos,consultas}.ts`, `rutasComandos.ts`, `guionFlujoA.ts`, `docs/contratos.md`, `AGENTS.md` §7 y las dos pruebas. `index.ts` no necesitó cambios porque ya reexporta los módulos. Sin dependencias nuevas.

### Comprobado sin hallazgos

- **D1:** `ComprobarIdentidad` exige `tramiteId` y `payload` estricto `{ metodo: 'INE_CLINICA' }`. Rechaza `OTP_SMS` y campos extra como `folio`.
- **D2:** `CerrarAtencion` exige `tramiteId` y `payload: {}` estricto. El contrato no limita qué cita de la fila se cierra, como acordaron los dos frentes.
- **D3:** `posicion` es entera ≥ 1, opcional y prohibida con `registrada: false` mediante `refine`. Las respuestas actuales siguen siendo válidas.
- **D4:**
  - `AlertaSeguridadSchema` tiene `id`, `tipo` literal, `canal`, `ts`, `intentos`, `bloqueado` y `hiloId` nullable;
  - descarta campos extra (prueba con `telefono`) y entra en el recorrido de claves sensibles;
  - `alertasSeguridad` es `/api/admin/alertas`, no es solo demo y acepta 50 elementos pero rechaza 51.
- **D5:** los dos comandos lanzan `NoEncontrado('operacion', id)` (404) sin cambiar el trámite, con prueba HTTP en memoria. La ruta de alertas no se registra (404) y el mock web devuelve `alertasSeguridad: []`.
- **Documentación:** `docs/contratos.md` y `AGENTS.md` §7 coinciden con el contrato. `docs/eventos.md` no cambia.

### Hallazgos

| ID | Gravedad | Requisito | Hallazgo | Corrección |
|---|---|---|---|---|
| H-01 | Sugerencia | contratos-consultas «Tabla de rutas de consulta» | `DefinicionConsulta` agrega `metodo?: 'GET'`, pero solo `alertasSeguridad` lo declara. `docs/contratos.md` dejó de decir que el método no se repite por entrada. La tabla queda heterogénea y ninguna decisión del diseño lo pide. | Quitar `metodo` de la entrada y de la interfaz, y restaurar la frase, o declararlo en las 11 entradas. Se puede hacer en el cambio del núcleo `clinica-alertas`. |

### Condiciones de cierre

- Al reescribirse en el rebase, los commits de Luis (`d9929d9`, `267dad2`) en `origin/feat/contratos-clinica-alertas` divergen de la rama local. Publicar la rama exige `--force-with-lease`, o integrar en `main` sin pasar por la rama remota.
- Es un cambio compartido: el cierre (commit, integración en `main`, sincronización y archivado) necesita la autorización de los frentes A y B. La de Luis tiene que estar escrita por él o transmitida textualmente y atribuida.
