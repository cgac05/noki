# Tasks

Requisito: CC = `contratos-canales`. Decisiones: D1–D4 de `design.md`. Empezar después de que `clinica-alertas` esté en `main` y hacer rebase sobre él (D4).

## 1. Contratos

- [x] 1.1 Quitar `ComprobarIdentidad` de `ComandoRequestSchema`, de su tipo exportado, de la rama de `rutasComandos.ts` y de las pruebas (D1). Requisito: CC «Comando y respuesta comunes a todos los canales». Verificación:
  - escenario «Identidad comprobada en clínica» (ahora exige que el tipo no exista) en `tests/unit/contratos.test.ts`;
  - `rg ComprobarIdentidad packages apps tests` sin resultados fuera del historial de OpenSpec.
- [x] 1.2 Quitar `metodo?: 'GET'` de `DefinicionConsulta` y de `alertasSeguridad`, y ajustar `tests/unit/consultas.test.ts`. Verificación: las pruebas de la tabla siguen en verde sin `metodo`.
- [x] 1.3 Crear `packages/contracts/src/demo.ts` con `AdelantarRelojSchema`, `RespuestaRelojSchema` y `RUTA_RELOJ_DEMO`, exportarlos y usarlos en `rutaRelojDemo.ts` (D3). Requisito: CC «Contrato del reloj de demo». Verificación: escenarios «Cuerpo del reloj» y «Respuesta del reloj», y las pruebas existentes de `reloj-demo` en verde sin cambios de comportamiento.

## 2. Documentación

- [x] 2.1 `docs/contratos.md`:
  - quitar la fila de `ComprobarIdentidad` y la nota del 404;
  - restaurar la frase del método uniforme;
  - quitar la nota de 404 de `alertasSeguridad`;
  - agregar la sección del reloj de demo.
- [x] 2.2 `AGENTS.md` §7:
  - quitar la línea de `ComprobarIdentidad` y la nota de pendiente de `/api/admin/alertas`;
  - agregar el grupo `temporizadores`, el `jobId` físico `${tipo}-${tramiteId}` de BullMQ junto al lógico, y `POST /api/demo/reloj` (solo demo).
- [x] 2.3 `PLAN.md`:
  - §7 `/clinica` sin «INE verificada»;
  - el esquema de datos con el nivel 2 y `INE_CLINICA` marcados como reservados sin uso;
  - la tabla de §8 con «agendar | datos declarados (en clínica basta el QR firmado de la cita)» (D2).
- [x] 2.4 `docs/eventos.md`: reemplazar las frases de las líneas 3 y 57 por el estado actual (outbox en Postgres, publicación a Redis Streams y consumidores idempotentes por grupo).
- [x] 2.5 `README.md`: sección «Reloj de demo» con un ejemplo de `POST /api/demo/reloj`, el límite de 10080 minutos, que solo existe con `DEMO_MODE=true` y el botón de `/admin`.

  Verificación de 2.1 a 2.5: revisión de texto contra `main` y contra los specs `reloj-demo`, `temporizadores-tramite`, `publicacion-eventos` y `atencion-clinica`.

## 3. Controles

- [x] 3.1 Punto de control sobre la rama rebasada en `main` vigente: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` en verde. Guardar los resultados y un manifiesto de archivos en `evidencias/`, sin rutas locales.
