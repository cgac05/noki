# Proposal

## Why

El cambio `temporizadores` (frente A, en revisión) agrega `bullmq`, que depende de `msgpackr-extract`, una extensión nativa opcional con script de instalación. pnpm 11 no ejecuta scripts de dependencias que no estén declarados en `allowBuilds` y, con la política estricta, `pnpm install --frozen-lockfile` termina con `ERR_PNPM_IGNORED_BUILDS` (salida 1). Así se incumple "Instalación con corepack" de `entorno-desarrollo`, y cualquier checkout limpio, el rebase del frente B y la integración a `main` fallan. `revision.md` de `temporizadores` lo registra como H-01. `pnpm-workspace.yaml` es configuración raíz compartida (`docs/trabajo-paralelo.md`), por eso va en este cambio propio con el visto bueno de ambos frentes.

## What Changes

- `pnpm-workspace.yaml`: agregar `msgpackr-extract: false` en `allowBuilds`. La extensión no se compila; `msgpackr` usa su implementación en JavaScript, suficiente para el volumen de la demo (design D1).
- Se integra en `main` justo antes de `temporizadores`. Como `msgpackr-extract` solo llega con el lockfile de `temporizadores`, este cambio no altera `pnpm-lock.yaml` ni el comportamiento actual de `main`: pnpm ignora entradas de `allowBuilds` de paquetes que no están instalados.

### Fuera de alcance

- Compilar la extensión nativa (`true`): exige herramientas de compilación en Windows y no aporta nada medible a la demo.
- Cambiar la versión de pnpm o la política de scripts.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `entorno-desarrollo`: se agrega el requisito de que toda dependencia con script de instalación esté declarada en `allowBuilds`.

## Impact

- **Archivo compartido**: solo `pnpm-workspace.yaml` (una línea). Necesita el visto bueno de un responsable del frente A y de `LuisMaster119` (frente B).
- **Frente B**: sin cambios en `apps/web`. Tras integrar `temporizadores`, el frente B hace rebase y `pnpm install` sin variables especiales.
