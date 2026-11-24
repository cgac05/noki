# cliente-api-canales Specification

## Purpose

Define el único punto por el que las vistas de los canales hablan con el cerebro: una interfaz con modo simulado y modo real, validada contra los contratos compartidos, para que el frontend avance sin la API y se conecte a ella sin cambiar las vistas.

## Requirements

### Requirement: Interfaz única con dos modos
Las vistas SHALL acceder a comandos, mensajes de WhatsApp, consultas y eventos de tiempo real solo a través de una interfaz de cliente. El modo SHALL elegirse con `VITE_API` (`mock` o `real`, por defecto `mock`), y cambiarlo MUST NOT requerir cambios en ninguna vista. Un valor distinto MUST impedir el arranque con un mensaje claro.

#### Scenario: Cambio de modo sin tocar vistas
- **WHEN** se compila la web con `VITE_API=real` después de haberla usado con `mock`
- **THEN** la compilación termina sin modificar ningún archivo de vistas, y las vistas usan el cliente real

#### Scenario: Valor inválido
- **WHEN** se arranca con `VITE_API=prueba`
- **THEN** la aplicación muestra un error de configuración que indica los valores válidos

#### Scenario: Vistas sin acceso directo a la red
- **WHEN** se buscan llamadas a `fetch` o a Socket.IO en los archivos de vistas
- **THEN** no hay ninguna; solo el cliente las contiene

### Requirement: Respuestas validadas contra los contratos
En ambos modos el cliente SHALL validar con `@noki/contracts` toda respuesta de comando (`RespuestaComando`), de mensaje de WhatsApp (`RespuestaMensajeWa`), de error (`CuerpoError`) y todo dato de evento de tiempo real (`ESQUEMAS_EVENTOS_SOCKET`) antes de entregarlo a una vista. Una respuesta que no cumpla el esquema MUST convertirse en un error de contrato.

#### Scenario: Datos simulados válidos
- **WHEN** una prueba recorre todas las respuestas y eventos del guion simulado
- **THEN** cada uno cumple su esquema de `@noki/contracts`

#### Scenario: Respuesta real mal formada
- **WHEN** en modo real el servidor responde a un comando con un trámite sin `tipo`
- **THEN** la vista recibe un error de contrato y no un trámite parcial

#### Scenario: Comandos validados antes de enviarse
- **WHEN** una vista intenta enviar un comando con un canal fuera del contrato
- **THEN** el cliente lo rechaza sin hacer la petición

### Requirement: Modo real preparado para la API de comandos
El cliente real SHALL enviar comandos a `POST /api/comandos` y mensajes a `POST /api/canales/wa/mensajes`, con un `Idempotency-Key` UUID nuevo por intento lógico (reutilizado si ese intento se reenvía) y la URL base configurable. Los errores HTTP con cuerpo de contrato MUST llegar a la vista con su `codigo` y `mensaje`.

#### Scenario: Encabezado de idempotencia
- **WHEN** el cliente real envía un comando
- **THEN** la petición lleva un `Idempotency-Key` con formato UUID y el cuerpo del comando validado

#### Scenario: Reintento conserva la clave
- **WHEN** un comando falla por red y la vista lo reintenta
- **THEN** el reintento usa el mismo `Idempotency-Key`

#### Scenario: Conflicto de versión
- **WHEN** la API responde 409 con un cuerpo de error `CONFLICTO_VERSION`
- **THEN** la vista recibe ese código y su mensaje, sin `stack` ni detalles internos

### Requirement: Guion simulado del Flujo A
El modo simulado SHALL reproducir el Flujo A de `PLAN.md` §12 como un guion fijo y compartido entre todas las vistas: llamada y cotización del paquete en Tepic en el call center, continuación en WhatsApp en el paso del horario, cita confirmada con QR en la app y llegada registrada en la clínica, con la línea de tiempo y los eventos de tiempo real correspondientes. El guion MUST poder reiniciarse y MUST usar solo datos ficticios.

#### Scenario: Continuidad simulada
- **WHEN** se ejecuta "Continuar por WhatsApp" en `/callcenter` y luego se abre `/wa`
- **THEN** el primer mensaje del bot retoma en el horario y no vuelve a pedir servicio ni sede

#### Scenario: Eventos de tiempo real
- **WHEN** el guion confirma la cita
- **THEN** el cliente emite `tramite:actualizado` con el trámite en `CONFIRMADA` y `hilo:linea-tiempo` con el evento `CitaConfirmada`

#### Scenario: Reinicio del guion
- **WHEN** se reinicia el guion desde la navegación de demo
- **THEN** todas las vistas vuelven al primer paso

#### Scenario: Fuera del guion
- **WHEN** en `/wa` se envía un texto que el guion no espera
- **THEN** el cliente responde con un mensaje de texto válido según el contrato que explica qué opciones hay, sin error

### Requirement: Lecturas validadas con el contrato compartido
En ambos modos, el cliente SHALL validar toda respuesta de consulta con el esquema de la tabla de rutas de `@noki/contracts` antes de entregarla a una vista. Una respuesta que no cumpla el esquema MUST convertirse en un error de contrato.

#### Scenario: Datos simulados con el contrato compartido
- **WHEN** una prueba recorre todas las lecturas del guion simulado
- **THEN** cada una cumple el esquema de respuesta de su consulta en `@noki/contracts`

#### Scenario: Lectura real mal formada
- **WHEN** en modo real `GET /api/pacientes/:id/citas` devuelve una cita sin zona horaria
- **THEN** la vista recibe un error de contrato y no una cita parcial

### Requirement: Consultas reales según la tabla de rutas
El cliente real SHALL resolver cada consulta con la plantilla y los parámetros de la tabla de rutas del contrato, sin rutas escritas a mano en el cliente. Una consulta marcada como solo demo MUST devolver un error de no disponible cuando el cliente no está en modo demo.

#### Scenario: Ruta de la tabla
- **WHEN** el cliente real consulta `llegadasSede` con un `sedeId`
- **THEN** hace `GET` a la ruta que produce la tabla para ese `sedeId`

#### Scenario: Bandeja fuera de demo
- **WHEN** el cliente real consulta `bandeja` sin modo demo
- **THEN** devuelve un error de no disponible sin hacer la petición

### Requirement: Comandos armados por la vista
Las vistas que necesitan ejecutar una acción sobre una lectura SHALL armar el comando con el esquema de comandos a partir del dato elegido (por ejemplo, `RegistrarLlegada` con el token de la cita) y enviarlo por el cliente. El cliente MUST validar el comando antes de enviarlo.

#### Scenario: Registrar llegada desde la cita
- **WHEN** la recepción pulsa "Registrar llegada" en una llegada esperada
- **THEN** el cliente recibe `RegistrarLlegada` con el token de esa cita y el canal `clinica`

#### Scenario: Selección de catálogo en call center
- **WHEN** el asesor elige una oferta del catálogo
- **THEN** se envían los comandos de servicio y sede con los IDs de esa oferta, sin interpretar reglas de negocio

### Requirement: Tipos de demo aislados
Los tipos que solo existen para la demo (paso del guion, conversación simulada de WhatsApp y cotización de `/web`) SHALL vivir en un único módulo de demo del cliente, sin duplicar ningún esquema del contrato y sin datos sensibles.

#### Scenario: Sin duplicados del contrato
- **WHEN** se buscan en `apps/web` esquemas de catálogo, cita, ficha, llegada, bandeja o métricas
- **THEN** solo se importan de `@noki/contracts`
