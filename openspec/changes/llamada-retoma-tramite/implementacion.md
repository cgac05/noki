# Implementación de llamada-retoma-tramite

- **Resumen.** Una llamada de asesor retoma el trámite en proceso del mismo tipo por los últimos diez dígitos del contacto de WhatsApp o Call Center. Prioriza el trámite más reciente fuera de `BORRADOR` y, si solo hay borradores, toma el más reciente. Conserva las casillas y calcula la siguiente pregunta para Call Center. Registra `LLAMADA_CC` cuando cambia el canal del trámite, sin crear vínculos de identidad.
- **Revisión entregada.** Revisión 1 autorizada en [handoff.md](handoff.md), sobre `51e4df6` con diff pendiente.
- **Archivos modificados.** `packages/domain/src/vocabulario.ts`, `packages/application/src/CasosTramite.ts`, `packages/application/src/ports/nucleo.ts`, `packages/adapters/out-postgres/src/ContactosPostgres.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `docs/eventos.md`, `tests/unit/nucleo/casosTramite.test.ts`, `tests/integracion/llamadaRetomaTramite.test.ts`, `tasks.md`, `implementacion.md` y los Markdown en `evidencias/`.
- **Decisiones.** La búsqueda usa el sufijo del número almacenado por los canales y el índice existente `contacto_telefono`. El identificador del trámite desempata marcas de tiempo iguales. El método `Tramite.retomar` toma el canal anterior del trámite para el evento, y el hilo se actualiza después de persistir el trámite, según el patrón existente. Tres pruebas del núcleo conservaron sus aserciones originales con datos iniciales que crean trámites independientes.
- **Riesgos.** Un ANI falsificado puede hacer que el asesor vea el resumen de la demo. Si dos pacientes comparten número, la selección por actividad puede escoger el trámite de otro paciente. El guardado del hilo y el del trámite siguen siendo escrituras separadas, por lo que un fallo intermedio puede dejar el canal del hilo desactualizado.
- **Validación.** [Pruebas en rojo](evidencias/rojo.md) y [controles finales](evidencias/controles.md). La integración usó un esquema dedicado de `noki_test`, Fastify por inyección y disponibilidad de agenda simulada. La demo en navegador queda pendiente de revisión manual. Los archivos del trabajo paralelo quedaron fuera del diff de esta implementación.

## Resultado de entrega

Tareas 1.1, 1.2, 1.3, 2.1 y 3.1 registradas en [tasks.md](tasks.md). Lint y TypeScript quedaron en verde, con 0 violaciones de fronteras. Pasaron 92 pruebas del núcleo, 72 de API y 5 de integración. La suite global dio 487 aprobadas y 23 fallidas, todas las fallidas en el proyecto web. OpenSpec estricto se omitió por `ENOTCACHED`.

## Corrección de H-01

La solicitud de esta vuelta autoriza corregir H-01 en `tests/integracion/comandosHttp.test.ts`. La prueba de cotización usa el número semilla de Beto para conservar la verificación de identidad con un contacto vinculado y evitar que su cotización coincida con el número de Ana. «Flujo A por HTTP» comprueba que la llamada crea un trámite `BORRADOR` con `TramiteIniciado`. Se conservaron todas las aserciones existentes, incluida `datosRepetidos ≥ 1`.

La revisión para esta vuelta corresponde a `eedd179` con cambios locales. Los archivos de esta corrección son `tests/integracion/comandosHttp.test.ts`, este informe y [la evidencia de H-01](evidencias/h-01.md).

Los tres controles se ejecutaron en serie. El checkout bloqueó Vitest y ESLint con `EPERM`. En la copia temporal actualizada se aprobaron 5 de 5 pruebas de integración en 2 archivos, 92 de 92 pruebas unitarias del núcleo en 10 archivos y ESLint con 0 errores y 0 advertencias. Los dos controles de Vitest usaron `--configLoader native` en la copia. `git diff --check` aprobó para el archivo de prueba. Queda pendiente la segunda revisión de Claude.
