# Spec Delta

## ADDED Requirements

### Requirement: Modo simulado visible
Cuando el cliente está en modo simulado, todas las vistas SHALL mostrar una insignia visible "Modo simulado" que indique que las respuestas no vienen del cerebro real. El modo simulado sigue siendo el valor por defecto en desarrollo, pero la compilación de producción MUST fallar si `VITE_API` no está definido explícitamente.

#### Scenario: Insignia en modo simulado
- **WHEN** se abre cualquier vista con `VITE_API=mock` o sin definir en desarrollo
- **THEN** se ve la insignia "Modo simulado"

#### Scenario: Sin insignia en modo real
- **WHEN** se abre cualquier vista con `VITE_API=real`
- **THEN** la insignia no aparece

#### Scenario: Producción sin modo explícito
- **WHEN** se ejecuta la compilación de producción sin definir `VITE_API`
- **THEN** la compilación falla con un mensaje que pide elegir `mock` o `real`

### Requirement: Idempotencia de los mensajes de WhatsApp
El cliente SHALL enviar cada mensaje de WhatsApp con un `Idempotency-Key` UUID propio de ese mensaje, y SHALL reutilizarlo cuando ese mismo mensaje se reintenta, tanto en el reintento automático de red como en el que pide el usuario.

#### Scenario: Clave por mensaje
- **WHEN** el cliente real envía dos mensajes distintos
- **THEN** cada petición lleva un `Idempotency-Key` distinto

#### Scenario: Clave en el reintento
- **WHEN** el usuario reintenta un mensaje que falló
- **THEN** la petición lleva el mismo `Idempotency-Key` que el primer intento

## MODIFIED Requirements

### Requirement: Guion simulado del Flujo A
El modo simulado SHALL reproducir el Flujo A de `PLAN.md` §12 como un guion fijo y compartido entre todas las vistas: llamada y cotización del paquete en Tepic en el call center, continuación en WhatsApp con el mensaje `CONTINUAR <código>` en el paso del horario, verificación con un Flow, cita confirmada con QR en la app y llegada registrada en la clínica, con la línea de tiempo y los eventos de tiempo real correspondientes. El guion MUST poder reiniciarse y MUST usar solo datos ficticios.

#### Scenario: Continuidad simulada
- **WHEN** tras cotizar en `/callcenter` se envía desde `/wa` el mensaje `CONTINUAR <código>` del guion
- **THEN** el primer mensaje del bot retoma en el horario y no vuelve a pedir servicio ni sede

#### Scenario: Verificación con Flow
- **WHEN** el guion pide la verificación y recibe un `flowResponse` con todos los campos requeridos
- **THEN** avanza al paso de confirmación sin repetir ningún valor recibido en sus mensajes

#### Scenario: Flow incompleto
- **WHEN** el guion recibe un `flowResponse` sin un campo requerido
- **THEN** responde con un mensaje de ayuda válido y no avanza

#### Scenario: Eventos de tiempo real
- **WHEN** el guion confirma la cita
- **THEN** el cliente emite `tramite:actualizado` con el trámite en `CONFIRMADA` y `hilo:linea-tiempo` con el evento `CitaConfirmada`

#### Scenario: Reinicio del guion
- **WHEN** se reinicia el guion desde la navegación de demo
- **THEN** todas las vistas vuelven al primer paso y el historial de `/wa` se vacía, incluido el guardado en `sessionStorage`

#### Scenario: Fuera del guion
- **WHEN** en `/wa` se envía un texto que el guion no espera
- **THEN** el cliente responde con un mensaje de texto válido según el contrato que explica qué opciones hay, sin error

### Requirement: Tipos de demo aislados
Los tipos que solo existen para la demo (paso del guion y cotización de `/web`) SHALL vivir en un único módulo de demo del cliente, sin duplicar ningún esquema del contrato y sin datos sensibles.

#### Scenario: Sin duplicados del contrato
- **WHEN** se buscan en `apps/web` esquemas de catálogo, cita, ficha, llegada, bandeja o métricas
- **THEN** solo se importan de `@noki/contracts`

#### Scenario: Sin conversación de demo
- **WHEN** se buscan en el módulo de demo tipos o consultas de conversación de WhatsApp
- **THEN** no hay ninguno; la conversación sale de los mensajes enviados y sus respuestas
