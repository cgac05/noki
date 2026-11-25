# Proposal

## Why

Christian (2026-11-25, hilo del proyecto): «al igual que el web la app hay que indicarle quién está entrando, pon la misma seguridad en la app que pusimos en el web para poder consultar diferentes números». Hoy `/app` toma el paciente del contexto de demo (`contextoDemo`), así que solo muestra el último paciente atendido.

## What Changes

- `/app` abre con «Identifícate» (teléfono + contraseña de demostración `prueba123`), igual que `/web`. Usa la misma consulta solo de demo `sesionWebDemo`.
- Con paciente encontrado, muestra «Hola, <nombre enmascarado>» y sus citas (`citasPaciente`) con estado, QR y «Cancelar cita», como hoy. Sin paciente vinculado: «No encontramos citas para este número» con enlaces a `/web` y `/wa`. «Salir» vuelve a identificarse con otro número.
- El formulario de identificación se extrae a un componente compartido usado por `/web` y `/app` (mismo comportamiento).

### Fuera de alcance
API y contratos (se reutiliza `sesionWebDemo`). Fuera de demo no hay sesión.

## Capabilities

### Modified Capabilities
- `navegacion-canales`: requisito nuevo «Identificación en la app de demo».

## Impact
`apps/web/src/vistas/App.tsx`, `apps/web/src/vistas/Web.tsx` (solo extraer el formulario), un componente nuevo en `apps/web/src/componentes/`, pruebas de `/app` y `/web`, cliente simulado si hace falta.
