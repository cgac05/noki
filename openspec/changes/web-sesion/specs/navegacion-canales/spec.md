## ADDED Requirements

### Requirement: Sesión de paciente en la web (demo)
Con `VITE_DEMO=true` y la API en `DEMO_MODE`, `/web` SHALL abrir con «Identifícate» (teléfono y contraseña de demostración `prueba123`). Con datos válidos SHALL buscar al paciente por teléfono y mostrar sus trámites abiertos con «Continúa donde lo dejaste», sus citas confirmadas con «Pagar con CoDi» e «Iniciar un trámite nuevo», que crea el trámite ligado al paciente sin pedir otra vez su identidad. Cada paso SHALL ofrecer «Volver». La contraseña MUST NOT enviarse a la API. Fuera de demo la consulta de sesión MUST NOT estar disponible.

#### Scenario: Entrar y continuar
- **WHEN** el paciente con un trámite abierto entra con su teléfono y `prueba123` y pulsa «Continúa donde lo dejaste»
- **THEN** se obtiene el código de continuación y se ofrece abrir `/wa?continuar=<código>`

#### Scenario: Contraseña incorrecta
- **WHEN** la contraseña no es `prueba123`
- **THEN** no se consulta la API y se indica el error

#### Scenario: Trámite nuevo identificado
- **WHEN** el paciente pulsa «Iniciar un trámite nuevo»
- **THEN** el trámite queda con su `pacienteId` sin pasos de identificación

#### Scenario: Teléfono desconocido
- **WHEN** no hay paciente para ese teléfono
- **THEN** se indica que no encontramos su registro y se enlaza a WhatsApp y Call Center
