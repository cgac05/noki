# Implementación de idempotencia-wa

- Resumen. WhatsApp usa la clave de la solicitud en la primera operación del núcleo y un UUID v7 nuevo en cada operación posterior, con la misma correlación. Los repositorios en memoria de la API de pruebas rechazan duplicados entre ambos adaptadores antes de guardar.
- Revisión entregada. Revisión 1 sobre b66e393 en feat/idempotencia-wa. Autorización de implementación registrada desde el chat en handoff.md.
- Archivos modificados. [Manifiesto](evidencias/manifiesto.md).
- Tareas. 1.1–3.1 completas.
- Decisión de implementación. En la base, el botón de preparación emitía RequisitoCumplido porque usaba el caso genérico. Para cumplir el escenario aprobado, el botón usa CasosTramite.aceptarPreparacion, que delega en el método del agregado ya existente y emite PreparacionAceptada. Los demás requisitos conservan el caso genérico.
- Limitaciones. Los fallos parciales siguen sujetos al comportamiento de la capa HTTP existente, según D1. Revisión independiente pendiente.

| Validación | Resultado | Evidencia |
|---|---|---|
| 1.1 · Claves únicas en memoria | Rojo y luego PASS. Duplicados entre adaptadores y dentro de un lote, versión persistida y eventos pendientes. | tests/unit/api/clavesEventosMemoria.test.ts |
| 2.1 · Regresión previa | FAIL esperado. HTTP 500 al aceptar la preparación. | [Salida en rojo](evidencias/01-rojo.txt) |
| 2.2–2.3 · WhatsApp y reintento | PASS en memoria y Postgres con sd-mock. HTTP 200, reserva en el horario elegido, dos claves distintas y reintento sin nuevos eventos. | tests/unit/api/idempotenciaWaMemoria.test.ts y tests/integracion/idempotenciaWa.test.ts |
| 3.1 · Controles | PASS. Lint, fronteras, unitarias y web, e integración. | [Controles](evidencias/controles.md) |
