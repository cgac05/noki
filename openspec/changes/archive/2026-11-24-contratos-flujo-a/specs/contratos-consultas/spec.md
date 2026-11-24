# Spec Delta

## MODIFIED Requirements

### Requirement: Lecturas sin datos sensibles
Los modelos de lectura MUST NOT declarar fecha de nacimiento, correo, RFC, PIN ni CURP. El teléfono solo SHALL aparecer enmascarado, mostrando los últimos 4 dígitos, y el contenido de la bandeja solo existe para la consulta de demo. En la ficha del hilo, el nombre de pila y el teléfono enmascarado SHALL ser `null` cuando el hilo no tiene paciente vinculado o no tiene teléfono; MUST NOT sustituirse por un valor inventado.

#### Scenario: Teléfono completo rechazado
- **WHEN** se valida una ficha con el teléfono `5210000000001` en el campo enmascarado
- **THEN** la validación falla

#### Scenario: Campos sensibles ausentes
- **WHEN** una prueba recorre las claves de todos los esquemas de lectura
- **THEN** ninguna es `fechaNac`, `email`, `rfc`, `pin` ni `curp`

#### Scenario: Ficha de un hilo anónimo
- **WHEN** se valida una ficha con `nombrePila` y `telefonoEnmascarado` nulos
- **THEN** la validación tiene éxito

### Requirement: Tabla de rutas de consulta
El contrato SHALL publicar una tabla única que asocie cada consulta (`tramite`, `lineaTiempo`, `tramitesAbiertos`, `catalogo`, `fichaHilo`, `citasPaciente`, `llegadasSede`, `metricas`, `bandeja`, `contextoDemo`) con su método `GET`, su plantilla de ruta, el esquema de sus parámetros y el esquema de su respuesta. Las rutas MUST conservar las de `AGENTS.md` §7 que ya existían. `contextoDemo` (`/api/demo/contexto`) SHALL responder `{ hiloId, pacienteId, sedeId }`, cada uno UUID v7 o `null`, y MUST estar marcada como disponible solo en modo demo. La API MUST responder 404 en `/api/demo/contexto` cuando `DEMO_MODE` no es `true`.

#### Scenario: Ruta construida desde parámetros
- **WHEN** se arma la ruta de `lineaTiempo` con un `hiloId` UUID v7
- **THEN** el resultado es `/api/hilos/<hiloId>/linea-tiempo`

#### Scenario: Parámetro inválido
- **WHEN** se arma la ruta de `citasPaciente` con un `pacienteId` que no es UUID v7
- **THEN** la validación de parámetros falla sin producir una ruta

#### Scenario: Rutas existentes conservadas
- **WHEN** se compara la tabla con las consultas de `AGENTS.md` §7
- **THEN** `tramite`, `lineaTiempo`, `tramitesAbiertos` y `metricas` usan `/api/tramites/:id`, `/api/hilos/:id/linea-tiempo`, `/api/pacientes/:id/tramites-abiertos` y `/api/admin/kpis`

#### Scenario: Bandeja marcada como demo
- **WHEN** se inspecciona la entrada `bandeja` de la tabla
- **THEN** está marcada como disponible solo en modo demo

#### Scenario: Contexto de demo
- **WHEN** se inspecciona la entrada `contextoDemo` y se valida una respuesta con `pacienteId` nulo
- **THEN** está marcada como solo demo y la respuesta es válida

#### Scenario: Contexto fuera de modo demo
- **WHEN** la API corre con `DEMO_MODE` distinto de `true` y se consulta `/api/demo/contexto`
- **THEN** responde 404
