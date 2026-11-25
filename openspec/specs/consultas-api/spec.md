# consultas-api Specification

## Purpose
Define la implementación en la API de las 9 consultas GET de `RUTAS_CONSULTAS`, el puerto de lectura que las alimenta y las claves de los indicadores del tablero.

## Requirements

### Requirement: Consultas de la tabla de rutas
La API SHALL exponer cada entrada de `RUTAS_CONSULTAS` en su ruta `GET`, validar los parámetros con el esquema de la tabla (400 `VALIDACION` si no cumplen) y responder 200 con un cuerpo válido según el esquema de respuesta de la tabla. Un recurso inexistente MUST responder 404 `NO_ENCONTRADO`. Las lecturas SHALL salir de un puerto de lectura con adaptadores Postgres y en memoria que pasan la misma batería de pruebas.

#### Scenario: Cada respuesta cumple el contrato
- **WHEN** una prueba recorre las 9 consultas con datos sembrados
- **THEN** cada respuesta se valida sin errores con su esquema de `RUTAS_CONSULTAS`

#### Scenario: Parámetro que no es UUID v7
- **WHEN** se consulta `/api/tramites/123`
- **THEN** responde 400 `VALIDACION`

#### Scenario: Trámite inexistente
- **WHEN** se consulta un `tramiteId` UUID v7 que no existe
- **THEN** responde 404 `NO_ENCONTRADO`

#### Scenario: Misma batería con ambos adaptadores
- **WHEN** la batería del puerto de lectura se ejecuta contra memoria y contra Postgres
- **THEN** ambas pasan las mismas comprobaciones

### Requirement: Contenido de cada consulta
Cada consulta SHALL devolver exactamente el contenido siguiente:

- `tramite`: la vista del trámite guardado.
- `lineaTiempo`: los eventos del hilo, incluidos los que no tienen trámite, en orden de `ts` e id, sin payload.
- `tramitesAbiertos`: los trámites del paciente que no están en `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` ni `EXPIRADO`.
- `catalogo`: cada oferta activa de servicio en sede con nombres y precio en centavos.
- `fichaHilo`: nombre de pila del paciente del trámite abierto más reciente del hilo (`null` si no tiene), teléfono del hilo enmascarado (`null` si el hilo no tiene teléfono) a los últimos 4 dígitos, trámites del hilo, línea de tiempo, `soloLectura` (verdadero solo si el último `CanalCambiado` del hilo va de `callcenter` a otro canal y el último canal del hilo no es `callcenter`), oferta cotizada del trámite abierto más reciente y `codigoContinuacion` mientras el código de continuación siga vigente y sin usar (design D12).
- `citasPaciente`: los trámites del paciente en `CONFIRMADA`, `EN_CLINICA` o `ATENDIDA`, ordenados por inicio, con nombres de servicio y sede, zona IANA de la sede y `tokenQr`.
- `llegadasSede`: las citas `CONFIRMADA` o `EN_CLINICA` de la sede con inicio desde el comienzo del día actual en la zona de la sede, con `registrada` verdadero si ya están `EN_CLINICA` y, en ese caso, su `posicion` según «Fila de la sede» (capacidad `atencion-clinica`), máximo 50.
- `alertasSeguridad`: las alertas de «Alertas de seguridad» (capacidad `atencion-clinica`).
- `metricas`: conteo por cada uno de los 10 estados en el orden del vocabulario (0 si no hay) y los indicadores definidos en "Claves de indicadores".
- `bandeja`: los mensajes de la bandeja simulada, del más reciente al más antiguo.

Las consultas MUST NOT incluir fecha de nacimiento, correo, RFC, PIN, CURP, teléfono completo ni folio.

#### Scenario: Ficha de Ana
- **WHEN** se consulta la ficha del hilo sembrado de Ana
- **THEN** el nombre de pila es "Ana", el teléfono es `•••• 0001` y la respuesta no contiene `5210000000001`

#### Scenario: Llegadas en la zona de la sede
- **WHEN** el reloj está en 2026-11-26 08:00 UTC (01:00 en `America/Mazatlan`) y hay una cita confirmada en Tepic el 2026-11-26 a las 16:15 UTC y otra el 2026-11-25 a las 16:15 UTC
- **THEN** `llegadasSede` de Tepic incluye solo la del 26 con `registrada` falso

#### Scenario: Línea de tiempo con intento fallido
- **WHEN** un contacto del hilo falla una verificación y se consulta la línea de tiempo
- **THEN** aparece `IntentoVerificacionFallido` sin datos del intento

#### Scenario: Ficha en solo lectura tras continuar en WhatsApp
- **WHEN** un trámite del hilo se continuó del call center a WhatsApp y no hubo llamadas después
- **THEN** `fichaHilo` tiene `soloLectura` verdadero

#### Scenario: Llamada nueva desbloquea la ficha
- **WHEN** después de esa continuación entra una llamada nueva desde el mismo número
- **THEN** `fichaHilo` tiene `soloLectura` falso, incluye el trámite nuevo y el asesor puede cotizarlo e identificar al paciente sin `pnpm demo:reset`

#### Scenario: Llegadas con posición
- **WHEN** en Tepic hay dos llegadas registradas y una cita confirmada sin llegada
- **THEN** `llegadasSede` da a las registradas `posicion` 1 y 2 por orden de llegada y deja sin `posicion` a la cita sin llegada

### Requirement: Claves de indicadores
`metricas.kpis` SHALL contener exactamente las claves `cambiosCanal`, `cambiosCanalPorHilo`, `tramitesRecuperados`, `citasConfirmadas`, `llegadasRegistradas`, `datosRepetidos` e `intentosVerificacionFallidos`, calculadas sobre todo el histórico de eventos según design D7. Las mismas claves y valores SHALL emitirse en `admin:metricas`.

#### Scenario: Flujo A sin datos repetidos
- **WHEN** se recorre el Flujo A (call center → WhatsApp → clínica) sobre una base vacía
- **THEN** `cambiosCanal` es igual al número de `CanalCambiado` guardados y al menos 1, `tramitesRecuperados` es 1, `citasConfirmadas` es 1, `llegadasRegistradas` es 1 y `datosRepetidos` es 0

#### Scenario: Selección repetida
- **WHEN** en un mismo trámite se selecciona dos veces la misma sede
- **THEN** `datosRepetidos` aumenta en 1

#### Scenario: Base vacía
- **WHEN** no hay eventos
- **THEN** todas las claves valen 0 y `porEstado` tiene los 10 estados con 0

### Requirement: Bandeja solo en modo demo
`GET /api/demo/bandeja` SHALL existir solo con `DEMO_MODE=true`; en otro caso MUST responder 404 como cualquier ruta inexistente. Los mensajes SHALL guardarse con un puerto de bandeja con adaptadores Postgres y en memoria.

#### Scenario: Bandeja fuera de demo
- **WHEN** con `DEMO_MODE=false` se consulta `/api/demo/bandeja`
- **THEN** responde 404

#### Scenario: Bandeja vacía en demo
- **WHEN** con `DEMO_MODE=true` y sin mensajes se consulta la bandeja
- **THEN** responde 200 con una lista vacía
