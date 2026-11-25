# Tasks

Requisito: SW = «Sesión de paciente en la web (demo)». Decisiones D1–D5.

- [x] 1.1 Pruebas en rojo: consulta `sesionWebDemo` (API de pruebas: en demo encuentra, 404, fuera de demo no disponible) y vista `/web` (contraseña, continuar, pagar, nuevo identificado, desconocido, Volver). `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1 (contrato, ruta, lecturas Postgres y memoria) y D4 si hace falta.
- [x] 1.3 Implementar D2, D3 y D5 en `apps/web`, incluido el cliente simulado.
- [x] 1.4 Punto de control: vitest de unitarios y web con `--testTimeout=30000`, eslint, `tsc -r` y `lint:deps`. Ejecución intentada, bloqueada por `EPERM`.

- [x] 2.1 D6: prueba escrita primero en `consolas.test.tsx` y botón en `CallCenter.tsx`. Ejecución de Vitest bloqueada por `EPERM`.
