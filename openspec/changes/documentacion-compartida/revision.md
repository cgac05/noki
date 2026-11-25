# Revisión: documentacion-compartida

## Primera vuelta (2026-11-25)

- **Dictamen: PASS**, con dos sugerencias que no bloquean.
- **Base revisada:** checkout `noki`, rama `feat/documentacion-compartida` sobre `main` `71f01f5`, cambios sin commit (12 archivos modificados y `packages/contracts/src/demo.ts` nuevo). Revisión 1 con vistos buenos A y B en `handoff.md`.
- **Controles repetidos por Claude**, con código 0:
  - `corepack pnpm lint` y `corepack pnpm lint:deps`;
  - `corepack pnpm test`: 341/341;
  - `tests/integracion/ejecutar.ts`: 46/46, con Postgres 55432 y Redis;
  - `openspec validate documentacion-compartida --strict`: válido.
- **Alcance:** `apps/web` sin cambios. No queda ninguna referencia a `ComprobarIdentidad` en `packages`, `apps` ni `tests`.

### Comprobado sin hallazgos

- **D1:** `ComprobarIdentidad` salió del esquema, del tipo exportado y de `rutasComandos.ts`. La prueba exige que el tipo falle en `tipo`.
- **D2:** `PLAN.md` marca el nivel 2 y `INE_CLINICA` como reservados sin uso. `/clinica` queda con QR firmado → `RegistrarLlegada` y `CerrarAtencion`, y §8 dice «en clínica basta el QR firmado».
- **D3:** `demo.ts` con `AdelantarRelojSchema` (de 1 a 10080, entero), `RespuestaRelojSchema` y `RUTA_RELOJ_DEMO` (`POST`, solo demo). `rutaRelojDemo.ts` los usa y conserva su 400. Hay pruebas de cuerpo y de respuesta, y las de `reloj-demo` siguen en verde.
- Tabla de rutas sin `metodo`, con una prueba que lo exige en las 11 entradas. `docs/contratos.md` recupera la frase del método uniforme.
- Las notas de 404 de las alertas desaparecieron de `docs/contratos.md` y de `AGENTS.md` §7.
- `AGENTS.md` §7 incluye el grupo `temporizadores` y el `jobId` físico.
- `docs/eventos.md` describe el outbox, el relay y los consumidores idempotentes.
- El README tiene la sección del reloj, con el puerto 4000 correcto.

### Sugerencias

| ID | Gravedad | Hallazgo | Corrección |
|---|---|---|---|
| H-01 | Sugerencia | La prueba arma el nombre retirado como `'Comprobar' + 'Identidad'`, al parecer para que no aparezca en la búsqueda de la tarea 1.1. Se lee peor que escribir el literal. | Usar el literal y dejar la búsqueda fuera de las pruebas. Puede ir en otro cambio. |
| H-02 | Sugerencia | En `AGENTS.md` §7, la razón del `jobId` físico dice que los IDs de BullMQ «admiten el guion». La razón real es que BullMQ rechaza `:` en un `jobId` propio (design de `temporizadores`). | Redactar «porque BullMQ no admite `:` en un `jobId` propio». |

### Condiciones de cierre

Es un cambio compartido. El cierre (commit, push, fast-forward de `main`, sincronización de specs y archivado) necesita la autorización de los frentes A y B. La de Luis tiene que estar escrita por él o transmitida textualmente y atribuida.
