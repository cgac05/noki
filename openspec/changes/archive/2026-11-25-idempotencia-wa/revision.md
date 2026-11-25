# Revisión: idempotencia-wa

## Primera vuelta (2026-11-25)

- **Dictamen: BLOCKED.** La corrección técnica funciona y los controles están en verde. Faltan dos decisiones del responsable del frente A (H-01 y H-02) antes de recomendar el cierre.
- **Base revisada:** árbol `noki-identidad`, rama `feat/idempotencia-wa` sobre `b66e393` (igual que `origin/main`), cambios sin commit.
- **Controles repetidos por Claude**, con código 0:
  - `corepack pnpm lint` y `corepack pnpm lint:deps`;
  - `corepack pnpm test`: 353/353;
  - `tests/integracion/ejecutar.ts`: 47/47, con Postgres de prueba en 55432 y Redis.

### Comprobado sin hallazgos

- **D1:** `contextoOperacion()` da la `Idempotency-Key` del mensaje a la primera operación y una clave nueva, con el mismo `correlationId`, a las siguientes. Se usa en todas las llamadas a `casos` de `ConversacionWa`, también dentro de `aplicar`.
- **D2:**
  - `clavesEventos.ts` comparte el conjunto de claves entre `TramiteRepoMemoria` y `EventosSinTramiteMemoria`;
  - `registrarClaves` se ejecuta antes de cambiar el estado;
  - `crearApiPruebas` activa el modo estricto y las pruebas del núcleo siguen sin él;
  - hay una prueba de «Clave repetida en memoria».
- **Regresión:** `evidencias/01-rojo.txt` muestra el 500 antes de la corrección. La batería `bateriaIdempotenciaWa.ts` corre en memoria y contra Postgres con `sd-mock`, con claves distintas, la misma correlación y un reintento idéntico sin eventos nuevos.

### Hallazgos

| ID | Gravedad | Requisito o regla | Hallazgo | Corrección |
|---|---|---|---|---|
| H-01 | Bloqueante (proceso) | `CLAUDE.md` y `docs/colaboracion-openspec.md`: la autorización la escribe el responsable | `handoff.md` registra como autorización el texto del prompt de implementación («revisión 1 autorizada»). En el hilo no hay una autorización escrita por un responsable del frente A para esta revisión. | Que Christian, o `J3sus-esb`, escriba en el hilo la autorización de la revisión 1 junto con su decisión sobre H-02. Claude la registra. |
| H-02 | Media (alcance) | `proposal.md` Impact y design D1 | Para cumplir el escenario «Paciente asignado desde el call center», que nombra `PreparacionAceptada`, Codex agregó `CasosTramite.aceptarPreparacion` y cambió el botón «Acepto la preparación» de WhatsApp para emitir `PreparacionAceptada` en lugar de `RequisitoCumplido { requisitoId: 'ACEPTAR_PREPARACION' }`. `CasosTramite.ts` no estaba en Impact y el cambio de evento no estaba en el diseño. El escenario lo escribió Claude dando por hecho ese evento, así que el error de origen está en la propuesta. | Elegir una: **(a)** aceptarlo y actualizar `proposal.md` y `design.md` (D3) como revisión 2 solo de documentos. Usa el evento propio del dominio que ya existía (`Tramite.aceptarPreparacion`, vocabulario de `PLAN.md` y `docs/eventos.md`), y ningún consumidor ni KPI depende de `RequisitoCumplido` para la preparación. **(b)** Revertir a `cumplirRequisito` y corregir el escenario a `RequisitoCumplido`. Claude recomienda (a). |

### Siguiente paso

Con la autorización y la elección de H-02, Claude prepara la revisión 2 (solo documentos, si es la opción a), la registra y repite esta revisión. Después pide la autorización de cierre.

## Segunda vuelta (2026-11-25)

- **Dictamen: PASS.**
- **H-01, resuelto:** Christian escribió en el hilo «Autorizo idempotencia-wa revisión 1 y elijo la opción (a) para H-02». Quedó registrado en `handoff.md`.
- **H-02, resuelto con la opción (a):** la revisión 2, que solo cambia documentos, agrega `CasosTramite.aceptarPreparacion` a `proposal.md` (What Changes e Impact) y como design D3. El código ya coincidía con esa revisión. Comprobé que `RequisitoCumplido` para la preparación no lo usa ningún consumidor, lectura ni KPI. Solo aparece en un evento ilustrativo del guion simulado de `apps/web`, que no depende del tipo.
- **Controles:** los de la primera vuelta siguen valiendo porque el código no cambió (353/353 y 47/47, más lint y lint:deps). `openspec validate idempotencia-wa --strict` da válido con la revisión 2.
- **Condición de cierre:** autorización de cierre del frente A. `main` sigue en `b66e393`, así que no hace falta rebase.
