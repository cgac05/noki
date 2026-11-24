# Proposal

## Why

`@noki/contracts` define comandos, mensajes y tiempo real, pero no las consultas de lectura. La web las simula con tipos provisionales en `apps/web/src/cliente/provisional.ts`, y el frente A va a construir las rutas `GET` en `api-comandos` (horas 10–14 de `docs/trabajo-paralelo.md`). Si el contrato no existe antes, cada frente definirá su propia forma de los datos, y la integración del Flujo A (horas 14–18) tendrá que reconciliarlas con el reloj en contra. Este cambio compartido fija esas formas una sola vez.

## What Changes

- Nuevo módulo `consultas.ts` en `@noki/contracts`: esquemas Zod (tipos con `z.infer`) de los modelos de lectura que hoy son provisionales: catálogo (oferta de servicio por sede), cita, ficha del hilo, llegada, mensaje de bandeja y métricas.
- **Solo datos, sin acciones prearmadas.** Los modelos de lectura no incluyen comandos listos para enviar (`acciones`, `accion`): la vista arma el comando a partir del dato que el usuario elige, usando `ComandoRequestSchema`. El núcleo no tiene que calcular "acciones disponibles". **Decisión que requiere el acuerdo de ambos frentes.**
- Tabla de rutas de consulta en el contrato (`RUTAS_CONSULTAS`): para cada consulta, método `GET`, plantilla de ruta, esquema de parámetros y esquema de respuesta. Consultas: `tramite`, `lineaTiempo`, `tramitesAbiertos`, `catalogo`, `fichaHilo`, `citasPaciente`, `llegadasSede`, `metricas` y `bandeja` (esta última solo en modo demo).
- Migración de `apps/web` al contrato: el cliente (simulado y real) usa los esquemas de `@noki/contracts`; las vistas que hoy reciben acciones prearmadas arman el comando a partir de los datos. `provisional.ts` queda reducido a los tipos exclusivos de la demo (paso del guion, conversación de WhatsApp y cotización de `/web`), renombrado a `demo.ts`.
- El cliente real puede consultar todas las rutas de la tabla, en lugar de devolver `NO_DISPONIBLE` para casi todas.
- Documentación compartida: `docs/contratos.md` (módulo nuevo) y la lista de consultas de `AGENTS.md` §7, que suma las rutas nuevas y conserva `/api/admin/embudo` y `/api/admin/huecos` marcadas como pendientes. En `docs/trabajo-paralelo.md` se completa el usuario de GitHub de Christian Avila (`cgac05`), hoy "por registrar".

Fuera de alcance: implementar las rutas en `apps/api` (lo hace el frente A en `api-comandos`); la conversación de WhatsApp con historial (cambio `simulador-wa`); embudo y panel de huecos (`GET /api/admin/embudo`, `/api/admin/huecos`, llegan con sus extras); autenticación y token de contexto de las consultas (cambio de seguridad); paginación.

## Capabilities

### New Capabilities
- `contratos-consultas`: forma compartida y validable en ejecución de las consultas de lectura de los canales y de sus rutas.

### Modified Capabilities
- `cliente-api-canales`: los datos de lectura dejan de ser provisionales y se validan con el contrato compartido; el modo real consulta todas las rutas de la tabla.

## Impact

- Archivos compartidos: `packages/contracts/src/consultas.ts` e `index.ts`, `docs/contratos.md`, `AGENTS.md` §7, `docs/trabajo-paralelo.md`. Pruebas nuevas en `tests/unit/`. **Requiere la autorización de un responsable de cada frente.**
- Frente B: `apps/web/src/cliente/**` y las vistas `CallCenter`, `Clinica` y `Web`, que dejan de recibir acciones prearmadas.
- Frente A: ningún cambio de código ahora; `api-comandos` deberá responder con estos esquemas.
- Sin dependencias nuevas.
- **Seguridad, pendiente:** las consultas de este contrato no tienen autenticación ni token de contexto, y exponen datos personales: nombre de pila, teléfono enmascarado, citas con su token de QR, llegadas por sede y la bandeja de demo. Solo pueden usarse en la demo. El cambio de seguridad debe cerrarlo antes de usarlas fuera de la demo.
- Riesgo: si el núcleo necesita un campo que aquí falta, se agrega en un cambio compartido posterior; los campos nuevos opcionales no rompen a la web.
