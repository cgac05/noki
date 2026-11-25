# Spec Delta

## Purpose

Define cómo el workspace declara las dependencias con scripts de instalación para que la instalación con corepack no falle.

## ADDED Requirements

### Requirement: Scripts de instalación declarados
Toda dependencia instalada que tenga un script de instalación SHALL figurar en `allowBuilds` de `pnpm-workspace.yaml` con `true` (se compila) o `false` (se ignora). `pnpm install --frozen-lockfile` en un checkout limpio MUST terminar con salida 0 sin variables de entorno que relajen la política, y MUST NOT modificar `pnpm-workspace.yaml`.

#### Scenario: Extensión nativa opcional de BullMQ
- **WHEN** con `bullmq` instalado se ejecuta `pnpm install --frozen-lockfile` en un checkout limpio
- **THEN** termina con salida 0, `msgpackr-extract` no se compila y `git status` no muestra cambios en `pnpm-workspace.yaml`

#### Scenario: Main sin BullMQ
- **WHEN** se ejecuta `pnpm install --frozen-lockfile` en `main` antes de integrar `temporizadores`
- **THEN** termina con salida 0 sin cambios en el lockfile
