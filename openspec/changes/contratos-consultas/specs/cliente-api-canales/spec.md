# Spec Delta

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Datos de lectura provisionales aislados
**Reason**: Los datos de lectura pasan al contrato compartido `contratos-consultas`; ya no son provisionales.
**Migration**: Importar los esquemas de lectura desde `@noki/contracts` y conservar en el módulo de demo solo los tipos exclusivos de la demo (requisito "Tipos de demo aislados").
