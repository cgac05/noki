# Revisión: clinica-alertas

## Primera vuelta (2026-11-25)

- **Dictamen: PASS**, con una sugerencia que no bloquea (H-01).
- **Base revisada:** árbol `noki-identidad`, rama `feat/clinica-alertas` sobre `e3d49ea`, cambios sin commit (17 archivos modificados y 3 nuevos de prueba). Revisión 2 autorizada en `handoff.md`.
- **Controles repetidos por Claude**, con código 0:
  - `corepack pnpm lint` y `corepack pnpm lint:deps`;
  - `corepack pnpm test`: 339/339;
  - `tests/integracion/ejecutar.ts`: 46/46, con Postgres de prueba en 55432 y Redis;
  - `openspec validate clinica-alertas --strict`: válido.
- **Alcance:** solo archivos del frente A. Sin cambios en `packages/contracts`, `docs/`, `AGENTS.md`, `PLAN.md` ni `apps/web`, y sin migraciones ni dependencias.

### Comprobado sin hallazgos

- **`CerrarAtencion` (D1, D3):**
  - regla `SOLO_RECEPCION` antes de cargar;
  - la fila se lee antes de cerrar, y los `TurnoActualizado` usan una clave nueva por trámite y el mismo `correlation_id`;
  - un fallo registra `TURNO_NO_ACTUALIZADO` y no cambia la respuesta.
  - Pruebas: cierre en los índices 0 y 1 («Cerrar al primero» y «Cerrar a quien terminó antes»), claves únicas, fallo simulado y fuera de recepción.
- **Fila de la sede:** `filaSede` en memoria (por el `ts` mínimo de `PacienteLlego` y por id) y en Postgres (`min(e.ts), c.id` sobre el mismo conjunto que `llegadasSede`). La batería `bateriaClinica.ts` corre igual contra memoria y contra Postgres. `llegadasSede` solo pone `posicion` en citas `EN_CLINICA`.
- **Alertas (D5):** filtran `IntentoVerificacionFallido` con y sin trámite, de más nuevo a más viejo, con límite 50 (probado con 60) y `bloqueado` cuando `intentos >= 3`. Hay paridad entre memoria y Postgres. Según `evidencias/recorrido-http.md`, la respuesta no contiene teléfono ni fecha.
- **`sede:fila` (D4):** se emite con la posición real al llegar, con `payload.posicion` en `TurnoActualizado` y con 0 en `AtencionCerrada`. `clinicaMemoria.test.ts` comprueba la secuencia A=1, A=0, B=1.
- **`ComprobarIdentidad`:** conserva el 404 (D2).

### Hallazgos

| ID | Gravedad | Requisito | Hallazgo | Corrección |
|---|---|---|---|---|
| H-01 | Sugerencia | tasks 1.1 («no registra nada si la posición no cambia») | `Tramite.posicionTurno` es un campo en memoria que `rehidratar` no restaura, así que la guarda solo funciona dentro de una misma instancia. Hoy no afecta: `cerrarAtencion` solo llama a `actualizarTurno` en trámites cuya posición baja. Pero un uso futuro con un trámite recién cargado registraría eventos repetidos. | Derivar la posición actual del último `TurnoActualizado` o de la fila, o quitar la guarda y documentar que quien llama decide. Puede ir en un cambio posterior. |

### Condiciones de cierre

- Commit, rebase sobre `main` vigente (sigue siendo `e3d49ea`; no hay rebase si no avanza), push y fast-forward con autorización del frente A.
- Después: `documentacion-compartida` (en el checkout `noki`) hace rebase sobre este cambio integrado.
