# Propuesta: web-identificacion

## Why

Christian (2026-11-25, 12:44 UTC): «en web no es suficiente con seleccionar algo y cotizarlo debe de por lo menos identificarse con su numero y fecha de nacimiento o curp, si completa telefono mas fecha el curp se completa con toda la info esto para dar seguimiento en el resto del sistema». Hoy `/web` (tras `web-modo-real`) cotiza con un trámite anónimo, sin teléfono ni paciente, así que no hay seguimiento en `/app`, `/clinica`, `/admin` ni WhatsApp.

## What Changes

- `/web` en modo real pide primero el teléfono (10 a 15 dígitos) y envía `IniciarTramite` con `contacto` (canal `web`, actor `paciente`).
- Tras cotizar, `/web` muestra la identificación que ya define el núcleo en `siguientePregunta` (casilla `paciente`): destinatario, candidato por teléfono, fecha de nacimiento, CURP o «No la tengo» y, sin CURP, datos (nombre, apellidos, sexo y entidad). Reutiliza el componente y el armado del Call Center, parametrizados con canal `web` y actor `paciente`. Sexo y entidad con los mismos selectores.
- «Continuar en WhatsApp» y el código solo se ofrecen cuando el trámite ya tiene paciente (identificado o registrado).
- Call Center no cambia (canal `callcenter`, actor `asesor`, datos en claro).

## Fuera de alcance

- Cambios en `packages/contracts`, el dominio o la API: el núcleo ya admite `IdentificarPaciente` en cualquier canal. Detener y avisar si no es así.
- Mostrar en claro los datos en `/web`: el paciente captura los suyos con «Mostrar/Ocultar» como en WhatsApp; los selectores sí aplican.

## Impact

- `apps/web/src/vistas/Web.tsx`, `apps/web/src/componentes/{IdentificacionAsesor,ModalFlow}.tsx`, `apps/web/src/cliente/identificacion.ts` y sus pruebas.
