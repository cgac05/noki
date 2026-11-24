# Spec Delta

## Purpose

Define el único punto por el que las vistas de los canales hablan con el cerebro: una interfaz con modo simulado y modo real, validada contra los contratos compartidos, para que el frontend avance sin la API y se conecte a ella sin cambiar las vistas.

## ADDED Requirements

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

### Requirement: Datos de lectura provisionales aislados
Los datos de lectura que aún no define `@noki/contracts` (nombres de servicio y sede, citas del paciente, ficha del hilo, llegadas, bandeja) SHALL declararse en un único módulo provisional del cliente, marcado como pendiente de contrato, y MUST NOT incluir datos sensibles.

#### Scenario: Módulo provisional único
- **WHEN** se buscan tipos de lectura que no provienen de `@noki/contracts`
- **THEN** todos están en el módulo provisional del cliente

#### Scenario: Sin datos sensibles provisionales
- **WHEN** se inspeccionan los tipos provisionales
- **THEN** no declaran fecha de nacimiento, correo, RFC, PIN ni CURP, y el teléfono solo aparece enmascarado
