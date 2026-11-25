# Pruebas antes de la implementación

Línea base de producto `51e4df6`. La copia de validación incluía el trabajo paralelo visible al iniciarse.

| Tarea | Control | Resultado |
|---|---|---|
| 1.1 | `corepack pnpm exec vitest run --configLoader native tests/unit/nucleo/casosTramite.test.ts` | 1 archivo, 37 pruebas aprobadas y 4 fallidas. Las cuatro fallaron porque el inicio devolvía un identificador nuevo, incluso con prefijo de país, ante un borrador más reciente o con paciente asignado. |
| 2.1 | `corepack pnpm exec vitest run --configLoader native --project integracion tests/integracion/llamadaRetomaTramite.test.ts` | 1 archivo, 1 prueba fallida. WhatsApp persistió `COTIZADO`; el inicio por llamada devolvió otro identificador y estado `BORRADOR`. Se reprodujo con el caso de uso previo en la copia de validación. |
