# Implementación de curp-demo-flexible

- Revisión entregada: revisión 1 autorizada en handoff.md. El checkout estaba en eedd179 al validar, con diff pendiente. Los hashes de los artefactos autorizados coincidieron antes de actualizar tasks.md.
- D1 acepta 18 caracteres ASCII alfanuméricos en mayúsculas en el contrato. La aplicación conserva el modo estricto por defecto y ambas composiciones de API habilitan la opción con el indicador de demo.
- D2 avanza a DATOS mediante marcarSinCurp si el verificador, el formato oficial o la fecha declarada no cuadran en demo. D3 usa los datos de nacimiento de la CURP válida y omite la CURP del registro cuando los nombres no coinciden.
- Tarea 1.1 marcada con evidencia directa de la reproducción en rojo. Tarea 1.2 implementada con verificación parcial, pendiente del verde requerido por Vitest. Tarea 1.3 ejecutada y bloqueada por permisos de lectura en node_modules.
- La comprobación de la web encontró que apps/web/src/cliente/identificacion.ts normaliza la captura y valida con ComandoRequestSchema. No se encontró una segunda regla de formato CURP en el formulario. Se conservó el alcance de canales y adaptadores.
- Riesgos y limitaciones: demo admite valores sintéticos no verificables y los omite del registro. La ejecución de la ruta de demo, el esquema Zod y la integración HTTP/Postgres quedan sin verificar en este entorno.

## Archivos

- packages/contracts/src/comandos.ts
- packages/application/src/CasosTramite.ts
- apps/api/src/componerComandos.ts
- apps/api/src/pruebas.ts
- tests/unit/contratos.test.ts
- tests/unit/nucleo/casosTramite.test.ts
- tasks.md, implementacion.md y evidencias/controles.md del cambio

## Validación

[Controles, resultados y evidencia](evidencias/controles.md).
