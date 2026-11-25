# Proposal

## Why

`identidad-paciente` (en `main` desde `91de578`) agregó la identificación por pasos: «¿para ti o para otra persona?», «¿eres Ana P.?» confirmado con la fecha de nacimiento, y CURP o datos básicos. Lo hizo con el comando `IdentificarPaciente` y el campo `paso` en la pista de `SiguientePregunta`. Su propuesta dejó al frente B la interfaz: la consola del call center (en el canal `callcenter` la casilla `paciente` es la primera) y el guion simulado. Hoy el call center no puede identificar al paciente, y el guion de WhatsApp sigue con la verificación anterior (un Flow con la fecha, sin destinatario ni confirmación). Al separar `consolas-internas`, el usuario decidió hacer este trabajo en un cambio aparte (2026-11-24).

## What Changes

- **Call center, identificación opcional en la ficha**:
  - Cuando la última respuesta de comando de la pestaña pide la casilla `paciente` con un `paso`, la ficha muestra «Identificar paciente (opcional)» y pinta la pregunta según la pista: opciones como botones y campos en el modal protegido existente.
  - Envía `IdentificarPaciente` con el paso de la pista. Ofrece «Reiniciar identificación» (`REINICIAR`) y muestra los errores del núcleo sin repetir datos.
  - El asesor puede ignorarla y seguir cotizando. La web no codifica el orden de los pasos ni sus preguntas.
- **Datos de identificación protegidos en la consola**: fecha de nacimiento, CURP y datos básicos se capturan enmascarados y viven solo en memoria hasta enviarse. No pasan por el estado de mutaciones, el almacenamiento, la consola ni la URL, y se descartan al enviar, cancelar o cambiar de paso.
- **Guion simulado del Flujo A, identificación en WhatsApp**: la verificación de `/wa` pasa a ser:
  1. «¿La cita es para ti o para otra persona?» (botones);
  2. «¿Eres alguna de estas personas?» con «Soy Ana P.» y «No soy ninguno» (lista);
  3. la fecha de nacimiento en el Flow protegido.

  Emite `DestinatarioDeclarado` e `IdentidadComprobada` en lugar de `PacienteReconocido`. Las otras opciones responden con ayuda sin avanzar. En el guion, el call center sigue sin pedir la casilla `paciente`, así que la sección de identificación no aparece en modo simulado.

### Fuera de alcance

- Cualquier cambio en `packages/contracts`, en el dominio o en la API.
- La identificación desde `/web`, `/app` o `/clinica`. «INE verificada» (`IdentidadComprobada` en recepción) es aparte.
- Una rama opcional del guion simulado con identificación en el call center (descartada por el usuario el 2026-11-24).
- Consultar la siguiente pregunta tras recargar la pestaña: no hay lectura que la exponga, y la sección solo usa la última respuesta de comando.
- Selectores con catálogo para sexo o entidad: la pista los pide como captura protegida de texto.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `consolas-internas`: requisitos nuevos de identificación opcional del paciente en el call center y de protección de esos datos en la consola.
- `cliente-api-canales`: «Guion simulado del Flujo A» cambia la verificación de WhatsApp por los pasos de identificación.

## Impact

- Archivos del frente B: `apps/web/src/vistas/CallCenter.tsx`, componentes nuevos o ajustados en `apps/web/src/componentes/` (reutiliza `ModalFlow`), un módulo en `apps/web/src/cliente/` para armar y enviar `IdentificarPaciente`, `cliente/mock/guionFlujoA.ts`, pruebas y `apps/web/README.md`.
- Sin dependencias nuevas, sin cambios en contratos ni en archivos compartidos.
- Depende de `identidad-paciente` (ya en `main`). El recorrido real de punta a punta depende de `api-comandos` (revisión 4, frente A). Hasta entonces se prueba con el cliente real y `fetch` falso, y el recorrido real queda como control bloqueado.
- Riesgos:
  - La forma de las opciones (`MI`, `OTRA_PERSONA`, `NINGUNO`, `SIN_CURP`) y de los ids de campo viene de los specs `siguiente-pregunta` e `identificacion-paciente`. Si el núcleo cambia esa convención, la web arma mal el comando; el contrato lo valida antes de enviar y las pruebas lo cubren.
  - Privacidad: la consola maneja CURP y fecha de nacimiento. Se aplican las mismas reglas que al Flow de `/wa` (`simulador-whatsapp`, «Datos del Flow protegidos»).
- Responsable: frente B, `LuisMaster119`.
