# Spec Delta

## Purpose

Fija en el paquete de contratos la forma de los datos de lectura que consultan los canales y las rutas que los entregan, para que la API del núcleo y las vistas usen una sola definición validable en ejecución.

## ADDED Requirements

### Requirement: Modelos de lectura compartidos
El paquete de contratos SHALL definir esquemas, con sus tipos derivados, para: oferta de catálogo (servicio y sede con nombres y precio en centavos), cita (trámite, servicio, sede, inicio ISO en UTC, zona horaria IANA de la sede y token para el QR), ficha del hilo, llegada esperada, mensaje de bandeja de demo y métricas (conteo por estado e indicadores).

#### Scenario: Cita válida
- **WHEN** se valida una cita con trámite confirmado, inicio ISO, zona `America/Mazatlan` y token
- **THEN** la validación tiene éxito y el tipo resultante coincide con el tipo exportado

#### Scenario: Zona horaria inválida
- **WHEN** se valida una cita con zona horaria `Tepic/Centro`
- **THEN** la validación falla e indica el campo de la zona horaria

#### Scenario: Precio en centavos
- **WHEN** se valida una oferta de catálogo con precio `250.5`
- **THEN** la validación falla porque el precio debe ser un entero no negativo en centavos

### Requirement: Lecturas sin acciones prearmadas
Los modelos de lectura SHALL contener solo datos. MUST NOT incluir comandos listos para enviar ni listas de acciones; el canal arma cada comando con el esquema de comandos a partir del dato elegido.

#### Scenario: Ficha sin acciones
- **WHEN** se valida una ficha del hilo que incluye un campo `acciones`
- **THEN** el resultado validado no contiene `acciones`

#### Scenario: Llegada sin comando
- **WHEN** se inspecciona el esquema de llegada
- **THEN** no declara ningún comando; contiene la cita con su token, del que la recepción arma `RegistrarLlegada`

### Requirement: Lecturas sin datos sensibles
Los modelos de lectura MUST NOT declarar fecha de nacimiento, correo, RFC, PIN ni CURP. El teléfono solo SHALL aparecer enmascarado, mostrando los últimos 4 dígitos, y el contenido de la bandeja solo existe para la consulta de demo.

#### Scenario: Teléfono completo rechazado
- **WHEN** se valida una ficha con el teléfono `5210000000001` en el campo enmascarado
- **THEN** la validación falla

#### Scenario: Campos sensibles ausentes
- **WHEN** una prueba recorre las claves de todos los esquemas de lectura
- **THEN** ninguna es `fechaNac`, `email`, `rfc`, `pin` ni `curp`

### Requirement: Tabla de rutas de consulta
El contrato SHALL publicar una tabla única que asocie cada consulta (`tramite`, `lineaTiempo`, `tramitesAbiertos`, `catalogo`, `fichaHilo`, `citasPaciente`, `llegadasSede`, `metricas`, `bandeja`) con su método `GET`, su plantilla de ruta, el esquema de sus parámetros y el esquema de su respuesta. Las rutas MUST conservar las de `AGENTS.md` §7 que ya existían.

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
