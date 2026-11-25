# Design

## Context

`pnpm-workspace.yaml` en `main` declara `allowBuilds: { argon2: true, esbuild: true }`. Con la dependencia `bullmq@5.81.6` de `temporizadores`, pnpm 11.25.0 instala `msgpackr-extract@3.0.7` como dependencia opcional y, sin declaración, falla con `ERR_PNPM_IGNORED_BUILDS`; además escribe la línea provisional `msgpackr-extract: set this to true or false`.

## Goals / Non-Goals

**Goals:** que `pnpm install --frozen-lockfile` termine con salida 0 en un checkout limpio sin variables de entorno.

**Non-Goals:** acelerar la serialización de BullMQ.

## Decisions

### D1. Declarar `false`

`msgpackr` detecta si `msgpackr-extract` está compilado y, si no, usa su codificador en JavaScript. BullMQ funciona igual (las 45 pruebas de integración de `temporizadores` pasaron con la extensión sin compilar). `true` exigiría `node-gyp` o binarios precompilados en cada máquina, más riesgo de fallo en Windows. Alternativa descartada: `pnpm_config_strict_dep_builds=false` en `.npmrc`, que desactivaría la protección para todas las dependencias.

### D2. Orden de integración

Integrar este cambio en `main`, luego hacer rebase de `feat/temporizadores` sobre ese `main` e integrarlo. Archivar este cambio en `main` después de su merge, como indica `docs/trabajo-paralelo.md`.

## Risks / Trade-offs

- **Entrada sin paquete instalado** → mientras `temporizadores` no esté en `main`, la entrada no tiene efecto. Se comprueba que `pnpm install --frozen-lockfile` siga en verde en `main` con ella.

## Open Questions

Ninguna.
