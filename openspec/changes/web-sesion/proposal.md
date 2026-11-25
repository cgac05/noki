# Propuesta: web-sesion

## Why

Christian (2026-11-25 13:15 UTC, con captura de `/web`): «el boton de ver citas no funcion ademas no es ver citas sino algo como un login, idenificarme y solo con el telefono y contraseña prueba123 para todos entra y ya busca lo que tiene si tiene pendientes tramites a medias si acaba de dejar uno que diga continua donde lo dejaste o ya que inicie uno nuevo pero sin que le pregunten todo de nuevo porque ya se identifico». En la captura el campo de teléfono no se ve (solo su etiqueta), así que «Ver citas» queda deshabilitado.

## What Changes

- `/web` abre con «Identifícate»: teléfono y contraseña. En modo demo la contraseña es `prueba123` para todos (simulación; fuera de demo no hay inicio de sesión web).
- Al entrar, la web busca al paciente por teléfono con una consulta nueva solo de demo y muestra:
  - trámites abiertos (`tramitesAbiertos`) con «Continúa donde lo dejaste», que pide `SolicitarContinuacion` desde web y abre `/wa?continuar=<código>`;
  - citas confirmadas con «Pagar con CoDi» (ya existente);
  - «Iniciar un trámite nuevo», que crea el trámite con el teléfono y asigna el paciente (`AsignarPaciente`) sin volver a pedir identidad, y sigue con la cotización.
- Corrige el campo de teléfono invisible.
- «Volver» en cada paso.

## Impact

- `packages/contracts/src/consultas.ts` (consulta `sesionWebDemo`, `soloDemo`), su ruta en `packages/adapters/in-http/src/rutasConsultas.ts` y la lectura necesaria; `apps/web/src/vistas/Web.tsx`, `styles.css`, cliente simulado y pruebas.
